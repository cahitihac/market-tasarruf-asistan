import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { database } from '@market/database';
import { matchingOffers } from '@market/evaluation';
import { ingestPrices } from './ingest.js';
import type { PriceSourceConnector } from './connector.js';

describe('price file ingestion with DynamoDB', () => {
  const suffix = randomUUID().slice(0, 8);
  const sourceName = `ingestion-test-${suffix}`;
  const chainSlug = `ingest-test-${suffix}`;
  let chainId: string;
  let userId: string;
  let dishwasherCategoryId: string;
  let oliveCategoryId: string;
  const needIds: string[] = [];
  const now = new Date();
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString();
  const base = { retailer: chainSlug, branch: 'Test branch', productName: 'Finish Quantum 72 tablets',
    ean: '8690570568127', brand: 'Finish', category: 'dishwasher-tablets', packageQuantity: 72,
    packageUnit: 'piece', packageCount: 1, currentPrice: '279.00', regularPrice: '410.00',
    promotionText: 'Test promotion', validFrom: at(60), validTo: new Date(now.getTime() + 60 * 60_000).toISOString(), observedAt: at(10) };
  const rows = [base,
    { ...base, externalProductId: 'fairy', ean: undefined, productName: 'Fairy Platinum 60 tablets', brand: 'Fairy',
      packageQuantity: 60, currentPrice: '349.00', regularPrice: undefined, promotionText: undefined,
      validFrom: undefined, validTo: undefined, observedAt: at(9) },
    { ...base, externalProductId: 'unmatched', ean: undefined, productName: 'Unknown Cereal 200 g', brand: 'No Brand',
      category: 'cereal', packageQuantity: 200, packageUnit: 'g', currentPrice: '30.00',
      regularPrice: undefined, promotionText: undefined, validFrom: undefined, validTo: undefined, observedAt: at(8) },
    { ...base, externalProductId: 'stale', ean: undefined, productName: 'Komili Extra Virgin Olive Oil 1 L', brand: 'Komili',
      category: 'olive-oil', packageQuantity: 1000, packageUnit: 'ml', currentPrice: '399.00',
      regularPrice: undefined, promotionText: undefined, validFrom: undefined, validTo: undefined,
      observedAt: new Date(now.getTime() - 10 * 86_400_000).toISOString() },
    base,
    { ...base, ean: undefined, currentPrice: 'bad-price', observedAt: at(7) }];
  const connector = (data: unknown[], retrievedAt = new Date()): PriceSourceConnector => ({
    source: { type: 'JSON', name: sourceName, identifier: 'in-memory-integration-fixture',
      url: 'https://example.org/authorized-feed', checksum: 'test-checksum', retrievedAt },
    capabilities: { products: false, prices: true, promotions: false, branches: false },
    getPrices: async () => data,
  });
  beforeAll(async () => {
    const chain = await database.storeChain.create({ data: { slug: chainSlug, name: `Ingestion Test ${suffix}` } });
    chainId = chain.id;
    userId = (await database.user.findUniqueOrThrow({ where: { email: 'demo@market.local' } })).id;
    dishwasherCategoryId = (await database.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } })).id;
    oliveCategoryId = (await database.category.findUniqueOrThrow({ where: { slug: 'olive-oil' } })).id;
  });
  afterAll(async () => {
    const runs = await database.ingestionRun.findMany({ where: { source: sourceName }, select: { id: true } });
    const runIds = runs.map(run => run.id);
    const listings = chainId ? await database.retailerProduct.findMany({ where: { chainId }, select: { id: true } }) : [];
    const listingIds = listings.map(listing => listing.id);
    const observations = await database.priceObservation.findMany({ where: { retailerProductId: { in: listingIds } }, select: { id: true } });
    const observationIds = observations.map(observation => observation.id);
    await database.notification.deleteMany({ where: { alert: { deal: { OR: [
      { retailerProductId: { in: listingIds } }, { observationId: { in: observationIds } },
    ] } } } });
    await database.alert.deleteMany({ where: { deal: { OR: [
      { retailerProductId: { in: listingIds } }, { observationId: { in: observationIds } },
    ] } } });
    await database.recommendation.deleteMany({ where: { deal: { OR: [
      { retailerProductId: { in: listingIds } }, { observationId: { in: observationIds } },
    ] } } });
    await database.deal.deleteMany({ where: { OR: [
      { retailerProductId: { in: listingIds } }, { observationId: { in: observationIds } },
    ] } });
    await database.userNeed.deleteMany({ where: { id: { in: needIds } } });
    const reviewItems = await database.ingestionReviewItem.findMany({ where: { ingestionRow: { runId: { in: runIds } } },
      select: { id: true } });
    await database.ingestionReviewEvent.deleteMany({ where: { ingestionReviewItemId: { in: reviewItems.map(item => item.id) } } });
    await database.ingestionReviewItem.deleteMany({ where: { id: { in: reviewItems.map(item => item.id) } } });
    await database.ingestionRow.deleteMany({ where: { runId: { in: runIds } } });
    await database.priceObservation.deleteMany({ where: { retailerProductId: { in: listingIds } } });
    await database.priceHistory.deleteMany({ where: { retailerProductId: { in: listingIds } } });
    await database.promotion.deleteMany({ where: { retailerProductId: { in: listingIds } } });
    await database.retailerProduct.deleteMany({ where: { id: { in: listingIds } } });
    if (chainId) { await database.storeBranch.deleteMany({ where: { chainId } }); await database.storeChain.delete({ where: { id: chainId } }); }
    await database.ingestionRun.deleteMany({ where: { id: { in: runIds } } });
    await database.$disconnect();
  });
  it('records provenance, matches, unmatched rows, malformed rows, promotion and run statistics', async () => {
    const run = await ingestPrices(connector(rows));
    expect(run.status).toBe('PARTIAL');
    expect(run).toMatchObject({ processedCount: 6, rowCount: 6, matchedCount: 4, unmatchedCount: 1,
      failureCount: 1, observationsCreatedCount: 3, duplicatesSkippedCount: 1, promotionsCreatedCount: 1 });
    const outcomes = await database.ingestionRow.findMany({ where: { runId: run.id }, orderBy: { rowNumber: 'asc' } });
    expect(outcomes.map(item => item.status)).toEqual(['MATCHED', 'MATCHED', 'UNMATCHED', 'MATCHED', 'DUPLICATE', 'FAILED']);
    expect(outcomes[2]?.rawPayload).toBeTruthy();
    expect(outcomes[5]?.reason).toContain('currentPrice');
    const observation = await database.priceObservation.findUniqueOrThrow({ where: { id: outcomes[0]!.observationId! } });
    expect(observation).toMatchObject({ priceMinor: 27900, sourceName, sourceType: 'JSON',
      externalProductId: null, ingestionRunId: run.id, verificationStatus: 'SUPPLIED_UNVERIFIED' });
    expect(observation.rawPayloadRef).toBe('test-checksum:row:1');
    expect(observation.promotionId).toBeTruthy();
    expect(await database.priceHistory.count({ where: { retailerProductId: observation.retailerProductId } })).toBe(1);
    const need = await database.userNeed.create({ data: { userId, categoryId: dishwasherCategoryId,
      title: 'Dishwasher tablets', constraints: { preferredBrands: ['Finish'], minimumCount: 40 }, active: false },
      include: { category: { select: { slug: true, name: true } } } });
    needIds.push(need.id);
    expect((await matchingOffers(need, { preferredBrands: ['Finish'], minimumCount: 40 })).some(offer =>
      offer.observationId === observation.id)).toBe(true);
    const staleNeed = await database.userNeed.create({ data: { userId, categoryId: oliveCategoryId,
      title: 'Olive oil', constraints: {}, active: false }, include: { category: { select: { slug: true, name: true } } } });
    needIds.push(staleNeed.id);
    const staleListingId = outcomes[3]!.retailerProductId!;
    expect((await matchingOffers(staleNeed, {})).some(offer => offer.retailerProduct.id === staleListingId)).toBe(false);
  });
  it('skips all previously imported observations on replay', async () => {
    const countBefore = await database.priceObservation.count({ where: { retailerProduct: { chainId } } });
    const run = await ingestPrices(connector(rows));
    expect(run.observationsCreatedCount).toBe(0);
    expect(run.duplicatesSkippedCount).toBe(4);
    expect(run.unmatchedCount).toBe(1);
    expect(run.failureCount).toBe(1);
    expect(await database.priceObservation.count({ where: { retailerProduct: { chainId } } })).toBe(countBefore);
  });
  it('ignores a current observation whose promotion already expired', async () => {
    const expired = { ...base, observedAt: at(2), promotionText: 'Expired promotion',
      validFrom: at(60), validTo: at(3) };
    const run = await ingestPrices(connector([expired]));
    expect(run.status).toBe('SUCCEEDED');
    const need = await database.userNeed.findUniqueOrThrow({ where: { id: needIds[0]! },
      include: { category: { select: { slug: true, name: true } } } });
    const offers = await matchingOffers(need, { preferredBrands: ['Finish'], minimumCount: 40 });
    const listingId = (await database.ingestionRow.findFirstOrThrow({ where: { runId: run.id } })).retailerProductId;
    expect(offers.some(offer => offer.retailerProduct.id === listingId)).toBe(false);
  });
});
