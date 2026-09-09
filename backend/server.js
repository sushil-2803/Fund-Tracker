'use strict';

try { require('dotenv').config(); } catch (_) {}

const path    = require('path');
const express = require('express');
const cors    = require('cors');
const { query, pool } = require('./db');

const authRouter        = require('./routes/auth');
const incomesRouter     = require('./routes/incomes');
const expensesRouter    = require('./routes/expenses');
const allocationsRouter = require('./routes/allocations');
const dashboardRouter   = require('./routes/dashboard');

const app    = express();
const PORT   = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const clientOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, cb) {
    if (!origin || clientOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use((req, _res, next) => {
  if (!isProd) console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);        // public: register, login, refresh
app.use('/api/incomes',     incomesRouter);     // protected
app.use('/api/expenses',    expensesRouter);    // protected
app.use('/api/allocations', allocationsRouter); // protected
app.use('/api/dashboard',   dashboardRouter);   // protected

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await query('SELECT NOW() AS time, current_database() AS db');
    res.json({
      status: 'ok', timestamp: new Date().toISOString(),
      database: rows[0].db, db_time: rows[0].time,
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ── Production SPA ────────────────────────────────────────────────────────────
if (isProd) {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) =>
    res.sendFile(path.join(distPath, 'index.html'))
  );
}

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await query('SELECT 1');
    console.log('  ✓ PostgreSQL connected');
  } catch (err) {
    console.error('  ✗ PostgreSQL connection failed:', err.message);
    console.error('\n💡  Fix: set DATABASE_URL in backend/.env');
    console.error('    Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/fund_tracker');
    process.exit(1);
  }

  // Warn if using default JWT secrets in production
  if (isProd) {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('  ✗ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production!');
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  FundTracker API  →  http://localhost:${PORT}`);
    console.log(`    Health          →  http://localhost:${PORT}/api/health\n`);
  });
}

start();
