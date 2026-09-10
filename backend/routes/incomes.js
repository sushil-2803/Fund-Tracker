'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { setIncomeTags, enrichIncome } = require('../helpers');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate); // All income routes require auth

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { source, status, tag, date_from, date_to, search, amount_min, amount_max } = req.query;
    const userId = req.user.id;

    let sql = `SELECT DISTINCT i.* FROM incomes i`;
    const joins = [], wheres = [`i.user_id = $1`], params = [userId];
    let p = 2;

    if (tag) {
      joins.push(`JOIN income_tags it ON it.income_id = i.id
                  JOIN tags t         ON t.id = it.tag_id`);
      wheres.push(`LOWER(t.name) = LOWER($${p++})`);
      params.push(tag);
    }
    if (source)     { wheres.push(`i.source ILIKE $${p++}`);  params.push(`%${source}%`); }
    if (date_from)  { wheres.push(`i.date >= $${p++}`);        params.push(date_from); }
    if (date_to)    { wheres.push(`i.date <= $${p++}`);        params.push(date_to); }
    if (amount_min) { wheres.push(`i.amount >= $${p++}`);      params.push(amount_min); }
    if (amount_max) { wheres.push(`i.amount <= $${p++}`);      params.push(amount_max); }
    if (search) {
      wheres.push(`(i.source ILIKE $${p} OR i.notes ILIKE $${p + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      p += 2;
    }

    if (joins.length)  sql += ` ${joins.join(' ')}`;
    sql += ` WHERE ${wheres.join(' AND ')}`;
    sql += ` ORDER BY i.date DESC, i.created_at DESC`;

    const { rows } = await query(sql, params);
    let result = await Promise.all(rows.map(enrichIncome));
    if (status) result = result.filter(r => r.status === status);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET ONE ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM incomes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Income not found' });

    const income = await enrichIncome(rows[0]);
    const { rows: allocs } = await query(`
      SELECT a.*, e.title AS expense_title, e.category AS expense_category, e.amount::NUMERIC AS expense_amount
      FROM   allocations a
      JOIN   expenses e ON e.id = a.expense_id
      WHERE  a.income_id = $1 AND a.user_id = $2
      ORDER BY a.created_at DESC
    `, [req.params.id, req.user.id]);
    income.allocations = allocs.map(a => ({ ...a, expense_amount: parseFloat(a.expense_amount) }));
    res.json(income);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { amount, source, date, notes, tags } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
  if (!source?.trim())        return res.status(400).json({ error: 'Source is required' });
  if (!date)                  return res.status(400).json({ error: 'Date is required' });

  try {
    const id = uuidv4();
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO incomes (id, user_id, amount, source, date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user.id, parseFloat(amount), source.trim(), date, notes || null]
      );
      if (tags?.length) await setIncomeTags(client, id, tags);
    });
    const { rows } = await query(`SELECT * FROM incomes WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    res.status(201).json(await enrichIncome(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { rows: existing } = await query(
      `SELECT * FROM incomes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Income not found' });

    const { amount, source, date, notes, tags } = req.body;
    if (amount !== undefined) {
      const { rows: agg } = await query(
        `SELECT COALESCE(SUM(amount),0)::NUMERIC AS total FROM allocations WHERE income_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      if (parseFloat(amount) < parseFloat(agg[0].total))
        return res.status(400).json({
          error: `Amount cannot be less than already allocated amount (${agg[0].total})`,
        });
    }

    await transaction(async (client) => {
      await client.query(`
        UPDATE incomes SET
          amount = COALESCE($1, amount),
          source = COALESCE($2, source),
          date   = COALESCE($3, date),
          notes  = COALESCE($4, notes)
        WHERE id = $5 AND user_id = $6
      `, [
        amount !== undefined ? parseFloat(amount) : null,
        source?.trim() || null,
        date           || null,
        notes !== undefined ? (notes || null) : existing[0].notes,
        req.params.id, req.user.id,
      ]);
      if (tags !== undefined) await setIncomeTags(client, req.params.id, tags);
    });

    const { rows } = await query(`SELECT * FROM incomes WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(await enrichIncome(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM incomes WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Income not found' });
    res.json({ message: 'Deleted', id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
