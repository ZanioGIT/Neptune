// db.js
'use strict';

const { Pool } = require('pg');

const CS = process.env.DATABASE_URL;
if (!CS) throw new Error('Missing env var DATABASE_URL');

// SSL: attivalo a meno che PGSSLMODE sia 'disable'
const ssl =
  (process.env.PGSSLMODE || '').toLowerCase() === 'disable'
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString: CS,
  ssl,
  max: parseInt(process.env.PGPOOL_MAX || '5', 10),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '10000', 10),
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT || '10000', 10),
  allowExitOnIdle: true,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function healthCheck() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = { pool, query, healthCheck };
