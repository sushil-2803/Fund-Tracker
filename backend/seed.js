'use strict';
/**
 * seed.js — Demo data for Google OAuth users.
 * Since users sign in via Google, we insert synthetic users with fake google_ids.
 * In production, users are created automatically on first Google Sign-In.
 *
 * Usage:  node seed.js
 */

try { require('dotenv').config(); } catch (_) {}

const { v4: uuidv4 } = require('uuid');
const { query, transaction, close } = require('./db');

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10);
}

async function wipe(client) {
  for (const t of ['allocations','income_tags','expense_tags','incomes','expenses','tags','refresh_tokens','users'])
    await client.query(`DELETE FROM ${t}`);
  console.log('🗑  Cleared data\n');
}

async function tagId(client, name) {
  const n = name.trim().toLowerCase();
  await client.query(`INSERT INTO tags (id,name) VALUES ($1,$2) ON CONFLICT (LOWER(name)) DO NOTHING`, [uuidv4(), n]);
  const { rows: [r] } = await client.query(`SELECT id FROM tags WHERE LOWER(name)=$1`, [n]);
  return r?.id;
}

async function addIncome(client, userId, { amount, source, date, notes, tags = [] }) {
  const id = uuidv4();
  await client.query(
    `INSERT INTO incomes (id,user_id,amount,source,date,notes) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, userId, amount, source, date, notes ?? null]
  );
  for (const t of tags) {
    const tid = await tagId(client, t);
    if (tid) await client.query(
      `INSERT INTO income_tags (income_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, tid]
    );
  }
  return id;
}

async function addExpense(client, userId, { amount, title, category, date, notes, tags = [] }) {
  const id = uuidv4();
  await client.query(
    `INSERT INTO expenses (id,user_id,amount,title,category,date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, userId, amount, title ?? category, category, date, notes ?? null]
  );
  for (const t of tags) {
    const tid = await tagId(client, t);
    if (tid) await client.query(
      `INSERT INTO expense_tags (expense_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, tid]
    );
  }
  return id;
}

async function allocate(client, userId, { income_id, expense_id, amount, note }) {
  await client.query(
    `INSERT INTO allocations (id,user_id,income_id,expense_id,amount,note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [uuidv4(), userId, income_id, expense_id, amount, note ?? null]
  );
}

async function seed() {
  await transaction(async (client) => {
    await wipe(client);

    // ── Demo users (synthetic — in production Google creates these on first login) ──
    console.log('👤  Creating demo users…');
    const user1Id = uuidv4();
    await client.query(
      `INSERT INTO users (id, google_id, email, name, avatar_url) VALUES ($1,$2,$3,$4,$5)`,
      [user1Id, 'google_demo_001', 'demo@fundtracker.app', 'Demo User',
       'https://ui-avatars.com/api/?name=Demo+User&background=6c8ff7&color=fff']
    );

    const user2Id = uuidv4();
    await client.query(
      `INSERT INTO users (id, google_id, email, name, avatar_url) VALUES ($1,$2,$3,$4,$5)`,
      [user2Id, 'google_demo_002', 'priya@example.com', 'Priya Sharma',
       'https://ui-avatars.com/api/?name=Priya+Sharma&background=3ecf8e&color=fff']
    );

    console.log('  ✓ demo@fundtracker.app (sign in with Google using this email)');
    console.log('  ✓ priya@example.com\n');

    // ── User 1 — full dataset ──────────────────────────────────────────────
    console.log('💰  Inserting incomes…');
    const salaryJan  = await addIncome(client, user1Id, { amount: 85000, source: 'Salary – January',        date: daysAgo(50), tags: ['salary','acme','monthly'] });
    const salaryFeb  = await addIncome(client, user1Id, { amount: 85000, source: 'Salary – February',       date: daysAgo(20), tags: ['salary','acme','monthly'] });
    const freelance  = await addIncome(client, user1Id, { amount: 32000, source: 'Freelance – UI Project',  date: daysAgo(35), tags: ['freelance','design'] });
    const tripFund   = await addIncome(client, user1Id, { amount: 20000, source: 'Goa Trip Contributions',  date: daysAgo(25), tags: ['trip','goa','shared'] });
    const reimb      = await addIncome(client, user1Id, { amount:  4500, source: 'Office Reimbursement Q1', date: daysAgo(12), tags: ['reimbursement','office'] });
    const familyXfer = await addIncome(client, user1Id, { amount: 15000, source: 'Family Transfer',         date: daysAgo(7),  tags: ['family','medical'] });

    console.log('🧾  Inserting expenses…');
    const rent          = await addExpense(client, user1Id, { amount: 22000, category: 'Rent',                date: daysAgo(45), tags: ['rent','housing'] });
    const groceries     = await addExpense(client, user1Id, { amount:  6800, category: 'Groceries',           date: daysAgo(38), tags: ['food','groceries'] });
    const electricity   = await addExpense(client, user1Id, { amount:  2100, category: 'Utilities',           date: daysAgo(30), tags: ['utilities','housing'] });
    const fuel          = await addExpense(client, user1Id, { amount:  3200, category: 'Fuel',                date: daysAgo(28), tags: ['fuel','transport','reimbursement'] });
    const internet      = await addExpense(client, user1Id, { amount:  1300, category: 'Internet',            date: daysAgo(27), tags: ['utilities','reimbursement'] });
    const hotel         = await addExpense(client, user1Id, { amount:  8500, category: 'Accommodation',       date: daysAgo(22), tags: ['trip','goa','hotel'] });
    const goaFood       = await addExpense(client, user1Id, { amount:  4200, category: 'Food & Dining',       date: daysAgo(21), tags: ['food','trip','goa'] });
    const goaFuel       = await addExpense(client, user1Id, { amount:  2800, category: 'Fuel',                date: daysAgo(20), tags: ['fuel','trip','goa'] });
    const medical       = await addExpense(client, user1Id, { amount: 12500, category: 'Medical',             date: daysAgo(10), tags: ['medical','health'] });
    const shopping      = await addExpense(client, user1Id, { amount:  7600, category: 'Shopping',            date: daysAgo(15), tags: ['shopping','personal'] });
    const transport     = await addExpense(client, user1Id, { amount:  1800, category: 'Transport',           date: daysAgo(16), tags: ['transport','commute'] });
    const entertainment = await addExpense(client, user1Id, { amount:  2800, category: 'Entertainment',       date: daysAgo(8),  tags: ['entertainment','personal'] });
    const equipment     = await addExpense(client, user1Id, { amount: 18000, category: 'Freelance Equipment', date: daysAgo(3),  tags: ['freelance','equipment','pending'] });
    await addExpense(client, user1Id, { amount: 3600, category: 'Subscriptions', date: daysAgo(2), tags: ['freelance','tools','pending'] });

    console.log('⇄   Creating allocations…');
    await allocate(client, user1Id, { income_id: salaryJan,  expense_id: rent,          amount: 22000 });
    await allocate(client, user1Id, { income_id: salaryJan,  expense_id: groceries,     amount:  6800 });
    await allocate(client, user1Id, { income_id: salaryJan,  expense_id: electricity,   amount:  2100 });
    await allocate(client, user1Id, { income_id: salaryJan,  expense_id: transport,     amount:  1800 });
    await allocate(client, user1Id, { income_id: salaryFeb,  expense_id: shopping,      amount:  7600 });
    await allocate(client, user1Id, { income_id: salaryFeb,  expense_id: entertainment, amount:  2800 });
    await allocate(client, user1Id, { income_id: salaryFeb,  expense_id: medical,       amount:  2500 });
    await allocate(client, user1Id, { income_id: freelance,  expense_id: medical,       amount: 10000 });
    await allocate(client, user1Id, { income_id: tripFund,   expense_id: hotel,         amount:  8500 });
    await allocate(client, user1Id, { income_id: tripFund,   expense_id: goaFood,       amount:  4200 });
    await allocate(client, user1Id, { income_id: tripFund,   expense_id: goaFuel,       amount:  2800 });
    await allocate(client, user1Id, { income_id: reimb,      expense_id: fuel,          amount:  3200 });
    await allocate(client, user1Id, { income_id: reimb,      expense_id: internet,      amount:  1300 });
    await allocate(client, user1Id, { income_id: familyXfer, expense_id: equipment,     amount: 15000 });

    // ── User 2 — minimal data ──────────────────────────────────────────────
    const ps1 = await addIncome(client, user2Id,  { amount: 60000, source: 'Salary – February', date: daysAgo(15), tags: ['salary'] });
    const pe1 = await addExpense(client, user2Id, { amount: 15000, category: 'Rent',    date: daysAgo(14), tags: ['housing'] });
    const pe2 = await addExpense(client, user2Id, { amount:  8000, category: 'Travel',  date: daysAgo(5),  tags: ['travel','pending'] });
    await allocate(client, user2Id, { income_id: ps1, expense_id: pe1, amount: 15000 });
    await allocate(client, user2Id, { income_id: ps1, expense_id: pe2, amount:  5000 });
  });

  console.log('\n✅  Seed complete!\n');
  for (const t of ['users','incomes','expenses','allocations','tags']) {
    const { rows: [{ n }] } = await query(`SELECT COUNT(*) AS n FROM ${t}`);
    console.log(`  ${t.padEnd(14)}: ${n}`);
  }
  console.log();
}

seed()
  .catch(err => { console.error('\n❌  Seed failed:', err.message); process.exit(1); })
  .finally(close);
