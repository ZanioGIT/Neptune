// db.js
'use strict';

const { Pool } = require('pg');
const pino = require('pino')();

const CS = process.env.DATABASE_URL;
if (!CS) {
  throw new Error('Missing env var DATABASE_URL');
}

/**
 * Abilita SSL quando serve (Supabase lo richiede).
 * Usiamo rejectUnauthorized:false per evitare di dover fornire il CA.
 * Se preferisci, puoi caricare il certificato CA e metterlo in ssl.ca.
 */
function buildSsl(connectionString) {
  try {
    // Se nel connection string c'è sslmode=require, abilita SSL
    if (/sslmode=(require|verify-ca|verify-full)/i.test(connectionString)) {
      return { rejectUnauthorized: false };
    }
    // Per Supabase abilitiamo SSL di default
    if (/\.(supabase\.co|supabase\.com)$/i.test(new URL(connectionString).hostname)) {
      return { rejectUnauthorized: false };
    }
    // On by default se non esplicitamente disabilitato
    if ((process.env.PGSSLMODE || '').toLowerCase() !== 'disable') {
      return { rejectUnauthorized: false };
    }
  } catch (_) {}
  return false;
}

const pool = new Pool({
  connectionString: CS,
  ssl: buildSsl(CS),
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
