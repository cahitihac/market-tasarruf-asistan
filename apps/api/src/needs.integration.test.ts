import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { database } from '@market/database';
import { buildApp } from './app.js';

describe('User Needs API with seeded DynamoDB', () => {
  let app: FastifyInstance;
  let token: string;
  let userId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    const response = await app.inject({ method: 'POST', url: '/auth/register',
      payload: { email: `needs-${Date.now()}@example.test`, password: 'needs-test-password', displayName: 'Needs Test' } });
    expect(response.statusCode).toBe(201);
    token = response.json().token;
    userId = response.json().user.id;
  });
  afterAll(async () => {
    await database.userNeed.deleteMany({ where: { id: { in: createdIds } } });
    await database.consumerSession.deleteMany({ where: { userId } });
    if (userId) await database.user.delete({ where: { id: userId } });
    await app.close();
  });

  const auth = () => ({ authorization: `Bearer ${token}` });

  it('validates input and rejects unknown categories', async () => {
    const invalid = await app.inject({ method: 'POST', url: '/needs', headers: auth(), payload: { name: '' } });
    expect(invalid.statusCode).toBe(400);
    const unknown = await app.inject({ method: 'POST', url: '/needs', headers: auth(), payload: { name: 'Mystery', category: 'does_not_exist' } });
    expect(unknown.statusCode).toBe(422);
  });

  it('creates, lists, updates, matches and archives a generic need', async () => {
    const created = await app.inject({ method: 'POST', url: '/needs', headers: auth(), payload: {
      name: 'Dishwasher tablets', category: 'dishwasher_tablets', preferredBrands: ['Finish'],
      alternativeBrands: ['Fairy'], minimumCount: 40, allowAlternatives: true,
    } });
    expect(created.statusCode).toBe(201);
    const need = created.json();
    createdIds.push(need.id);
    expect(need.category).toBe('dishwasher-tablets');

    const listed = await app.inject({ method: 'GET', url: '/needs', headers: auth() });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().needs.some((item: { id: string }) => item.id === need.id)).toBe(true);
    const detail = await app.inject({ method: 'GET', url: `/needs/${need.id}`, headers: auth() });
    expect(detail.json().name).toBe('Dishwasher tablets');

    const offersResponse = await app.inject({ method: 'GET', url: `/needs/${need.id}/offers`, headers: auth() });
    expect(offersResponse.statusCode).toBe(200);
    const offers = offersResponse.json().offers;
    expect(offers.length).toBeGreaterThanOrEqual(10);
    const seededOffer = offers.find((offer: { retailer: { name: string }; currentPrice: { amountMinor: number } }) =>
      offer.retailer.name === 'Migros' && offer.currentPrice.amountMinor === 31900);
    expect(seededOffer.canonicalProduct.name).toBe('Finish Quantum 72 tablets');
    expect(seededOffer.priceStatistics.average90d).toBeGreaterThan(40000);
    expect(seededOffer.recommendation).toBe('GREAT_DEAL');
    expect(seededOffer.matchScore).toBeGreaterThan(0);
    expect(seededOffer.explanationReasons.length).toBeGreaterThan(0);

    const priceLimited = await app.inject({ method: 'PATCH', url: `/needs/${need.id}`, headers: auth(), payload: { maximumUnitPriceMinor: 500 } });
    expect(priceLimited.statusCode).toBe(200);
    const budgetOffers = await app.inject({ method: 'GET', url: `/needs/${need.id}/offers`, headers: auth() });
    expect(budgetOffers.json().count).toBeGreaterThanOrEqual(1);
    expect(budgetOffers.json().offers.every((offer: { unitPrice: { amountMinor: number } }) =>
      offer.unitPrice.amountMinor <= 500)).toBe(true);
    expect(budgetOffers.json().offers.some((offer: { retailer: { name: string } }) => offer.retailer.name === 'Migros')).toBe(true);

    const updated = await app.inject({ method: 'PATCH', url: `/needs/${need.id}`, headers: auth(), payload: { minimumCount: 80 } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().minimumCount).toBe(80);
    const none = await app.inject({ method: 'GET', url: `/needs/${need.id}/offers`, headers: auth() });
    expect(none.json().count).toBe(0);
    const cleared = await app.inject({ method: 'PATCH', url: `/needs/${need.id}`, headers: auth(),
      payload: { minimumCount: null, maximumUnitPriceMinor: null, preferredBrands: [] } });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().minimumCount).toBeUndefined();
    expect(cleared.json().maximumUnitPriceMinor).toBeUndefined();
    expect(cleared.json().preferredBrands).toEqual([]);

    const removed = await app.inject({ method: 'DELETE', url: `/needs/${need.id}`, headers: auth() });
    expect(removed.statusCode).toBe(204);
    const missing = await app.inject({ method: 'GET', url: `/needs/${need.id}`, headers: auth() });
    expect(missing.statusCode).toBe(404);
  });

  it('infers a category when only a generic need name is supplied', async () => {
    const created = await app.inject({ method: 'POST', url: '/needs', headers: auth(), payload: { name: 'Olive oil', minimumVolumeMl: 1000 } });
    expect(created.statusCode).toBe(201);
    const need = created.json();
    createdIds.push(need.id);
    expect(need.category).toBe('olive-oil');
    const response = await app.inject({ method: 'GET', url: `/needs/${need.id}/offers`, headers: auth() });
    expect(response.statusCode).toBe(200);
    expect(response.json().count).toBeGreaterThanOrEqual(5);
    const renamed = await app.inject({ method: 'PATCH', url: `/needs/${need.id}`, headers: auth(), payload: { name: 'Coffee' } });
    expect(renamed.json().category).toBe('coffee');
  });
});
