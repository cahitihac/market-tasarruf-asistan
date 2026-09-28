import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import cors from '@fastify/cors';
import { prisma } from '@market/database';
import { loadConfig } from '@market/config';
import { registerNeedRoutes } from './needs.routes.js';
import { registerDealRoutes } from './deals.routes.js';
import { registerAdminRoutes } from './admin.routes.js';
import { registerAuthRoutes } from './auth.routes.js';
import { registerPushRoutes } from './push.routes.js';

export async function buildApp() {
  const config = loadConfig();
  const app = Fastify({ logger: { level: config.LOG_LEVEL } });
  await app.register(cors, { origin: config.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean),
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(swagger, { openapi: { info: { title: 'Market Tasarruf API', version: '0.1.0' } } });
  app.get('/health', { schema: { response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } } }, async () => ({ status: 'ok' }));
  app.get('/ready', async (request, reply) => {
    try { await prisma.$queryRaw`SELECT 1`; return { status: 'ok' }; }
    catch (error) { request.log.error({ error }, 'readiness failed'); return reply.code(503).send({ status: 'unavailable' }); }
  });
  await registerAuthRoutes(app);
  await registerPushRoutes(app);
  await registerNeedRoutes(app);
  await registerDealRoutes(app);
  await registerAdminRoutes(app);
  app.addHook('onClose', async () => { await prisma.$disconnect(); });
  return app;
}
