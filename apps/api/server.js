// server.js
const express = require('express');
const cors = require('cors');
const pino = require('pino');
const pinoHttp = require('pino-http'); // ⚠️ import del middleware (non invocarlo qui)
const { pool, healthCheck } = require('./db');

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// --- Middleware -------------------------------------------------------------
app.use(express.json());

// CORS dalle origini consentite (virgola-separate nell'env)
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // consentiamo richieste da tool locali o curl/postman senza Origin
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
}));

// pino-http VA MONTATO come middleware, così:
app.use(pinoHttp({ logger }));

// --- Routes ----------------------------------------------------------------
app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/db/health', async (req, res) => {
  try {
    const ok = await healthCheck();
    if (!ok) throw new Error('DB unhealthy');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    req.log?.error({ err }, 'DB health check failed');
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// esempio di endpoint che usa il pool
app.get('/time', async (req, res) => {
  try {
    const { rows } = await pool.query('select now() as now');
    res.json({ now: rows[0].now });
  } catch (err) {
    req.log?.error({ err }, 'Failed /time');
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// --- Avvio -----------------------------------------------------------------
const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
