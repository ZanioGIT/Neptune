// apps/api/db.js
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

export const pool = new Pool({
  connectionString,
  ssl: { require: true, rejectUnauthorized: false }, // <-- chiave
});

export async function query(sql, params = []) {
  return pool.query(sql, params);
}

export async function healthCheck() {
  const { rows } = await pool.query('select now() as ts');
  return rows[0];
}

export default { pool, query, healthCheck };
