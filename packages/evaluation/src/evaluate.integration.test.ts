import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@market/database';
import { evaluateAllActiveNeeds, evaluateNeed } from './evaluate.js';

describe('deal evaluation with PostgreSQL', () => {
  const ids: string[] = [];
  const title = `Evaluation integration ${Date.now()}`;
  let userId: string;
  let categoryId: string;
  beforeAll(async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'demo@market.local' } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
    userId = user.id; categoryId = category.id;
    const stale = await prisma.userNeed.findMany({ where: { userId, title: { startsWith: 'Evaluation integration ' } },
      select: { id: true } });
    const staleIds = stale.map(item => item.id);
    await prisma.notification.deleteMany({ where: { alert: { needId: { in: staleIds } } } });
    await prisma.alert.deleteMany({ where: { needId: { in: staleIds } } });
    await prisma.recommendation.deleteMany({ where: { needId: { in: staleIds } } });
    await prisma.deal.deleteMany({ where: { needId: { in: staleIds } } });
    await prisma.userNeed.deleteMany({ where: { id: { in: staleIds } } });
  });
  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { alert: { needId: { in: ids } } } });
    await prisma.alert.deleteMany({ where: { needId: { in: ids } } });
    await prisma.deal.deleteMany({ where: { needId: { in: ids } } });
    await prisma.userNeed.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });
  async function need(constraints: object) {
    const created = await prisma.userNeed.create({ data: { userId, categoryId, title, constraints },
      include: { category: { select: { slug: true, name: true } } } });
    ids.push(created.id);
    return created;
  }
  it('persists a GREAT_DEAL, alert and notification exactly once across repeat execution', async () => {
    const item = await need({ preferredBrands: ['Finish'], minimumCount: 40, allowAlternatives: false });
    const first = await evaluateNeed(item);
    expect(first.dealsCreated).toBeGreaterThan(0);
    expect(first.alertsCreated).toBeGreaterThanOrEqual(1);
    const deal = await prisma.deal.findFirstOrThrow({ where: { needId: item.id, retailerName: 'Migros',
      currentPriceMinor: 31900, productName: { contains: 'Finish Quantum' } } });
    expect(deal.label).toBe('GREAT_DEAL');
    expect(deal.status).toBe('ACTIVE');
    expect(deal.priceStatistics).toBeTruthy();
    const alert = await prisma.alert.findFirstOrThrow({ where: { dealId: deal.id } });
    const notification = await prisma.notification.findUniqueOrThrow({ where: { alertId: alert.id } });
    expect(notification.title).toContain('Finish Quantum');
    expect(notification.body).toContain("Migros'da 319 TL");
    const ordinary = await prisma.deal.findFirstOrThrow({ where: { needId: item.id, label: 'GOOD_PRICE' } });
    expect(await prisma.alert.count({ where: { dealId: ordinary.id } })).toBe(0);
    const second = await evaluateNeed(item);
    expect(second.dealsCreated).toBe(0);
    expect(second.alertsCreated).toBe(0);
    expect(second.notificationsCreated).toBe(0);
    expect(await prisma.alert.count({ where: { needId: item.id, dealId: deal.id } })).toBe(1);
    await prisma.userNeed.update({ where: { id: item.id }, data: { constraints: { minimumCount: 1000 } } });
    const changed = await prisma.userNeed.findUniqueOrThrow({ where: { id: item.id }, include: { category: { select: { slug: true, name: true } } } });
    const expired = await evaluateNeed(changed);
    expect(expired.dealsUpdated).toBeGreaterThan(0);
    expect((await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } })).status).toBe('EXPIRED');
  });
  it('evaluates multiple needs independently and ignores archived needs', async () => {
    const first = await need({ preferredBrands: ['Finish'], minimumCount: 40 });
    const second = await need({ preferredBrands: ['Fairy'], minimumCount: 40 });
    await prisma.userNeed.update({ where: { id: second.id }, data: { active: false } });
    const run = await evaluateAllActiveNeeds();
    expect(run.status).toBe('SUCCEEDED');
    expect(await prisma.deal.count({ where: { needId: first.id } })).toBeGreaterThan(0);
    expect(await prisma.deal.count({ where: { needId: second.id } })).toBe(0);
  });
  it('preserves an alerted snapshot when need criteria change', async () => {
    const original = await need({ preferredBrands: ['Finish'], minimumCount: 40 });
    await evaluateNeed(original);
    const oldDeal = await prisma.deal.findFirstOrThrow({ where: { needId: original.id, retailerName: 'Migros',
      currentPriceMinor: 31900 } });
    await prisma.userNeed.update({ where: { id: original.id }, data: { constraints: { preferredBrands: ['Finish'], minimumCount: 41 } } });
    const changed = await prisma.userNeed.findUniqueOrThrow({ where: { id: original.id },
      include: { category: { select: { slug: true, name: true } } } });
    await evaluateNeed(changed);
    const preserved = await prisma.deal.findUniqueOrThrow({ where: { id: oldDeal.id } });
    expect(preserved.status).toBe('SUPERSEDED');
    expect(preserved.snapshotKey).toBe(oldDeal.snapshotKey);
    expect(preserved.reasons).toEqual(oldDeal.reasons);
    expect(await prisma.deal.count({ where: { needId: original.id, status: 'ACTIVE', retailerName: 'Migros',
      currentPriceMinor: 31900 } })).toBe(1);
  });
  it('records a failed need while committing other needs', async () => {
    const valid = await need({ preferredBrands: ['Finish'], minimumCount: 40 });
    const invalid = await need({ minimumCount: 'invalid' });
    const run = await evaluateAllActiveNeeds();
    expect(run.status).toBe('PARTIAL');
    expect(run.failureCount).toBeGreaterThanOrEqual(1);
    expect(await prisma.deal.count({ where: { needId: valid.id } })).toBeGreaterThan(0);
    await prisma.userNeed.update({ where: { id: invalid.id }, data: { active: false } });
  });
});
