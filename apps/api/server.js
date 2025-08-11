// apps/api/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as db from './db.js';
import errorHandler from './middleware/error.js';
import pg from 'pg'; // fallback diretto se il modulo db non risponde
const { Pool } = pg;

const PORT = process.env.PORT || 3000;

// Logger sicuro
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

const app = express();

// ----- CORS -----
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowed = new Set(
  ['http://localhost:5173', ...allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)]
);
const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowed.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// ----- Middleware base -----
const maxMb = Number(process.env.MAX_UPLOAD_MB || 20);
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: `${maxMb}mb` }));

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          headers: { ...req.headers, authorization: undefined, cookie: undefined },
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ----- LOG DIAGNOSTICO all'avvio -----
logger.info({
  hasQuery: typeof db.query,
  hasHealthCheck: typeof db.healthCheck,
  hasPool: !!db.pool,
  hasDatabaseUrl: !!process.env.DATABASE_URL
}, 'db-exports-and-env');

// ----- Routes -----
app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

// Fallback robusto su /db/health
app.get('/db/health', async (req, res, next) => {
  try {
    let ts;

    if (typeof db.healthCheck === 'function') {
      const r = await db.healthCheck();
      ts = r?.ts;
    } else if (typeof db.query === 'function') {
      const { rows } = await db.query('select now() as ts');
      ts = rows?.[0]?.ts;
    } else {
      // Fallback estremo: Pool inline
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });
      const { rows } = await pool.query('select now() as ts');
      ts = rows?.[0]?.ts;
      // chiudi il pool temporaneo
      pool.end().catch(() => {});
    }

    res.status(200).json({ status: 'ok', ts });
  } catch (err) {
    // Log utile (senza segreti)
    req.log?.error(
      { msg: 'DB health check failed', err: err?.message || String(err) },
      'db-health-error'
    );
    next(err);
  }
});

// 404
app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

// Error handler centralizzato
app.use(errorHandler);

// ----- Avvio -----
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
