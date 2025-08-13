// db.js
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL env var');
}

/**
 * IMPORTANT:
 * - Tutte le opzioni SSL vivono dentro la DATABASE_URL (…?sslmode=no-verify).
 * - Non aggiungere oggetti/flag ssl qui, per evitare conflitti.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // opzionali ma utili in ambienti PaaS gratuiti:
  max: Number(process.env.PGPOOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Health check: esegue una query semplicissima
async function healthCheck() {
  const res = await pool.query('select 1 as ok');
  return res.rows?.[0]?.ok === 1;
}

module.exports = { pool, healthCheck };
