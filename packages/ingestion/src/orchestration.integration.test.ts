import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@market/database';
import { matchingOffers } from '@market/evaluation';
import { approveIngestionReview } from './ingestion-review.js';
import { drainMockOperationalAlerts, upsertOperationalAlert } from './operational-alerts.js';
import { IngestionSkippedError, affectedNeedIdsForRun, inspectSourceFreshness, runRegisteredSource } from './orchestration.js';

const fixturePath = new URL('../../../fixtures/poc-prices.json', import.meta.url).pathname;
const anomalyPath = new URL('../../../fixtures/anomaly-prices.json', import.meta.url).pathname;

describe.sequential('scheduled source orchestration', () => {
  const suffix = randomUUID().slice(0, 8);
  const sourceSlug = `orchestration-${suffix}`;
  const anomalySlug = `orchestration-anomaly-${suffix}`;
  const sourceIds: string[] = [];

  async function createSource(slug: string, localPath: string, overrides = {}) {
    const source = await prisma.dataSource.create({ data: {
      slug, name: slug, owner: 'integration test', connectorType: 'JSON',
      authorizationStatus: 'AUTHORIZED', onboardingStatus: 'APPROVED',
      enabled: true, scheduleEveryMs: 10_000,
      freshnessHours: 240, timeoutMs: 30_000, maxAttempts: 2, fictional: true,
      operationalStatus: 'IDLE', config: { localPath, sourceUrl: `fixture://${slug}` },
      ...overrides,
    } });
    sourceIds.push(source.id);
    return source;
  }

  afterAll(async () => {
    const runs = await prisma.ingestionRun.findMany({ where: { dataSourceId: { in: sourceIds } }, select: { id: true } });
    const runIds = runs.map(run => run.id);
    const observations = await prisma.priceObservation.findMany({ where: { ingestionRunId: { in: runIds } },
      select: { id: true, promotionId: true, retailerProductId: true } });
    const observationIds = observations.map(item => item.id);
    const promotionIds = observations.map(item => item.promotionId).filter((value): value is string => Boolean(value));
    await prisma.notification.deleteMany({ where: { alert: { deal: { observationId: { in: observationIds } } } } });
    await prisma.alert.deleteMany({ where: { deal: { observationId: { in: observationIds } } } });
    await prisma.recommendation.deleteMany({ where: { deal: { observationId: { in: observationIds } } } });
    await prisma.deal.deleteMany({ where: { observationId: { in: observationIds } } });
    const reviewItems = await prisma.ingestionReviewItem.findMany({ where: { ingestionRow: { runId: { in: runIds } } },
      select: { id: true } });
    await prisma.ingestionReviewEvent.deleteMany({ where: { ingestionReviewItemId: { in: reviewItems.map(item => item.id) } } });
    await prisma.ingestionReviewItem.deleteMany({ where: { id: { in: reviewItems.map(item => item.id) } } });
    await prisma.ingestionRow.deleteMany({ where: { runId: { in: runIds } } });
    await prisma.priceObservation.deleteMany({ where: { id: { in: observationIds } } });
    await prisma.priceHistory.deleteMany({ where: { retailerProductId: { in: observations.map(item => item.retailerProductId) } } });
    await prisma.promotion.deleteMany({ where: { id: { in: promotionIds } } });
    await prisma.ingestionRun.deleteMany({ where: { id: { in: runIds } } });
    await prisma.operationalAlert.deleteMany({ where: { OR: [
      { dataSourceId: { in: sourceIds } }, { dedupeKey: `phase16:${sourceSlug}:dedupe` },
    ] } });
    await prisma.dataSourceApprovalEvent.deleteMany({ where: { dataSourceId: { in: sourceIds } } });
    await prisma.dataSource.deleteMany({ where: { id: { in: sourceIds } } });
    await prisma.$disconnect();
  });

  it('runs an authorized local fixture source, records source state and targets affected needs', async () => {
    const source = await createSource(sourceSlug, fixturePath);
    const result = await runRegisteredSource(source.id, { trigger: 'DEVELOPMENT', jobId: 'test-job-1' });
    expect(result.run.dataSourceId).toBe(source.id);
    expect(result.run.status).toBe('PARTIAL');
    expect(result.run.observationsCreatedCount).toBeGreaterThan(0);
    expect(result.affectedNeedIds).toContain('consumer1-dishwasher-tablets');
    expect(result.affectedNeedIds).not.toContain('consumer2-olive-oil');
    const observation = await prisma.priceObservation.findFirstOrThrow({ where: { ingestionRunId: result.run.id } });
    expect(observation.verificationStatus).toBe('DEMO');
    expect(await affectedNeedIdsForRun(result.run.id)).toEqual(result.affectedNeedIds);
    const freshness = await inspectSourceFreshness(source.id);
    expect(freshness.freshObservations).toBeGreaterThan(0);
    const updated = await prisma.dataSource.findUniqueOrThrow({ where: { id: source.id } });
    expect(updated.lastRunId).toBe(result.run.id);
    expect(updated.lastSuccessfulRunAt).toBeTruthy();
  });

  it('replays without duplicate observations or promotions', async () => {
    const source = await prisma.dataSource.findUniqueOrThrow({ where: { slug: sourceSlug } });
    const before = await prisma.priceObservation.count({ where: { ingestionRun: { dataSourceId: source.id } } });
    const result = await runRegisteredSource(source.id, { trigger: 'DEVELOPMENT', jobId: 'test-job-2' });
    expect(result.run.observationsCreatedCount).toBe(0);
    expect(result.run.duplicatesSkippedCount).toBeGreaterThan(0);
    expect(await prisma.priceObservation.count({ where: { ingestionRun: { dataSourceId: source.id } } })).toBe(before);
  });

  it('prevents disabled, unauthorized and overlapping runs', async () => {
    const source = await prisma.dataSource.findUniqueOrThrow({ where: { slug: sourceSlug } });
    await prisma.dataSource.update({ where: { id: source.id }, data: { enabled: false } });
    await expect(runRegisteredSource(source.id, { trigger: 'DEVELOPMENT' })).rejects.toMatchObject({ code: 'SOURCE_DISABLED' });
    await prisma.dataSource.update({ where: { id: source.id }, data: { enabled: true,
      authorizationStatus: 'UNVERIFIED' } });
    await expect(runRegisteredSource(source.id, { trigger: 'SCHEDULED' })).rejects.toMatchObject({ code: 'SOURCE_NOT_AUTHORIZED' });
    await prisma.dataSource.update({ where: { id: source.id }, data: { authorizationStatus: 'AUTHORIZED',
      operationalStatus: 'RUNNING', lastRunAt: new Date() } });
    await expect(runRegisteredSource(source.id, { trigger: 'DEVELOPMENT' })).rejects.toBeInstanceOf(IngestionSkippedError);
    const alert = await prisma.operationalAlert.findUnique({ where: { dedupeKey: `source:${source.id}:overlap` } });
    expect(alert?.status).toBe('OPEN');
  });

  it('routes anomalous records to failed ingestion rows without creating trustworthy offers', async () => {
    const source = await createSource(anomalySlug, anomalyPath);
    const result = await runRegisteredSource(source.id, { trigger: 'DEVELOPMENT', jobId: 'test-anomaly' });
    expect(result.run.status).toBe('FAILED');
    expect(result.run.failureCount).toBe(2);
    expect(result.run.observationsCreatedCount).toBe(0);
    const rows = await prisma.ingestionRow.findMany({ where: { runId: result.run.id }, orderBy: { rowNumber: 'asc' } });
    expect(rows.map(row => row.status)).toEqual(['FAILED', 'FAILED']);
    expect(rows.map(row => row.reason).join(' ')).toContain('requires review');
    expect(await prisma.ingestionReviewItem.count({ where: { ingestionRow: { runId: result.run.id } } })).toBe(2);
    const need = await prisma.userNeed.findUniqueOrThrow({ where: { id: 'consumer1-dishwasher-tablets' },
      include: { category: { select: { slug: true, name: true } } } });
    expect((await matchingOffers(need, { preferredBrands: ['Finish'], minimumCount: 40 })).some(offer =>
      offer.retailerProduct.externalId.includes('ANOMALY'))).toBe(false);
  });

  it('approves a corrected anomalous record through the review queue', async () => {
    const source = await prisma.dataSource.findUniqueOrThrow({ where: { slug: anomalySlug } });
    const review = await prisma.ingestionReviewItem.findFirstOrThrow({ where: {
      ingestionRow: { run: { dataSourceId: source.id }, rowNumber: 1 },
      state: 'PENDING',
    } });
    const variant = await prisma.productVariant.findFirstOrThrow({ where: {
      product: { name: 'Finish Quantum 72 tablets' },
    } });
    const result = await approveIngestionReview({ reviewItemId: review.id, variantId: variant.id,
      correctedValues: { currency: 'TRY' }, note: 'fixture correction during integration test' });
    expect(result.run.observationsCreatedCount).toBe(1);
    const updated = await prisma.ingestionReviewItem.findUniqueOrThrow({ where: { id: review.id } });
    expect(updated.state).toBe('MATCHED');
    expect(await prisma.ingestionReviewEvent.count({ where: { ingestionReviewItemId: review.id } })).toBeGreaterThan(0);
  });

  it('deduplicates external operational alerts', async () => {
    const previousProvider = process.env.OPS_ALERT_PROVIDER;
    const previousInterval = process.env.OPS_ALERT_MIN_INTERVAL_MINUTES;
    process.env.OPS_ALERT_PROVIDER = 'mock';
    process.env.OPS_ALERT_MIN_INTERVAL_MINUTES = '60';
    drainMockOperationalAlerts();
    await upsertOperationalAlert({ key: `phase16:${sourceSlug}:dedupe`, kind: 'TEST_ALERT',
      title: 'Test alert', message: 'No secrets here', severity: 'WARNING' });
    await upsertOperationalAlert({ key: `phase16:${sourceSlug}:dedupe`, kind: 'TEST_ALERT',
      title: 'Test alert', message: 'No secrets here', severity: 'WARNING' });
    const delivered = drainMockOperationalAlerts();
    expect(delivered).toHaveLength(1);
    expect(delivered[0]?.message).toBe('No secrets here');
    process.env.OPS_ALERT_PROVIDER = previousProvider;
    process.env.OPS_ALERT_MIN_INTERVAL_MINUTES = previousInterval;
  });
});
