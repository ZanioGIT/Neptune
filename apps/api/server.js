// apps/api/server.js
'use strict';

/**
 * Neptune_WebService – API bootstrap
 * - Forza la risoluzione IPv4 (Render può non avere egress IPv6)
 * - Espone /health e /db/health con logging strutturato
 */

const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first'); // ulteriore safety net oltre a NODE_OPTIONS

const express = require('express');
const pino = require('pino')();
const pinoHttp = require('pino-http')({ logger: pino });

const { pool, healthCheck } = require('./db');

const PORT = process.env.PORT || 10000;

const app = express();
app.use(pinoHttp);

// Liveness probe
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Verifica connettività DB
app.get('/db/health', async (req, res) => {
  try {
    await healthCheck();
    res.json({ status: 'ok' });
  } catch (err) {
    // Log dettagliato lato server, ma risposta "igienizzata" lato client
    req.log.error(
      {
        err,
        code: err.code,
        name: err.name,
        message: err.message,
      },
      'DB health check failed'
    );

    const publicError =
      err.code === 'SELF_SIGNED_CERT_IN_CHAIN'
        ? 'tls_cert_chain_error'
        : 'internal_server_error';

    res.status(500).json({ error: publicError });
  }
});

// Evita 404 durante probe/proxy
app.head('/', (_req, res) => res.status(200).end());
app.get('/', (_req, res) => res.status(200).send('OK'));

app.listen(PORT, () => pino.info(`Server is running on port ${PORT}`));
