'use strict';

const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const uid = req.user.id;

    const [incomeAgg, expenseAgg, allocAgg] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0)::NUMERIC AS v FROM incomes     WHERE user_id = $1`, [uid]),
      query(`SELECT COALESCE(SUM(amount),0)::NUMERIC AS v FROM expenses    WHERE user_id = $1`, [uid]),
      query(`SELECT COALESCE(SUM(amount),0)::NUMERIC AS v FROM allocations WHERE user_id = $1`, [uid]),
    ]);

    const totalIncome    = parseFloat(incomeAgg.rows[0].v);
    const totalExpenses  = parseFloat(expenseAgg.rows[0].v);
    const totalAllocated = parseFloat(allocAgg.rows[0].v);

    // Available funds — fully in SQL
    const { rows: availRows } = await query(`
      SELECT COALESCE(SUM(i.amount - COALESCE(a.used, 0)), 0)::NUMERIC AS available
      FROM   incomes i
      LEFT JOIN (
        SELECT income_id, SUM(amount)::NUMERIC AS used
        FROM   allocations
        WHERE  user_id = $1
        GROUP BY income_id
      ) a ON a.income_id = i.id
      WHERE  i.user_id = $1
    `, [uid]);
    const availableFunds = Math.max(0, parseFloat(availRows[0].available));

    // Unsettled expenses
    const { rows: unsettledRows } = await query(`
      SELECT e.*,
             COALESCE(a.settled, 0)::NUMERIC              AS settled_amount,
             (e.amount - COALESCE(a.settled, 0))::NUMERIC AS pending_amount,
             CASE
               WHEN COALESCE(a.settled, 0) = 0 THEN 'PENDING'
               ELSE                                 'PARTIALLY_SETTLED'
             END AS status
      FROM   expenses e
      LEFT JOIN (
        SELECT expense_id, SUM(amount)::NUMERIC AS settled
        FROM   allocations
        WHERE  user_id = $1
        GROUP BY expense_id
      ) a ON a.expense_id = e.id
      WHERE  e.user_id = $1
        AND  e.amount > COALESCE(a.settled, 0)
      ORDER  BY e.date DESC
      LIMIT  10
    `, [uid]);

    const unsettledExpenses = unsettledRows.map(r => ({
      ...r,
      amount:         parseFloat(r.amount),
      settled_amount: parseFloat(r.settled_amount),
      pending_amount: parseFloat(r.pending_amount),
    }));
    const pendingReimbursements = unsettledRows.reduce((s, r) => s + parseFloat(r.pending_amount), 0);

    // Recent activity
    const { rows: recentActivity } = await query(`
      SELECT id, 'income'  AS type, source   AS title, amount::NUMERIC, date, created_at
      FROM   incomes WHERE user_id = $1
      UNION ALL
      SELECT id, 'expense' AS type, title, amount::NUMERIC, date, created_at
      FROM   expenses WHERE user_id = $1
      UNION ALL
      SELECT a.id, 'allocation' AS type,
             (i.source || ' → ' || e.title) AS title,
             a.amount::NUMERIC, a.created_at::DATE AS date, a.created_at
      FROM   allocations a
      JOIN   incomes  i ON i.id = a.income_id
      JOIN   expenses e ON e.id = a.expense_id
      WHERE  a.user_id = $1
      ORDER  BY created_at DESC
      LIMIT  20
    `, [uid]);

    res.json({
      total_income:            Math.round(totalIncome    * 100) / 100,
      total_expenses:          Math.round(totalExpenses  * 100) / 100,
      total_allocated:         Math.round(totalAllocated * 100) / 100,
      available_funds:         Math.round(availableFunds * 100) / 100,
      pending_reimbursements:  Math.round(pendingReimbursements * 100) / 100,
      unsettled_expenses:      unsettledExpenses,
      recent_activity:         recentActivity.map(r => ({ ...r, amount: parseFloat(r.amount) })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tags', async (req, res) => {
  try {
    // Return only tags used by this user's incomes/expenses
    const { rows } = await query(`
      SELECT DISTINCT t.id, t.name
      FROM   tags t
      WHERE  EXISTS (
        SELECT 1 FROM income_tags it
        JOIN   incomes i ON i.id = it.income_id
        WHERE  it.tag_id = t.id AND i.user_id = $1
      )
      OR EXISTS (
        SELECT 1 FROM expense_tags et
        JOIN   expenses e ON e.id = et.expense_id
        WHERE  et.tag_id = t.id AND e.user_id = $1
      )
      ORDER BY t.name
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
