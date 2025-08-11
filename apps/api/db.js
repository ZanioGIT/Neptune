// apps/api/db.js
// Postgres ESM + export sia named che default

import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

/** Esegue una query generica */
export async function query(sql, params = []) {
  const res = await pool.query(sql, params);
  return res;
}

/** Health check DB: ritorna il timestamp del server Postgres */
export async function healthCheck() {
  const { rows } = await pool.query('select now() as ts');
  return rows[0]; // { ts: ... }
}

/** Export default opzionale */
export default { pool, query, healthCheck };

