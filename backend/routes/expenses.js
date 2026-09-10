'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { setExpenseTags, enrichExpense } = require('../helpers');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, status, tag, date_from, date_to, search, amount_min, amount_max } = req.query;
    const userId = req.user.id;

    let sql = `SELECT DISTINCT e.* FROM expenses e`;
    const joins = [], wheres = [`e.user_id = $1`], params = [userId];
    let p = 2;

    if (tag) {
      joins.push(`JOIN expense_tags et ON et.expense_id = e.id
                  JOIN tags t          ON t.id = et.tag_id`);
      wheres.push(`LOWER(t.name) = LOWER($${p++})`);
      params.push(tag);
    }
    if (category)   { wheres.push(`e.category ILIKE $${p++}`); params.push(`%${category}%`); }
    if (date_from)  { wheres.push(`e.date >= $${p++}`);         params.push(date_from); }
    if (date_to)    { wheres.push(`e.date <= $${p++}`);         params.push(date_to); }
    if (amount_min) { wheres.push(`e.amount >= $${p++}`);       params.push(amount_min); }
    if (amount_max) { wheres.push(`e.amount <= $${p++}`);       params.push(amount_max); }
    if (search) {
      wheres.push(`(e.title ILIKE $${p} OR e.category ILIKE $${p + 1} OR e.notes ILIKE $${p + 2})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      p += 3;
    }

    if (joins.length)  sql += ` ${joins.join(' ')}`;
    sql += ` WHERE ${wheres.join(' AND ')}`;
    sql += ` ORDER BY e.date DESC, e.created_at DESC`;

    const { rows } = await query(sql, params);
    let result = await Promise.all(rows.map(enrichExpense));
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
      `SELECT * FROM expenses WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Expense not found' });

    const expense = await enrichExpense(rows[0]);
    const { rows: allocs } = await query(`
      SELECT a.*, i.source AS income_source, i.amount::NUMERIC AS income_amount
      FROM   allocations a
      JOIN   incomes i ON i.id = a.income_id
      WHERE  a.expense_id = $1 AND a.user_id = $2
      ORDER BY a.created_at DESC
    `, [req.params.id, req.user.id]);
    expense.allocations = allocs.map(a => ({ ...a, income_amount: parseFloat(a.income_amount) }));
    res.json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { amount, title, category, date, notes, tags } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });
  if (!title?.trim())         return res.status(400).json({ error: 'Title is required' });
  if (!category?.trim())      return res.status(400).json({ error: 'Category is required' });
  if (!date)                  return res.status(400).json({ error: 'Date is required' });

  try {
    const id = uuidv4();
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO expenses (id, user_id, amount, title, category, date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, req.user.id, parseFloat(amount), title.trim(), category.trim(), date, notes || null]
      );
      if (tags?.length) await setExpenseTags(client, id, tags);
    });
    const { rows } = await query(`SELECT * FROM expenses WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    res.status(201).json(await enrichExpense(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE ────────────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { rows: existing } = await query(
      `SELECT * FROM expenses WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Expense not found' });

    const { amount, title, category, date, notes, tags } = req.body;
    if (amount !== undefined) {
      const { rows: agg } = await query(
        `SELECT COALESCE(SUM(amount),0)::NUMERIC AS total FROM allocations WHERE expense_id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      );
      if (parseFloat(amount) < parseFloat(agg[0].total))
        return res.status(400).json({
          error: `Amount cannot be less than already settled amount (${agg[0].total})`,
        });
    }

    await transaction(async (client) => {
      await client.query(`
        UPDATE expenses SET
          amount   = COALESCE($1, amount),
          title    = COALESCE($2, title),
          category = COALESCE($3, category),
          date     = COALESCE($4, date),
          notes    = COALESCE($5, notes)
        WHERE id = $6 AND user_id = $7
      `, [
        amount !== undefined ? parseFloat(amount) : null,
        title?.trim()    || null,
        category?.trim() || null,
        date             || null,
        notes !== undefined ? (notes || null) : existing[0].notes,
        req.params.id, req.user.id,
      ]);
      if (tags !== undefined) await setExpenseTags(client, req.params.id, tags);
    });

    const { rows } = await query(`SELECT * FROM expenses WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    res.json(await enrichExpense(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Deleted', id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
