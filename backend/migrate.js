'use strict';

try { require('dotenv').config(); } catch (_) {}

function printConnectionInfo() {
  if (process.env.DATABASE_URL) {
    const masked = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@');
    console.log(`  Using DATABASE_URL: ${masked}`);
  } else {
    console.log(`  Host: ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}`);
    console.log(`  DB:   ${process.env.PGDATABASE || 'fund_tracker'}`);
    console.log(`  User: ${process.env.PGUSER || 'postgres'}`);
  }
  console.log();
}

const { query, close } = require('./db');

async function migrate() {
  console.log('🔄  Running migrations…\n');
  printConnectionInfo();

  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  // ── users ──────────────────────────────────────────────────────────────────
  // google_id: the stable "sub" field from Google's ID token
  // avatar_url: profile picture from Google
  // No password_hash — authentication is entirely via Google OAuth
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      google_id  TEXT        NOT NULL,
      email      TEXT        NOT NULL,
      name       TEXT        NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users (google_id)`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email))`);
  console.log('  ✓ users');

  // ── refresh_tokens ─────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT        NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens (token_hash)`);
  console.log('  ✓ refresh_tokens');

  // ── incomes ────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS incomes (
      id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id    TEXT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      source     TEXT          NOT NULL,
      date       DATE          NOT NULL,
      notes      TEXT,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
  console.log('  ✓ incomes');

  // ── expenses ───────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id    TEXT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      title      TEXT          NOT NULL,
      category   TEXT          NOT NULL,
      date       DATE          NOT NULL,
      notes      TEXT,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS title TEXT`);
  await query(`UPDATE expenses SET title = category WHERE title IS NULL OR BTRIM(title) = ''`);
  await query(`ALTER TABLE expenses ALTER COLUMN title SET NOT NULL`);
  console.log('  ✓ expenses');

  // ── allocations ────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS allocations (
      id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      user_id    TEXT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      income_id  TEXT          NOT NULL REFERENCES incomes(id)  ON DELETE CASCADE,
      expense_id TEXT          NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
      note       TEXT,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `);
  console.log('  ✓ allocations');

  // ── tags ───────────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS tags (
      id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
      name TEXT NOT NULL
    )
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS tags_name_lower_idx ON tags (LOWER(name))`);
  console.log('  ✓ tags');

  // ── income_tags / expense_tags ─────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS income_tags (
      income_id TEXT NOT NULL REFERENCES incomes(id) ON DELETE CASCADE,
      tag_id    TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
      PRIMARY KEY (income_id, tag_id)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS expense_tags (
      expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      tag_id     TEXT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE,
      PRIMARY KEY (expense_id, tag_id)
    )
  `);
  console.log('  ✓ income_tags, expense_tags');

  // ── Indexes ────────────────────────────────────────────────────────────────
  const indexes = [
    ['idx_incomes_user',   'incomes',     'user_id'],
    ['idx_expenses_user',  'expenses',    'user_id'],
    ['idx_alloc_user',     'allocations', 'user_id'],
    ['idx_alloc_income',   'allocations', 'income_id'],
    ['idx_alloc_expense',  'allocations', 'expense_id'],
    ['idx_incomes_date',   'incomes',     'date DESC'],
    ['idx_expenses_date',  'expenses',    'date DESC'],
    ['idx_incomes_source', 'incomes',     'source'],
    ['idx_expenses_title', 'expenses',    'title'],
    ['idx_expenses_cat',   'expenses',    'category'],
  ];
  for (const [name, table, col] of indexes) {
    await query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${col})`);
  }
  console.log('  ✓ indexes');

  // ── updated_at trigger ─────────────────────────────────────────────────────
  await query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `);
  for (const table of ['users', 'incomes', 'expenses']) {
    await query(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON ${table}`);
    await query(`
      CREATE TRIGGER trg_${table}_updated_at
      BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    `);
  }
  console.log('  ✓ updated_at triggers');

  console.log('\n✅  All migrations applied.\n');
}

migrate()
  .catch(err => {
    console.error('\n❌  Migration failed:', err.message);
    console.error('\n💡  Common fixes:');
    console.error('    1. Create backend/.env from .env.example');
    console.error('    2. Set DATABASE_URL=postgresql://USER:PASS@localhost:5432/fund_tracker');
    console.error('    3. Make sure PostgreSQL is running');
    console.error('    4. Create the DB first: createdb fund_tracker');
    process.exit(1);
  })
  .finally(close);
