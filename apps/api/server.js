// server.js
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // evita tentativi IPv6 su Render

const fastify = require('fastify')({ logger: true });
const { Pool } = require('pg');

const PORT = parseInt(process.env.PORT || '10000', 10);
const DATABASE_URL = process.env.DATABASE_URL;

fastify.get('/health', async (_, reply) => reply.send({ status: 'ok' }));

let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },        // richiesto da Neon/managed PG
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

fastify.get('/db/health', async (req, reply) => {
  if (!pool) return reply.code(500).send({ error: 'db_not_configured' });
  try {
    const r = await pool.query('select 1 as ok');
    return reply.send({ status: 'ok', result: r.rows[0] });
  } catch (err) {
    req.log.error({ err }, 'db-health-error');
    return reply.code(500).send({ error: 'db_unreachable' });
  }
});

fastify.listen({ host: '0.0.0.0', port: PORT }, (err) => {
  if (err) {
    fastify.log.error({ err }, 'server-start-error');
    process.exit(1);
  }
  fastify.log.info(`Server is running on port ${PORT}`);
});
