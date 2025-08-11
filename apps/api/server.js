import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import * as db from './db.js';
import { errorHandler } from './middleware/error.js';

// --- Setup ---
const PORT = process.env.PORT || 3000;
const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({ logger });

// --- CORS Configuration ---
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = ['http://localhost:5173', ...allowedOriginsEnv.split(',').filter(Boolean)];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};


// --- Middleware ---
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(httpLogger);


// --- Routes ---

/**
 * @route GET /health
 * @description Basic health check to confirm the server is running.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * @route GET /db/health
 * @description Checks the database connection by querying the current timestamp.
 */
app.get('/db/health', async (req, res, next) => {
  try {
    const result = await db.healthCheck();
    res.status(200).json({ status: 'ok', ts: result.ts });
  } catch (error) {
    logger.error(error, 'Database health check failed');
    next(error); // Pass the error to the centralized error handler
  }
});


// --- Error Handling ---
app.use(errorHandler);


// --- Server Start ---
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
