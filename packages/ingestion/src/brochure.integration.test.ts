import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@market/database';
import { matchingOffers } from '@market/evaluation';
import { approveBrochureReview, importBrochure, listPendingBrochureReviews, rejectBrochureReview } from './brochure.js';
import type { BrochureExtractionProvider } from './brochure-provider.js';

const fixturePath = new URL('../../../fixtures/carrefour-example.pdf', import.meta.url).pathname;
const expiredFixturePath = new URL('../../../fixtures/expired-example.png', import.meta.url).pathname;

async function cleanup() {
  const brochures = await prisma.brochure.findMany({ where: { OR: [
    { originalFilename: { in: ['carrefour-example.pdf', 'expired-example.png'] } },
    { sourceIdentifier: { contains: 'brochure-integration-' } },
  ] }, select: { id: true } });
  const brochureIds = brochures.map(item => item.id);
  const offers = await prisma.brochureOffer.findMany({ where: { brochureId: { in: brochureIds } },
    select: { id: true, observationId: true, promotionId: true } });
  const offerIds = offers.map(item => item.id);
  const observationIds = offers.map(item => item.observationId).filter((value): value is string => Boolean(value));
  const promotionIds = offers.map(item => item.promotionId).filter((value): value is string => Boolean(value));
  const reviewItems = await prisma.reviewItem.findMany({ where: { brochureOfferId: { in: offerIds } }, select: { id: true } });
  const reviewItemIds = reviewItems.map(item => item.id);
  const needs = await prisma.userNeed.findMany({ where: { title: { startsWith: 'Brochure integration ' } },
    select: { id: true } });
  const needIds = needs.map(item => item.id);
  await prisma.reviewEvent.deleteMany({ where: { reviewItemId: { in: reviewItemIds } } });
  await prisma.notification.deleteMany({ where: { OR: [
    { alert: { needId: { in: needIds } } }, { alert: { deal: { observationId: { in: observationIds } } } },
  ] } });
  await prisma.alert.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { deal: { observationId: { in: observationIds } } },
  ] } });
  await prisma.recommendation.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { deal: { observationId: { in: observationIds } } },
  ] } });
  await prisma.deal.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { observationId: { in: observationIds } },
  ] } });
  await prisma.userNeed.deleteMany({ where: { id: { in: needIds } } });
  await prisma.recommendation.deleteMany({ where: { deal: { observationId: { in: observationIds } } } });
  await prisma.deal.deleteMany({ where: { observationId: { in: observationIds } } });
  await prisma.priceObservation.deleteMany({ where: { id: { in: observationIds } } });
  await prisma.promotionCondition.deleteMany({ where: { promotionId: { in: promotionIds } } });
  await prisma.promotion.deleteMany({ where: { id: { in: promotionIds } } });
  await prisma.reviewItem.deleteMany({ where: { brochureOfferId: { in: offerIds } } });
  await prisma.brochureOffer.deleteMany({ where: { id: { in: offerIds } } });
  await prisma.extractionRun.deleteMany({ where: { brochureId: { in: brochureIds } } });
  await prisma.brochurePage.deleteMany({ where: { brochureId: { in: brochureIds } } });
  await prisma.brochure.deleteMany({ where: { id: { in: brochureIds } } });
  await prisma.priceHistory.deleteMany({ where: { retailerProduct: { externalId: { startsWith: 'brochure:normalized:' } } } });
  await prisma.retailerProduct.deleteMany({ where: { externalId: { startsWith: 'brochure:normalized:' } } });
}

const expiredProvider: BrochureExtractionProvider = {
  name: 'mock-expired',
  model: 'deterministic-expired',
  configVersion: 'phase9-expired-test',
  async extract() {
    return {
      retailer: 'CarrefourSA',
      validFrom: '2026-09-01T00:00:00.000Z',
      validTo: '2026-09-05T23:59:59.000Z',
      offers: [{ retailer: 'CarrefourSA', productName: 'Finish Quantum 72 tablets', brand: 'Finish',
        ean: '8690570568127', category: 'dishwasher-tablets', packageQuantity: 72, packageUnit: 'piece',
        packageCount: 1, currentPrice: '299.00', regularPrice: '410.00', promotionText: 'Expired brochure offer',
        loyaltyRequired: false, multiBuyText: null, validFrom: '2026-09-01T00:00:00.000Z',
        validTo: '2026-09-05T23:59:59.000Z', pageNumber: 1, sourceLocation: 'page 1', confidence: 0.99 }],
    };
  },
};

describe('brochure ingestion with PostgreSQL', () => {
  const suffix = randomUUID().slice(0, 8);
  let needId: string;
  let komiliVariantId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'demo@market.local' } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
    needId = (await prisma.userNeed.create({ data: { userId: user.id, categoryId: category.id,
      title: `Brochure integration ${suffix}`, constraints: { preferredBrands: ['Finish'], minimumCount: 40 },
      active: true } })).id;
    komiliVariantId = (await prisma.productVariant.findFirstOrThrow({ where: {
      product: { name: 'Komili Extra Virgin Olive Oil 1 L' },
    } })).id;
  });

  afterAll(async () => { await cleanup(); });

  it('imports offers, persists provenance, review items, promotions and duplicate handling', async () => {
    const result = await importBrochure(fixturePath, { sourceIdentifier: `brochure-integration-${suffix}` });
    expect(result).toMatchObject({ duplicateBrochure: false, processed: 6, accepted: 3, reviewRequired: 2,
      duplicateOffers: 1, failures: 0 });
    const run = await prisma.extractionRun.findUniqueOrThrow({ where: { id: result.extractionRunId! } });
    expect(run).toMatchObject({ provider: 'mock', processedCount: 6, successCount: 3, reviewCount: 2, duplicateCount: 1 });

    const finishOffer = await prisma.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Finish Quantum 72 tablets' }, include: { observation: true, promotion: true } });
    expect(finishOffer).toMatchObject({ reviewState: 'APPROVED', currentPriceMinor: 31900,
      regularPriceMinor: 41000, observationId: expect.any(String), promotionId: expect.any(String) });
    expect(finishOffer.observation).toMatchObject({ sourceType: 'BROCHURE', brochureOfferId: finishOffer.id,
      rawPayloadRef: expect.stringContaining(`offer:${finishOffer.id}`) });

    const normalizedOffer = await prisma.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Komili Extra Virgin Olive Oil 1 L' } });
    expect(normalizedOffer.reviewState).toBe('APPROVED');

    const loyaltyPromo = await prisma.promotion.findUniqueOrThrow({ where: { id: normalizedOffer.promotionId! },
      include: { conditions: true } });
    expect(loyaltyPromo).toMatchObject({ loyaltyRequired: true, promotionKind: 'LOYALTY_CARD_PRICE',
      rawText: 'Club card price' });
    expect(loyaltyPromo.conditions.some(condition => condition.kind === 'LOYALTY_CARD')).toBe(true);

    const coffeeOffer = await prisma.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Mehmet Efendi Turkish Coffee 100 g' }, include: { promotion: { include: { conditions: true } } } });
    expect(coffeeOffer.promotion?.conditions.some(condition => condition.kind === 'MULTI_BUY_TEXT')).toBe(true);

    const pending = (await listPendingBrochureReviews()).filter(item => item.brochureOffer.brochureId === result.brochureId);
    expect(pending.map(item => item.reason).sort()).toEqual(['MISSING_PACKAGE_SIZE', 'MISSING_PRICE']);
    const pages = await prisma.brochurePage.findMany({ where: { brochureId: result.brochureId } });
    expect(pages.every(page => page.imageRef?.startsWith('data:image/svg+xml'))).toBe(true);
    expect(pages.every(page => page.previewFormat === 'svg' && page.previewGeneratedAt)).toBe(true);
    await rejectBrochureReview(pending.find(item => item.reason === 'MISSING_PRICE')!.id);
    const approved = await approveBrochureReview(pending.find(item => item.reason === 'MISSING_PACKAGE_SIZE')!.id, komiliVariantId);
    expect(approved.observationId).toEqual(expect.any(String));

    const need = await prisma.userNeed.findUniqueOrThrow({ where: { id: needId },
      include: { category: { select: { slug: true, name: true } } } });
    const offers = await matchingOffers(need, { preferredBrands: ['Finish'], minimumCount: 40 });
    expect(offers.some(offer => offer.observationId === finishOffer.observationId)).toBe(true);

    const replay = await importBrochure(fixturePath, { sourceIdentifier: `brochure-integration-${suffix}` });
    expect(replay).toMatchObject({ duplicateBrochure: true, processed: 0 });
  });

  it('filters expired brochures before creating price observations', async () => {
    const result = await importBrochure(expiredFixturePath, { sourceIdentifier: `brochure-integration-expired-${suffix}`,
      provider: expiredProvider, now: new Date('2026-09-20T12:00:00.000Z') });
    expect(result).toMatchObject({ accepted: 0, reviewRequired: 0, failures: 1 });
    const offer = await prisma.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId } });
    expect(offer.reviewState).toBe('REJECTED');
    expect(await prisma.priceObservation.count({ where: { brochureOfferId: offer.id } })).toBe(0);
  });
});
