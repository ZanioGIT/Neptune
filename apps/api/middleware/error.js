// apps/api/middleware/error.js
// Middleware centralizzato per gli errori (ESM, export default)

export default function errorHandler(err, req, res, next) {
  // Log "sicuro": non stampiamo segreti né stack in prod
  try {
    if (req?.log) req.log.error({ msg: 'Unhandled error', err: String(err?.message || err) });
    else console.error('[error]', err?.message || err);
  } catch (_) {
    // noop
  }

  const isProd = process.env.NODE_ENV === 'production';

  res
    .status(500)
    .json(
      isProd
        ? { error: 'internal_server_error' }
        : { error: err?.message || 'internal_server_error', stack: err?.stack }
    );
}

