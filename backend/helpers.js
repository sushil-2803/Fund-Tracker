'use strict';

const { v4: uuidv4 } = require('uuid');
const { query } = require('./db');

// ── Tag helpers ───────────────────────────────────────────────────────────────

/**
 * Upsert tags by name (case-insensitive), return their IDs.
 * Uses INSERT … ON CONFLICT DO NOTHING + SELECT to avoid race conditions.
 */
async function upsertTags(client, names) {
  if (!names || names.length === 0) return [];
  const tagIds = [];
  for (const rawName of names) {
    const name = rawName.trim().toLowerCase();
    if (!name) continue;

    // Try insert, ignore if already exists (unique on LOWER(name))
    await client.query(
      `INSERT INTO tags (id, name) VALUES ($1, $2) ON CONFLICT (LOWER(name)) DO NOTHING`,
      [uuidv4(), name]
    );
    const { rows } = await client.query(
      `SELECT id FROM tags WHERE LOWER(name) = $1`,
      [name]
    );
    if (rows[0]) tagIds.push(rows[0].id);
  }
  return tagIds;
}

async function setIncomeTags(client, incomeId, tagNames) {
  const tagIds = await upsertTags(client, tagNames);
  await client.query(`DELETE FROM income_tags WHERE income_id = $1`, [incomeId]);
  for (const tagId of tagIds) {
    await client.query(
      `INSERT INTO income_tags (income_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [incomeId, tagId]
    );
  }
}

async function setExpenseTags(client, expenseId, tagNames) {
  const tagIds = await upsertTags(client, tagNames);
  await client.query(`DELETE FROM expense_tags WHERE expense_id = $1`, [expenseId]);
  for (const tagId of tagIds) {
    await client.query(
      `INSERT INTO expense_tags (expense_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [expenseId, tagId]
    );
  }
}

async function getIncomeTags(incomeId) {
  const { rows } = await query(
    `SELECT t.name FROM tags t
     JOIN income_tags it ON it.tag_id = t.id
     WHERE it.income_id = $1
     ORDER BY t.name`,
    [incomeId]
  );
  return rows.map(r => r.name);
}

async function getExpenseTags(expenseId) {
  const { rows } = await query(
    `SELECT t.name FROM tags t
     JOIN expense_tags et ON et.tag_id = t.id
     WHERE et.expense_id = $1
     ORDER BY t.name`,
    [expenseId]
  );
  return rows.map(r => r.name);
}

// ── Amount helpers ────────────────────────────────────────────────────────────

async function getAllocatedAmount(incomeId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM allocations WHERE income_id = $1`,
    [incomeId]
  );
  return parseFloat(rows[0].total);
}

async function getSettledAmount(expenseId) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0)::NUMERIC as total FROM allocations WHERE expense_id = $1`,
    [expenseId]
  );
  return parseFloat(rows[0].total);
}

// ── Row enrichment ────────────────────────────────────────────────────────────

function round2(n) { return Math.round(parseFloat(n) * 100) / 100; }

async function enrichIncome(row) {
  const allocated = await getAllocatedAmount(row.id);
  const remaining = round2(parseFloat(row.amount) - allocated);
  let status = 'UNUSED';
  if (allocated >= parseFloat(row.amount)) status = 'FULLY_USED';
  else if (allocated > 0)                  status = 'PARTIALLY_USED';

  return {
    ...row,
    amount:           round2(row.amount),
    allocated_amount: round2(allocated),
    remaining_amount: round2(remaining),
    status,
    tags: await getIncomeTags(row.id),
  };
}

async function enrichExpense(row) {
  const settled = await getSettledAmount(row.id);
  const pending = round2(parseFloat(row.amount) - settled);
  let status = 'PENDING';
  if (settled >= parseFloat(row.amount)) status = 'SETTLED';
  else if (settled > 0)                  status = 'PARTIALLY_SETTLED';

  return {
    ...row,
    amount:         round2(row.amount),
    settled_amount: round2(settled),
    pending_amount: round2(pending),
    status,
    tags: await getExpenseTags(row.id),
  };
}

module.exports = {
  upsertTags, setIncomeTags, setExpenseTags,
  getIncomeTags, getExpenseTags,
  getAllocatedAmount, getSettledAmount,
  enrichIncome, enrichExpense,
};
