import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@market/database';
import { evaluateNeed } from '@market/evaluation';
import { buildApp } from './app.js';

describe('persisted deals, alerts and notifications API', () => {
  let app: FastifyInstance;
  let needId: string;
  let userId: string;
  let token: string;
  beforeAll(async () => {
    app = await buildApp();
    const registration = await app.inject({ method: 'POST', url: '/auth/register',
      payload: { email: `deals-${Date.now()}@example.test`, password: 'deals-test-password', displayName: 'Deals Test' } });
    expect(registration.statusCode).toBe(201);
    const user = registration.json().user;
    userId = user.id;
    token = registration.json().token;
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
    const need = await prisma.userNeed.create({ data: { userId: user.id, categoryId: category.id, title: 'Dishwasher tablets',
      constraints: { preferredBrands: ['Finish'], minimumCount: 40, allowAlternatives: false } },
      include: { category: { select: { slug: true, name: true } } } });
    needId = need.id;
    await evaluateNeed(need);
  });
  afterAll(async () => {
    if (needId) {
      await prisma.notification.deleteMany({ where: { alert: { needId } } });
      await prisma.alert.deleteMany({ where: { needId } });
      await prisma.deal.deleteMany({ where: { needId } });
      await prisma.userNeed.delete({ where: { id: needId } });
    }
    if (userId) {
      await prisma.consumerSession.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    if (app) await app.close();
  });
  const auth = () => ({ authorization: `Bearer ${token}` });
  it('returns persisted snapshots and marks a notification read', async () => {
    const dealsResponse = await app.inject({ url: '/deals', headers: auth() });
    expect(dealsResponse.statusCode).toBe(200);
    const deal = dealsResponse.json().deals.find((item: { needId: string; currentPriceMinor: number }) =>
      item.needId === needId && item.currentPriceMinor === 31900);
    expect(deal).toBeTruthy();
    expect(deal.label).toBe('GREAT_DEAL');
    expect((await app.inject({ url: `/deals/${deal.id}`, headers: auth() })).statusCode).toBe(200);
    const allDeals = (await app.inject({ url: '/deals?all=true', headers: auth() })).json().deals.filter((item: { needId: string }) => item.needId === needId);
    expect(allDeals.length).toBeGreaterThan(1);
    expect(allDeals.some((item: { label: string }) => item.label === 'GOOD_PRICE')).toBe(true);
    const history = await app.inject({ url: `/deals/${deal.id}/history`, headers: auth() });
    expect(history.statusCode).toBe(200);
    expect(history.json().points.length).toBeGreaterThan(50);
    expect(history.json().points.at(-1).priceMinor).toBe(31900);
    const alerts = (await app.inject({ url: '/alerts', headers: auth() })).json().alerts;
    const alert = alerts.find((item: { needId: string; dealId: string }) => item.needId === needId && item.dealId === deal.id);
    expect(alert).toBeTruthy();
    expect((await app.inject({ url: `/alerts/${alert.id}`, headers: auth() })).statusCode).toBe(200);
    const notifications = (await app.inject({ url: '/notifications', headers: auth() })).json().notifications;
    const notification = notifications.find((item: { alertId: string }) => item.alertId === alert.id);
    expect(notification.readAt).toBeNull();
    const read = await app.inject({ method: 'PATCH', url: `/notifications/${notification.id}/read`, headers: auth() });
    expect(read.statusCode).toBe(200);
    expect(read.json().readAt).not.toBeNull();
    expect((await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).readAt).not.toBeNull();
    expect((await app.inject({ url: '/deals/does-not-exist', headers: auth() })).statusCode).toBe(404);
  });
});
