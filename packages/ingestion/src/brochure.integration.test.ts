import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database } from '@market/database';
import { matchingOffers } from '@market/evaluation';
import { approveBrochureReview, importBrochure, listPendingBrochureReviews, rejectBrochureReview } from './brochure.js';
import type { BrochureExtractionProvider } from './brochure-provider.js';

const fixturePath = new URL('../../../fixtures/carrefour-example.pdf', import.meta.url).pathname;
const expiredFixturePath = new URL('../../../fixtures/expired-example.png', import.meta.url).pathname;

async function cleanup() {
  const brochures = await database.brochure.findMany({ where: { OR: [
    { originalFilename: { in: ['carrefour-example.pdf', 'expired-example.png'] } },
    { sourceIdentifier: { contains: 'brochure-integration-' } },
  ] }, select: { id: true } });
  const brochureIds = brochures.map(item => item.id);
  const offers = await database.brochureOffer.findMany({ where: { brochureId: { in: brochureIds } },
    select: { id: true, observationId: true, promotionId: true } });
  const offerIds = offers.map(item => item.id);
  const observationIds = offers.map(item => item.observationId).filter((value): value is string => Boolean(value));
  const promotionIds = offers.map(item => item.promotionId).filter((value): value is string => Boolean(value));
  const reviewItems = await database.reviewItem.findMany({ where: { brochureOfferId: { in: offerIds } }, select: { id: true } });
  const reviewItemIds = reviewItems.map(item => item.id);
  const needs = await database.userNeed.findMany({ where: { title: { startsWith: 'Brochure integration ' } },
    select: { id: true } });
  const needIds = needs.map(item => item.id);
  await database.reviewEvent.deleteMany({ where: { reviewItemId: { in: reviewItemIds } } });
  await database.notification.deleteMany({ where: { OR: [
    { alert: { needId: { in: needIds } } }, { alert: { deal: { observationId: { in: observationIds } } } },
  ] } });
  await database.alert.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { deal: { observationId: { in: observationIds } } },
  ] } });
  await database.recommendation.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { deal: { observationId: { in: observationIds } } },
  ] } });
  await database.deal.deleteMany({ where: { OR: [
    { needId: { in: needIds } }, { observationId: { in: observationIds } },
  ] } });
  await database.userNeed.deleteMany({ where: { id: { in: needIds } } });
  await database.recommendation.deleteMany({ where: { deal: { observationId: { in: observationIds } } } });
  await database.deal.deleteMany({ where: { observationId: { in: observationIds } } });
  await database.priceObservation.deleteMany({ where: { id: { in: observationIds } } });
  await database.promotionCondition.deleteMany({ where: { promotionId: { in: promotionIds } } });
  await database.promotion.deleteMany({ where: { id: { in: promotionIds } } });
  await database.reviewItem.deleteMany({ where: { brochureOfferId: { in: offerIds } } });
  await database.brochureOffer.deleteMany({ where: { id: { in: offerIds } } });
  await database.extractionRun.deleteMany({ where: { brochureId: { in: brochureIds } } });
  await database.brochurePage.deleteMany({ where: { brochureId: { in: brochureIds } } });
  await database.brochure.deleteMany({ where: { id: { in: brochureIds } } });
  await database.priceHistory.deleteMany({ where: { retailerProduct: { externalId: { startsWith: 'brochure:normalized:' } } } });
  await database.retailerProduct.deleteMany({ where: { externalId: { startsWith: 'brochure:normalized:' } } });
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

describe('brochure ingestion with DynamoDB', () => {
  const suffix = randomUUID().slice(0, 8);
  let needId: string;
  let komiliVariantId: string;

  beforeAll(async () => {
    await cleanup();
    const user = await database.user.findUniqueOrThrow({ where: { email: 'demo@market.local' } });
    const category = await database.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
    needId = (await database.userNeed.create({ data: { userId: user.id, categoryId: category.id,
      title: `Brochure integration ${suffix}`, constraints: { preferredBrands: ['Finish'], minimumCount: 40 },
      active: true } })).id;
    komiliVariantId = (await database.productVariant.findFirstOrThrow({ where: {
      product: { name: 'Komili Extra Virgin Olive Oil 1 L' },
    } })).id;
  });

  afterAll(async () => { await cleanup(); });

  it('imports offers, persists provenance, review items, promotions and duplicate handling', async () => {
    const result = await importBrochure(fixturePath, { sourceIdentifier: `brochure-integration-${suffix}`,
      now: new Date('2026-09-25T12:00:00.000Z') });
    expect(result).toMatchObject({ duplicateBrochure: false, processed: 6, accepted: 3, reviewRequired: 2,
      duplicateOffers: 1, failures: 0 });
    const run = await database.extractionRun.findUniqueOrThrow({ where: { id: result.extractionRunId! } });
    expect(run).toMatchObject({ provider: 'mock', processedCount: 6, successCount: 3, reviewCount: 2, duplicateCount: 1 });

    const finishOffer = await database.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Finish Quantum 72 tablets' }, include: { observation: true, promotion: true } });
    expect(finishOffer).toMatchObject({ reviewState: 'APPROVED', currentPriceMinor: 31900,
      regularPriceMinor: 41000, observationId: expect.any(String), promotionId: expect.any(String) });
    expect(finishOffer.observation).toMatchObject({ sourceType: 'BROCHURE', brochureOfferId: finishOffer.id,
      rawPayloadRef: expect.stringContaining(`offer:${finishOffer.id}`) });

    const normalizedOffer = await database.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Komili Extra Virgin Olive Oil 1 L' } });
    expect(normalizedOffer.reviewState).toBe('APPROVED');

    const loyaltyPromo = await database.promotion.findUniqueOrThrow({ where: { id: normalizedOffer.promotionId! },
      include: { conditions: true } });
    expect(loyaltyPromo).toMatchObject({ loyaltyRequired: true, promotionKind: 'LOYALTY_CARD_PRICE',
      rawText: 'Club card price' });
    expect(loyaltyPromo.conditions.some((condition: { kind: string }) => condition.kind === 'LOYALTY_CARD')).toBe(true);

    const coffeeOffer = await database.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId,
      productName: 'Mehmet Efendi Turkish Coffee 100 g' }, include: { promotion: { include: { conditions: true } } } });
    expect(coffeeOffer.promotion?.conditions.some((condition: { kind: string }) => condition.kind === 'MULTI_BUY_TEXT')).toBe(true);

    const pending = (await listPendingBrochureReviews()).filter(item => item.brochureOffer.brochureId === result.brochureId);
    expect(pending.map(item => item.reason).sort()).toEqual(['MISSING_PACKAGE_SIZE', 'MISSING_PRICE']);
    const pages = await database.brochurePage.findMany({ where: { brochureId: result.brochureId } });
    expect(pages.every(page => page.imageRef?.startsWith('data:image/svg+xml'))).toBe(true);
    expect(pages.every(page => page.previewFormat === 'svg' && page.previewGeneratedAt)).toBe(true);
    await rejectBrochureReview(pending.find(item => item.reason === 'MISSING_PRICE')!.id);
    const approved = await approveBrochureReview(pending.find(item => item.reason === 'MISSING_PACKAGE_SIZE')!.id, komiliVariantId);
    expect(approved.observationId).toEqual(expect.any(String));

    const need = await database.userNeed.findUniqueOrThrow({ where: { id: needId },
      include: { category: { select: { slug: true, name: true } } } });
    const offers = await matchingOffers(need, { preferredBrands: ['Finish'], minimumCount: 40 });
    expect(offers.some(offer => offer.observationId === finishOffer.observationId)).toBe(true);

    const replay = await importBrochure(fixturePath, { sourceIdentifier: `brochure-integration-${suffix}`,
      now: new Date('2026-09-25T12:00:00.000Z') });
    expect(replay).toMatchObject({ duplicateBrochure: true, processed: 0 });
  });

  it('filters expired brochures before creating price observations', async () => {
    const result = await importBrochure(expiredFixturePath, { sourceIdentifier: `brochure-integration-expired-${suffix}`,
      provider: expiredProvider, now: new Date('2026-09-20T12:00:00.000Z') });
    expect(result).toMatchObject({ accepted: 0, reviewRequired: 0, failures: 1 });
    const offer = await database.brochureOffer.findFirstOrThrow({ where: { brochureId: result.brochureId } });
    expect(offer.reviewState).toBe('REJECTED');
    expect(await database.priceObservation.count({ where: { brochureOfferId: offer.id } })).toBe(0);
  });
});
