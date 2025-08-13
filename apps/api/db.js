// apps/api/db.js
'use strict';

/**
 * Pool Postgres robusto per Supabase (direct o Transaction Pooler).
 * - SSL esplicito con rejectUnauthorized:false per evitare SELF_SIGNED_CERT_IN_CHAIN
 * - IPv4 gestito a livello di runtime in server.js
 */

const { URL } = require('node:url');
const pg = require('pg');

// Imposta un default SSL globale per qualunque client/Pool creato da 'pg'
pg.defaults.ssl = { rejectUnauthorized: false };

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const url = new URL(connectionString);

// Se qualcuno ha impostato PGSSLMODE=disable disattiviamo SSL, altrimenti lo abilitiamo in modo "no-verify"
const ssl =
  String(process.env.PGSSLMODE || '').toLowerCase() === 'disable'
    ? false
    : {
        rejectUnauthorized: false,
        // assicura SNI corretto (utile con alcuni terminatori TLS/proxy)
        servername: url.hostname,
      };

const pool = new Pool({
  connectionString,
  ssl,
  max: Number(process.env.PGPOOL_MAX || 5),
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
});

async function healthCheck() {
  const { rows } = await pool.query('select now() as ts');
  return rows[0];
}

module.exports = {
  pool,
  healthCheck,
};
