'use strict';

try { require('dotenv').config(); } catch (_) {}

const { Pool } = require('pg');

// ── Build connection config ────────────────────────────────────────────────────
// Priority: DATABASE_URL → individual PG* vars → sensible defaults
function buildConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    };
  }

  const cfg = {
    host:     process.env.PGHOST     || 'localhost',
    port:     parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'fund_tracker',
    user:     process.env.PGUSER     || 'postgres',
    ssl:      false,
  };

  // Only set password if the env var is actually present and non-empty.
  // Passing undefined lets pg use OS-level auth (peer / trust) safely.
  // Passing '' causes SASL errors on some Postgres configs.
  const pw = process.env.PGPASSWORD;
  if (pw !== undefined && pw !== '') cfg.password = pw;

  return cfg;
}

const pool = new Pool({
  ...buildConfig(),
  max:                     parseInt(process.env.PG_MAX_CONNECTIONS     || '10',    10),
  idleTimeoutMillis:       parseInt(process.env.PG_IDLE_TIMEOUT_MS     || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONNECTION_TIMEOUT_MS || '5000', 10),
});

pool.on('error', (err) => {
  console.error('[pg pool] Unexpected client error:', err.message);
});

/**
 * Execute a single parameterised query.
 */
async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[db] ${Date.now() - start}ms — ${text.slice(0, 80).replace(/\s+/g, ' ')}`);
    }
    return result;
  } catch (err) {
    console.error('[db] Query error:', err.message, '\nSQL:', text.slice(0, 200));
    throw err;
  }
}

/**
 * Run a callback inside a BEGIN/COMMIT transaction.
 * Automatically rolls back and rethrows on error.
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Drain the pool — call before process exit in scripts. */
async function close() {
  await pool.end();
}

module.exports = { query, transaction, close, pool };
