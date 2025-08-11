// server.js
'use strict';

const dns = require('node:dns');
// Forza la risoluzione IPv4 prima dell'IPv6 (fix ENETUNREACH su Render)
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const { Pool } = require('pg');
const pino = require('pino')();
const pinoHttp = require('pino-http')({ logger: pino });

const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;

const app = express();
app.use(pinoHttp);

// Inizializza il pool solo se ho la URL del DB
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    // la maggior parte dei provider richiede SSL in produzione
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000
  });
  pino.info({ hasPool: true, hasDatabaseUrl: true }, 'db-initialized');
} else {
  pino.warn('DATABASE_URL not set — /db/* routes will return 503');
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/db/health', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'db_not_configured' });
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    req.log.error({ err }, 'DB health check failed');
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Evita 404 sul root/HEAD che vedi nei log
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.status(200).send('OK'));

app.listen(PORT, () => pino.info(`Server is running on port ${PORT}`));
