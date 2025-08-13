// server.js
'use strict';

const dns = require('node:dns');
// Su Render è utile preferire IPv4 quando disponibile
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const pino = require('pino')();
const pinoHttp = require('pino-http')({ logger: pino });

const { healthCheck } = require('./db');

const PORT = process.env.PORT || 10000;

const app = express();

// ⬅️ IMPORTANTE: passare il middleware, non invocarlo
app.use(pinoHttp);

// Health generale
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Health del DB
app.get('/db/health', async (req, res) => {
  try {
    const ok = await healthCheck();
    res.json({ status: ok ? 'ok' : 'fail' });
  } catch (err) {
    // facoltativa la ?. per evitare crash se il logger mancasse
    req.log?.error({ err }, 'DB health check failed');
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// Evita 404 rumorosi sul root
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.status(200).send('OK'));

app.listen(PORT, () => pino.info(`Server is running on port ${PORT}`));
