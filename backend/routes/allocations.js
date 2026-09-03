'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

async function createAllocation(client, userId, { income_id, expense_id, amount, note }) {
  if (!income_id)             throw new Error('income_id is required');
  if (!expense_id)            throw new Error('expense_id is required');
  if (!amount || amount <= 0) throw new Error('Amount must be > 0');

  // Lock both rows; user_id check prevents cross-user allocation.
  const { rows: incRows } = await client.query(
    `SELECT id, amount::NUMERIC AS amount FROM incomes
     WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [income_id, userId]
  );
  if (!incRows[0]) throw new Error('Income not found');

  const { rows: expRows } = await client.query(
    `SELECT id, amount::NUMERIC AS amount FROM expenses
     WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [expense_id, userId]
  );
  if (!expRows[0]) throw new Error('Expense not found');

  const { rows: iAgg } = await client.query(
    `SELECT COALESCE(SUM(amount),0)::NUMERIC AS total FROM allocations
     WHERE income_id = $1 AND user_id = $2`,
    [income_id, userId]
  );
  const { rows: eAgg } = await client.query(
    `SELECT COALESCE(SUM(amount),0)::NUMERIC AS total FROM allocations
     WHERE expense_id = $1 AND user_id = $2`,
    [expense_id, userId]
  );

  const incomeRemaining = parseFloat(incRows[0].amount) - parseFloat(iAgg[0].total);
  const expensePending  = parseFloat(expRows[0].amount) - parseFloat(eAgg[0].total);
  const amt = parseFloat(amount);

  if (amt > incomeRemaining + 0.001)
    throw new Error(`Amount (${amt}) exceeds income remaining balance (${incomeRemaining.toFixed(2)})`);
  if (amt > expensePending + 0.001)
    throw new Error(`Amount (${amt}) exceeds expense pending balance (${expensePending.toFixed(2)})`);

  const id = uuidv4();
  await client.query(
    `INSERT INTO allocations (id, user_id, income_id, expense_id, amount, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, income_id, expense_id, amt, note || null]
  );

  const { rows: newRows } = await client.query(`
    SELECT a.*,
           i.source          AS income_source,
           i.amount::NUMERIC AS income_amount,
           e.title           AS expense_title,
           e.category        AS expense_category,
           e.amount::NUMERIC AS expense_amount
    FROM   allocations a
    JOIN   incomes  i ON i.id = a.income_id
    JOIN   expenses e ON e.id = a.expense_id
    WHERE  a.id = $1
  `, [id]);
  return newRows[0];
}

function serializeAllocation(alloc) {
  return {
    ...alloc,
    amount:         parseFloat(alloc.amount),
    income_amount:  parseFloat(alloc.income_amount),
    expense_amount: parseFloat(alloc.expense_amount),
  };
}

// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { income_id, expense_id } = req.query;
    const wheres = [`a.user_id = $1`], params = [req.user.id];
    let p = 2;

    if (income_id)  { wheres.push(`a.income_id  = $${p++}`); params.push(income_id); }
    if (expense_id) { wheres.push(`a.expense_id = $${p++}`); params.push(expense_id); }

    const { rows } = await query(`
      SELECT a.*,
             i.source          AS income_source,
             i.amount::NUMERIC AS income_amount,
             e.title           AS expense_title,
             e.category        AS expense_category,
             e.amount::NUMERIC AS expense_amount
      FROM   allocations a
      JOIN   incomes  i ON i.id = a.income_id
      JOIN   expenses e ON e.id = a.expense_id
      WHERE  ${wheres.join(' AND ')}
      ORDER BY a.created_at DESC
    `, params);

    res.json(rows.map(r => ({
      ...r,
      amount:         parseFloat(r.amount),
      income_amount:  parseFloat(r.income_amount),
      expense_amount: parseFloat(r.expense_amount),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE ────────────────────────────────────────────────────────────────────
router.post('/bulk', async (req, res) => {
  const allocations = req.body.allocations;
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return res.status(400).json({ error: 'allocations are required' });
  }

  try {
    const created = await transaction(async (client) => {
      const results = [];
      for (const allocation of allocations) {
        results.push(await createAllocation(client, req.user.id, allocation));
      }
      return results;
    });

    res.status(201).json(created.map(serializeAllocation));
  } catch (err) {
    const is400 = ['exceeds','not found','required'].some(s => err.message.toLowerCase().includes(s));
    res.status(is400 ? 400 : 500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { income_id, expense_id, amount, note } = req.body;
  if (!income_id)             return res.status(400).json({ error: 'income_id is required' });
  if (!expense_id)            return res.status(400).json({ error: 'expense_id is required' });
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be > 0' });

  try {
    const alloc = await transaction(async (client) => {
      return createAllocation(client, req.user.id, { income_id, expense_id, amount, note });
    });

    res.status(201).json(serializeAllocation(alloc));
  } catch (err) {
    const is400 = ['exceeds','not found','required'].some(s => err.message.toLowerCase().includes(s));
    res.status(is400 ? 400 : 500).json({ error: err.message });
  }
});

// ── DELETE ────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `DELETE FROM allocations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Allocation not found' });
    res.json({ message: 'Deleted', id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
