import type { FastifyInstance } from 'fastify';
import { database } from '@market/database';
import { requireConsumer } from './consumer-auth.js';

const dealInclude = { canonicalProduct: { include: { brand: true, category: true } }, retailerProduct: true,
  branch: true, need: { select: { id: true, title: true } } } as const;
const alertInclude = { deal: { include: dealInclude }, need: { select: { id: true, title: true } }, notification: true } as const;
const notificationInclude = { alert: { include: { deal: { include: dealInclude } } } } as const;

export async function registerDealRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { all?: string } }>('/deals', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    return { deals: await database.deal.findMany({ where: { userId: user.id, status: 'ACTIVE',
      ...(request.query.all === 'true' ? {} : { label: { in: ['BUY', 'GREAT_DEAL'] as const } }) },
      include: dealInclude, orderBy: [{ score: 'desc' }, { evaluatedAt: 'desc' }] }) };
  });
  app.get<{ Params: { id: string } }>('/deals/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const deal = await database.deal.findFirst({ where: { id: request.params.id, userId: user.id }, include: dealInclude });
    return deal ?? reply.code(404).send({ error: 'DEAL_NOT_FOUND' });
  });
  app.get<{ Params: { id: string } }>('/deals/:id/history', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const deal = await database.deal.findFirst({ where: { id: request.params.id, userId: user.id } });
    if (!deal) return reply.code(404).send({ error: 'DEAL_NOT_FOUND' });
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const observations = await database.priceObservation.findMany({ where: { retailerProductId: deal.retailerProductId,
      branchId: deal.branchId, currency: deal.currency, observedAt: { gte: since, lte: new Date() } },
      select: { observedAt: true, priceMinor: true }, orderBy: { observedAt: 'asc' } });
    return { dealId: deal.id, currency: deal.currency, points: observations };
  });
  app.get('/alerts', async (_request, reply) => {
    const user = await requireConsumer(_request, reply);
    if (!user) return;
    return { alerts: await database.alert.findMany({ where: { userId: user.id }, include: alertInclude,
      orderBy: { createdAt: 'desc' } }) };
  });
  app.get<{ Params: { id: string } }>('/alerts/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const alert = await database.alert.findFirst({ where: { id: request.params.id, userId: user.id }, include: alertInclude });
    return alert ?? reply.code(404).send({ error: 'ALERT_NOT_FOUND' });
  });
  app.get('/notifications', async (_request, reply) => {
    const user = await requireConsumer(_request, reply);
    if (!user) return;
    return { notifications: await database.notification.findMany({ where: { userId: user.id }, include: notificationInclude,
      orderBy: { createdAt: 'desc' } }) };
  });
  app.patch<{ Params: { id: string } }>('/notifications/:id/read', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const existing = await database.notification.findFirst({ where: { id: request.params.id, userId: user.id } });
    if (!existing) return reply.code(404).send({ error: 'NOTIFICATION_NOT_FOUND' });
    return database.notification.update({ where: { id: existing.id }, data: { readAt: existing.readAt ?? new Date() }, include: notificationInclude });
  });
}
