import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { database } from '@market/database';
import { ensureBrochurePagePreviews, importBrochure } from '@market/ingestion';
import { buildApp } from './app.js';
import { passwordHash } from './admin-auth.js';
import { sourceIngestionQueue } from './ops-queue.js';

const fixturePath = new URL('../../../fixtures/carrefour-example.pdf', import.meta.url).pathname;

async function cleanup() {
  const brochures = await database.brochure.findMany({ where: { originalFilename: 'carrefour-example.pdf' }, select: { id: true } });
  const brochureIds = brochures.map(item => item.id);
  const offers = await database.brochureOffer.findMany({ where: { brochureId: { in: brochureIds } },
    select: { id: true, observationId: true, promotionId: true } });
  const offerIds = offers.map(item => item.id);
  const observationIds = offers.map(item => item.observationId).filter((value): value is string => Boolean(value));
  const promotionIds = offers.map(item => item.promotionId).filter((value): value is string => Boolean(value));
  const reviewItems = await database.reviewItem.findMany({ where: { brochureOfferId: { in: offerIds } }, select: { id: true } });
  const reviewItemIds = reviewItems.map(item => item.id);
  await database.reviewEvent.deleteMany({ where: { reviewItemId: { in: reviewItemIds } } });
  await database.adminAuditLog.deleteMany({ where: { OR: [
    { entityId: { in: brochureIds } }, { entityId: { in: offerIds } },
    { entityId: { in: reviewItemIds } }, { entityId: { in: observationIds } },
  ] } });
  await database.notification.deleteMany({ where: { alert: { deal: { observationId: { in: observationIds } } } } });
  await database.alert.deleteMany({ where: { deal: { observationId: { in: observationIds } } } });
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

async function ensureAdminUsers() {
  await Promise.all([
    database.adminUser.upsert({ where: { email: 'viewer@market.local' }, update: { role: 'VIEWER', active: true,
      passwordHash: passwordHash('viewer-demo') }, create: { email: 'viewer@market.local', displayName: 'Viewer Demo',
      role: 'VIEWER', passwordHash: passwordHash('viewer-demo') } }),
    database.adminUser.upsert({ where: { email: 'reviewer@market.local' }, update: { role: 'REVIEWER', active: true,
      passwordHash: passwordHash('reviewer-demo') }, create: { email: 'reviewer@market.local', displayName: 'Reviewer Demo',
      role: 'REVIEWER', passwordHash: passwordHash('reviewer-demo') } }),
    database.adminUser.upsert({ where: { email: 'admin@market.local' }, update: { role: 'ADMIN', active: true,
      passwordHash: passwordHash('admin-demo') }, create: { email: 'admin@market.local', displayName: 'Admin Demo',
      role: 'ADMIN', passwordHash: passwordHash('admin-demo') } }),
  ]);
}

describe.sequential('admin dashboard API', () => {
  let app: FastifyInstance;
  let brochureId: string;
  let extractionRunId: string;
  let manualReviewId: string;
  let rejectReviewId: string;
  let komiliVariantId: string;
  let komiliProductId: string;
  let createdObservationId: string;
  let dataSourceId: string;
  let dataSourceJobId: string | undefined;
  let viewerToken: string;
  let reviewerToken: string;
  let adminToken: string;

  async function signIn(email: string, password: string) {
    const response = await app.inject({ method: 'POST', url: '/admin/auth/sign-in', payload: { email, password } });
    expect(response.statusCode).toBe(200);
    return response.json().token as string;
  }

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await cleanup();
    await ensureAdminUsers();
    const result = await importBrochure(fixturePath, { sourceAuthorizationStatus: 'UNVERIFIED',
      sourceIdentifier: 'admin-api-fixture', now: new Date('2026-09-25T12:00:00.000Z') });
    brochureId = result.brochureId;
    extractionRunId = result.extractionRunId!;
    const komiliVariant = await database.productVariant.findFirstOrThrow({ where: {
      product: { name: 'Komili Extra Virgin Olive Oil 1 L' },
    } });
    komiliVariantId = komiliVariant.id;
    komiliProductId = komiliVariant.productId;
    const dataSource = await database.dataSource.upsert({ where: { slug: 'admin-api-fixture-source' },
      update: { authorizationStatus: 'AUTHORIZED', enabled: true, operationalStatus: 'IDLE' },
      create: { slug: 'admin-api-fixture-source', name: 'Admin API fixture source',
        owner: 'integration test', connectorType: 'JSON', authorizationStatus: 'AUTHORIZED',
        onboardingStatus: 'APPROVED', enabled: true, scheduleEveryMs: 60_000, freshnessHours: 72, timeoutMs: 30_000,
        maxAttempts: 2, fictional: true, operationalStatus: 'IDLE',
        config: { localPath: new URL('../../../fixtures/poc-prices.json', import.meta.url).pathname } } });
    dataSourceId = dataSource.id;
    app = await buildApp();
    viewerToken = await signIn('viewer@market.local', 'viewer-demo');
    reviewerToken = await signIn('reviewer@market.local', 'reviewer-demo');
    adminToken = await signIn('admin@market.local', 'admin-demo');
  });

  afterAll(async () => {
    await cleanup();
    await database.adminSession.deleteMany({ where: { user: { email: { in: [
      'viewer@market.local', 'reviewer@market.local', 'admin@market.local',
    ] } } } });
    if (dataSourceJobId) {
      const queue = sourceIngestionQueue();
      await queue.getJob(dataSourceJobId).then(job => job?.remove()).catch(() => undefined);
      await queue.close();
    }
    await database.adminAuditLog.deleteMany({ where: { entityType: 'DataSource', entityId: dataSourceId } });
    await database.operationalAlert.deleteMany({ where: { dataSourceId } });
    await database.dataSourceApprovalEvent.deleteMany({ where: { dataSourceId } });
    await database.dataSource.deleteMany({ where: { id: dataSourceId } });
    await app.close();
  });

  it('requires authentication and permits viewer read-only access', async () => {
    const unauthenticated = await app.inject('/admin/dashboard');
    expect(unauthenticated.statusCode).toBe(401);

    const dashboard = await app.inject({ url: '/admin/dashboard', headers: auth(viewerToken) });
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json().counts.pendingReviewCount).toBeGreaterThanOrEqual(2);

    const forbidden = await app.inject({ method: 'POST', url: '/admin/reviews/not-real/reject',
      headers: auth(viewerToken), payload: { reason: 'viewer cannot mutate review decisions' } });
    expect(forbidden.statusCode).toBe(403);
  });

  it('returns dashboard counts, ingestion runs and source authorization state', async () => {
    const runs = await app.inject({ url: '/admin/ingestion-runs', headers: auth(viewerToken) });
    expect(runs.statusCode).toBe(200);
    expect(runs.json().extractionRuns.some((run: { id: string }) => run.id === extractionRunId)).toBe(true);

    const brochures = await app.inject({ url: '/admin/brochures', headers: auth(viewerToken) });
    expect(brochures.statusCode).toBe(200);
    const brochure = brochures.json().brochures.find((item: { id: string }) => item.id === brochureId);
    expect(brochure.sourceAuthorizationStatus).toBe('UNVERIFIED');
  });

  it('lists pending review items with candidates and source provenance', async () => {
    const response = await app.inject({ url: '/admin/reviews?status=PENDING', headers: auth(reviewerToken) });
    expect(response.statusCode).toBe(200);
    const items = response.json().reviewItems.filter((item: { brochureOffer: { brochureId: string } }) =>
      item.brochureOffer.brochureId === brochureId);
    expect(items).toHaveLength(2);
    const manual = items.find((item: { reason: string }) => item.reason === 'MISSING_PACKAGE_SIZE');
    const rejected = items.find((item: { reason: string }) => item.reason === 'MISSING_PRICE');
    expect(manual.candidateMatches.length).toBeGreaterThan(0);
    expect(manual.brochureOffer.page.pageNumber).toBe(2);
    manualReviewId = manual.id;
    rejectReviewId = rejected.id;
  });

  it('generates durable page previews for brochure review', async () => {
    const brochure = await database.brochure.findUniqueOrThrow({ where: { id: brochureId }, include: { pages: true } });
    expect(brochure.pages.every((page: { imageRef?: string }) => page.imageRef?.startsWith('data:image/svg+xml'))).toBe(true);
    expect(brochure.pages.every((page: { previewGeneratedAt?: Date }) => page.previewGeneratedAt)).toBe(true);
    const secondPass = await ensureBrochurePagePreviews(brochureId);
    expect(secondPass.created).toBe(0);
    expect(secondPass.skipped).toBeGreaterThan(0);
  });

  it('manual-matches and batch-rejects review items through validated admin mutations', async () => {
    const invalid = await app.inject({ method: 'POST', url: `/admin/reviews/${manualReviewId}/match`,
      headers: auth(reviewerToken), payload: {} });
    expect(invalid.statusCode).toBe(400);

    const matched = await app.inject({ method: 'POST', url: `/admin/reviews/${manualReviewId}/match`,
      headers: auth(reviewerToken), payload: { variantId: komiliVariantId } });
    expect(matched.statusCode).toBe(200);
    createdObservationId = matched.json().result.observationId;
    expect(await database.priceObservation.count({ where: { id: createdObservationId } })).toBe(1);

    const rejected = await app.inject({ method: 'POST', url: '/admin/reviews/batch', headers: auth(reviewerToken),
      payload: { action: 'REJECT', reviewItemIds: [rejectReviewId], reason: 'missing price in source preview', confirm: true } });
    expect(rejected.statusCode).toBe(200);
    expect(rejected.json().summary[0].status).toBe('REJECTED');
    const states = await database.reviewItem.findMany({ where: { id: { in: [manualReviewId, rejectReviewId] } },
      orderBy: { id: 'asc' } });
    expect(states.map(item => item.state).sort()).toEqual(['MATCHED', 'REJECTED']);
    expect(await database.reviewEvent.count({ where: { reviewItemId: { in: [manualReviewId, rejectReviewId] } } })).toBeGreaterThanOrEqual(4);
    expect(await database.adminAuditLog.count({ where: { entityId: { in: [manualReviewId, rejectReviewId] } } })).toBeGreaterThanOrEqual(2);
  });

  it('returns price provenance back to brochure page and extraction run', async () => {
    const response = await app.inject({ url: `/admin/prices/${createdObservationId}`, headers: auth(viewerToken) });
    expect(response.statusCode).toBe(200);
    const price = response.json().price;
    expect(price.sourceType).toBe('BROCHURE');
    expect(price.sourceAuthorizationStatus).toBe('UNVERIFIED');
    expect(price.brochureOffer.brochure.id).toBe(brochureId);
    expect(price.brochureOffer.page.pageNumber).toBe(2);
    expect(price.brochureOffer.extractionRunId).toBe(extractionRunId);
  });

  it('lets admins change source authorization with audit evidence', async () => {
    const response = await app.inject({ method: 'PUT', url: `/admin/brochures/${brochureId}/source-authorization`,
      headers: auth(adminToken), payload: { status: 'AUTHORIZED', sourceOwner: 'Carrefour',
        allowedUsage: 'internal price comparison proof of concept', verificationPolicy: 'manual approval required',
        reason: 'approved for internal proof of concept' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().brochure.sourceAuthorizationStatus).toBe('AUTHORIZED');
    const log = await database.adminAuditLog.findFirst({ where: { action: 'SOURCE_AUTHORIZATION_CHANGED',
      entityId: brochureId } });
    expect(log?.reason).toBe('approved for internal proof of concept');
  });

  it('exposes and protects data source operations', async () => {
    const listed = await app.inject({ url: '/admin/data-sources', headers: auth(viewerToken) });
    expect(listed.statusCode).toBe(200);
    const source = listed.json().dataSources.find((item: { id: string }) => item.id === dataSourceId);
    expect(source.authorizationStatus).toBe('AUTHORIZED');
    expect(source.onboardingStatus).toBe('APPROVED');
    expect(source.config).toBeUndefined();
    expect(source.configSummary.localPath).toContain('[fixture]');

    const forbidden = await app.inject({ method: 'POST', url: `/admin/data-sources/${dataSourceId}/pause`,
      headers: auth(viewerToken) });
    expect(forbidden.statusCode).toBe(403);

    const paused = await app.inject({ method: 'POST', url: `/admin/data-sources/${dataSourceId}/pause`,
      headers: auth(adminToken) });
    expect(paused.statusCode).toBe(200);
    expect(paused.json().dataSource.operationalStatus).toBe('PAUSED');

    const resumed = await app.inject({ method: 'POST', url: `/admin/data-sources/${dataSourceId}/resume`,
      headers: auth(adminToken) });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().dataSource.enabled).toBe(true);

    const updated = await app.inject({ method: 'PUT', url: `/admin/data-sources/${dataSourceId}`,
      headers: auth(adminToken), payload: { owner: 'Integration Owner', ownerContact: 'ops@example.test',
        permittedCommercialUse: true, allowedDataRetentionDays: 14,
        geographicCoverage: { country: 'TR', cities: ['Istanbul'] },
        credentialRequirements: 'fixture only', feedSpecificationUrl: 'https://example.test/feed-spec',
        feedSpecification: { format: 'json' }, onboardingStatus: 'READY_FOR_TEST',
        reason: 'ready for fixture test' } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().dataSource.ownerContact).toBe('ops@example.test');
    expect(await database.dataSourceApprovalEvent.count({ where: { dataSourceId,
      toStatus: 'READY_FOR_TEST' } })).toBe(1);

    const queued = await app.inject({ method: 'POST', url: `/admin/data-sources/${dataSourceId}/run`,
      headers: auth(adminToken) });
    expect(queued.statusCode).toBe(200);
    dataSourceJobId = queued.json().jobId;
    expect(dataSourceJobId).toBeTruthy();
    expect(await database.adminAuditLog.count({ where: { entityType: 'DataSource',
      entityId: dataSourceId } })).toBeGreaterThanOrEqual(3);
  });

  it('blocks destructive product deletion attempts and records the attempt', async () => {
    const response = await app.inject({ method: 'POST', url: `/admin/products/${komiliProductId}/destructive-delete`,
      headers: auth(adminToken), payload: { confirmation: 'delete product', reason: 'operator clicked delete during safety test' } });
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('DESTRUCTIVE_ACTION_BLOCKED');
    expect(await database.product.count({ where: { id: komiliProductId } })).toBe(1);
    expect(await database.adminAuditLog.count({ where: { action: 'DESTRUCTIVE_ACTION_BLOCKED',
      entityId: komiliProductId } })).toBeGreaterThanOrEqual(1);

    const auditLogs = await app.inject({ url: `/admin/audit-logs?entityId=${komiliProductId}`, headers: auth(adminToken) });
    expect(auditLogs.statusCode).toBe(200);
    expect(auditLogs.json().auditLogs.some((item: { action: string }) => item.action === 'DESTRUCTIVE_ACTION_BLOCKED')).toBe(true);
  });
});
