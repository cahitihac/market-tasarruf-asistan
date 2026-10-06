import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '@market/config';
import { Database, database } from '@market/database';
import { approveBrochureReview, approveIngestionReview, inspectSourceFreshness, refreshSourceHealth,
  rejectBrochureReview, rejectIngestionReview } from '@market/ingestion';
import { auditLog, authenticateAdmin, requireAdmin, signInAdmin, type AdminRequest } from './admin-auth.js';
import { ingestionJobName, serverlessQueueSnapshot, sourceIngestionQueue } from './ops-queue.js';

const matchSchema = z.object({ variantId: z.string().min(1) });
const approveSchema = z.object({ variantId: z.string().min(1).optional() }).default({});
const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const reasonSchema = z.object({ reason: z.string().trim().min(3) });
const batchSchema = z.object({ action: z.enum(['REJECT', 'APPROVE_PROPOSED']),
  reviewItemIds: z.array(z.string().min(1)).min(1).max(50), reason: z.string().trim().min(3), confirm: z.literal(true) });
const sourceAuthorizationSchema = z.object({
  status: z.enum(['AUTHORIZED', 'PUBLIC_DATA', 'MANUAL_UPLOAD', 'UNVERIFIED', 'RESTRICTED']),
  sourceOwner: z.string().trim().optional(),
  allowedUsage: z.string().trim().optional(),
  verificationPolicy: z.string().trim().optional(),
  sourceNotes: z.string().trim().optional(),
  sourceEffectiveFrom: z.string().datetime({ offset: true }).optional(),
  sourceEffectiveTo: z.string().datetime({ offset: true }).optional(),
  reason: z.string().trim().min(3),
});
const destructiveAttemptSchema = z.object({ confirmation: z.string().trim().min(1), reason: z.string().trim().min(3) });
const dataSourceUpdateSchema = z.object({
  owner: z.string().trim().optional(),
  ownerContact: z.string().trim().optional(),
  authorizationStatus: z.enum(['AUTHORIZED', 'PUBLIC_DATA', 'MANUAL_UPLOAD', 'UNVERIFIED', 'RESTRICTED']).optional(),
  permittedCommercialUse: z.boolean().optional(),
  allowedDataRetentionDays: z.number().int().positive().nullable().optional(),
  geographicCoverage: z.record(z.unknown()).optional(),
  credentialRequirements: z.string().trim().optional(),
  feedSpecificationUrl: z.string().url().nullable().optional(),
  feedSpecification: z.record(z.unknown()).optional(),
  onboardingStatus: z.enum(['PROPOSED', 'DOCUMENTATION_PENDING', 'AUTHORIZATION_PENDING', 'TECHNICAL_REVIEW',
    'READY_FOR_TEST', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  enabled: z.boolean().optional(),
  scheduleEveryMs: z.number().int().positive().nullable().optional(),
  freshnessHours: z.number().int().positive().optional(),
  rateLimitPerMinute: z.number().int().positive().nullable().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  reason: z.string().trim().min(3),
});
const ingestionReviewApproveSchema = z.object({
  variantId: z.string().min(1).optional(),
  correctedValues: z.record(z.unknown()).optional(),
  note: z.string().trim().optional(),
});

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: error.issues.map(issue => ({
    path: issue.path.join('.'), message: issue.message,
  })) });
}

function sourceAuthorizationFor(sourceType: string, brochure?: { sourceAuthorizationStatus: string } | null) {
  if (brochure) return brochure.sourceAuthorizationStatus;
  if (sourceType === 'DEMO_SEED') return 'UNVERIFIED';
  if (sourceType === 'OPEN_PRICES') return 'PUBLIC_DATA';
  if (sourceType === 'CSV' || sourceType === 'JSON') return 'MANUAL_UPLOAD';
  return 'UNVERIFIED';
}

function todayStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function redactSource(source: Database.DataSourceGetPayload<{ include: { ingestionRuns: true; operationalAlerts: true;
  approvalEvents: { include: { actor: { select: { email: true; displayName: true; role: true } } } } } }>) {
  const config = source.config && typeof source.config === 'object' && !Array.isArray(source.config)
    ? source.config as Record<string, unknown> : {};
  return {
    ...source,
    config: undefined,
    configSummary: {
      localPath: typeof config.localPath === 'string' ? config.localPath.replace(/[^/]+$/, '[fixture]') : undefined,
      maxRecords: typeof config.maxRecords === 'number' ? config.maxRecords : undefined,
      hasSourceUrl: typeof config.sourceUrl === 'string',
      hasCredentialRef: typeof config.credentialEnv === 'string' || typeof config.credentialsEnv === 'string',
    },
  };
}

function sourceCanRun(source: { authorizationStatus?: string; onboardingStatus?: string; permittedCommercialUse?: boolean; fictional?: boolean }) {
  return (source.authorizationStatus === 'AUTHORIZED' || source.authorizationStatus === 'PUBLIC_DATA') &&
    (source.fictional || (source.onboardingStatus === 'APPROVED' && source.permittedCommercialUse));
}

async function queueSnapshot() {
  const config = loadConfig();
  if (config.JOB_BACKEND === 'sqs' && config.INGESTION_QUEUE_URL) {
    return serverlessQueueSnapshot(config.INGESTION_QUEUE_URL);
  }
  const queue = sourceIngestionQueue();
  try {
    const [failed, delayed, waiting, active] = await Promise.all([
      queue.getFailed(0, 20), queue.getDelayed(0, 20), queue.getWaiting(0, 20), queue.getActive(0, 20),
    ]);
    return {
      counts: { failed: failed.length, delayed: delayed.length, waiting: waiting.length, active: active.length },
      failed: failed.map(job => ({ id: job.id, name: job.name, sourceId: job.data?.sourceId,
        attemptsMade: job.attemptsMade, failedReason: job.failedReason, timestamp: job.timestamp })),
      delayed: delayed.map(job => ({ id: job.id, name: job.name, sourceId: job.data?.sourceId,
        attemptsMade: job.attemptsMade, timestamp: job.timestamp, delay: job.delay })),
    };
  } finally { await queue.close(); }
}

const reviewInclude = {
  brochureOffer: {
    include: {
      brochure: { include: { chain: true } },
      page: true,
      observation: true,
      promotion: { include: { conditions: true } },
      retailerProduct: { include: { variant: { include: { product: { include: { brand: true, category: true } } } } } },
    },
  },
  extractionRun: true,
  events: { include: { actor: { select: { email: true, displayName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
} as const;

const ingestionReviewInclude = {
  ingestionRow: { include: { run: { include: { dataSource: true } },
    retailerProduct: { include: { chain: true, variant: { include: { product: { include: { brand: true, category: true } } } } } },
    observation: true } },
  events: { include: { actor: { select: { email: true, displayName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
} as const;

const priceInclude = {
  retailerProduct: { include: { chain: true, variant: { include: { product: { include: { brand: true, category: true } } } } } },
  branch: true,
  ingestionRun: true,
  brochureOffer: { include: { page: true, brochure: { include: { chain: true } }, extractionRun: true } },
  promotion: { include: { conditions: true } },
} as const;

export async function registerAdminRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/admin') || request.method === 'OPTIONS' || request.url === '/admin/auth/sign-in') return;
    const user = await authenticateAdmin(request);
    if (!user) return reply.code(401).send({ error: 'ADMIN_AUTH_REQUIRED' });
    (request as AdminRequest).adminUser = user;
  });

  app.post('/admin/auth/sign-in', async (request, reply) => {
    const parsed = signInSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const result = await signInAdmin(parsed.data.email, parsed.data.password);
    if (!result) return reply.code(401).send({ error: 'INVALID_ADMIN_CREDENTIALS' });
    await auditLog({ actorId: result.user.id, action: 'ADMIN_SIGNED_IN', entityType: 'AdminUser',
      entityId: result.user.id, after: { email: result.user.email, role: result.user.role }, requestId: request.id });
    return result;
  });

  app.get('/admin/auth/me', async request => ({ user: (request as AdminRequest).adminUser }));

  app.get('/admin/dashboard', async () => {
    const freshnessCutoff = new Date(Date.now() - loadConfig().PRICE_FRESHNESS_HOURS * 60 * 60 * 1000);
    const [pendingReviewCount, failedIngestionRuns, failedExtractionRuns, unmatchedProducts, recentBrochures,
      pricesImportedToday, promotionsCreated, recentAlerts, staleDataCount] = await Promise.all([
      database.reviewItem.count({ where: { state: 'PENDING' } }),
      database.ingestionRun.count({ where: { status: 'FAILED' } }),
      database.extractionRun.count({ where: { status: 'FAILED' } }),
      database.retailerProduct.count({ where: { OR: [{ variantId: null }, { reviewState: { in: ['UNMATCHED', 'NEEDS_REVIEW'] } }] } }),
      database.brochure.findMany({ take: 6, include: { chain: true }, orderBy: { importedAt: 'desc' } }),
      database.priceObservation.count({ where: { retrievedAt: { gte: todayStart() } } }),
      database.promotion.count(),
      database.alert.findMany({ take: 8, include: { deal: true, notification: true }, orderBy: { createdAt: 'desc' } }),
      database.retailerProduct.count({ where: { observations: { none: { observedAt: { gte: freshnessCutoff } } } } }),
    ]);
    return { counts: { pendingReviewCount, failedIngestionRuns: failedIngestionRuns + failedExtractionRuns,
      unmatchedProducts, pricesImportedToday, promotionsCreated, staleDataCount },
    recentBrochures, recentAlerts };
  });

  app.get('/admin/data-sources', async () => {
    const [sources, queue] = await Promise.all([
      database.dataSource.findMany({ include: {
        ingestionRuns: { take: 5, orderBy: { startedAt: 'desc' } },
        operationalAlerts: { where: { status: 'OPEN' }, orderBy: { lastSeenAt: 'desc' }, take: 5 },
        approvalEvents: { include: { actor: { select: { email: true, displayName: true, role: true } } },
          orderBy: { createdAt: 'desc' }, take: 10 },
      }, orderBy: { name: 'asc' } }),
      queueSnapshot(),
    ]);
    const freshness = await Promise.all(sources.map(source => inspectSourceFreshness(source.id)
      .catch(() => ({ freshObservations: 0, staleObservations: 0, expiredPromotions: 0,
        unmatchedRows: 0, freshnessCutoff: null }))));
    return { dataSources: sources.map((source, index) => ({ ...redactSource(source), freshness: freshness[index] })),
      queue };
  });

  app.get('/admin/operations', async () => {
    const [queue, alerts, reviewBacklog] = await Promise.all([
      queueSnapshot(),
      database.operationalAlert.findMany({ where: { status: 'OPEN' }, include: { dataSource: true },
        orderBy: [{ severity: 'desc' }, { lastSeenAt: 'desc' }], take: 100 }),
      database.reviewItem.count({ where: { state: 'PENDING' } }),
    ]);
    if (reviewBacklog > 25) {
      await database.operationalAlert.upsert({ where: { dedupeKey: 'review-backlog:persistent' },
        update: { status: 'OPEN', lastSeenAt: new Date(), message: `${reviewBacklog} records are awaiting review.`,
          resolvedAt: null },
        create: { dedupeKey: 'review-backlog:persistent', kind: 'REVIEW_BACKLOG', severity: 'WARNING',
          title: 'Review backlog is growing', message: `${reviewBacklog} records are awaiting review.` } });
    }
    return { alerts, queue, reviewBacklog };
  });

  app.put<{ Params: { id: string } }>('/admin/data-sources/:id', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const parsed = dataSourceUpdateSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const before = await database.dataSource.findUnique({ where: { id: request.params.id } });
    if (!before) return reply.code(404).send({ error: 'DATA_SOURCE_NOT_FOUND' });
    const merged = { ...before, ...parsed.data };
    if (parsed.data.enabled === true && !sourceCanRun(merged)) return reply.code(409).send({ error: 'DATA_SOURCE_NOT_APPROVED',
      message: 'Source must be authorized and either fictional or approved for permitted commercial use before it can be enabled.' });
    const after = await database.dataSource.update({ where: { id: request.params.id }, data: {
      owner: parsed.data.owner,
      ownerContact: parsed.data.ownerContact,
      authorizationStatus: parsed.data.authorizationStatus,
      permittedCommercialUse: parsed.data.permittedCommercialUse,
      allowedDataRetentionDays: parsed.data.allowedDataRetentionDays,
      geographicCoverage: parsed.data.geographicCoverage as Database.InputJsonValue | undefined,
      credentialRequirements: parsed.data.credentialRequirements,
      feedSpecificationUrl: parsed.data.feedSpecificationUrl,
      feedSpecification: parsed.data.feedSpecification as Database.InputJsonValue | undefined,
      onboardingStatus: parsed.data.onboardingStatus,
      enabled: parsed.data.enabled,
      scheduleEveryMs: parsed.data.scheduleEveryMs,
      freshnessHours: parsed.data.freshnessHours,
      rateLimitPerMinute: parsed.data.rateLimitPerMinute,
      timeoutMs: parsed.data.timeoutMs,
      maxAttempts: parsed.data.maxAttempts,
      operationalStatus: parsed.data.enabled === false ? 'DISABLED' : undefined,
    } });
    await refreshSourceHealth(after.id).catch(() => undefined);
    if (parsed.data.onboardingStatus && parsed.data.onboardingStatus !== before.onboardingStatus) {
      await database.dataSourceApprovalEvent.create({ data: { dataSourceId: before.id, actorId: actor.id,
        fromStatus: before.onboardingStatus, toStatus: parsed.data.onboardingStatus,
        authorizationStatus: parsed.data.authorizationStatus ?? after.authorizationStatus,
        note: parsed.data.reason, metadata: { permittedCommercialUse: after.permittedCommercialUse } } });
    }
    await auditLog({ actorId: actor.id, action: 'DATA_SOURCE_UPDATED', entityType: 'DataSource',
      entityId: before.id, before, after, reason: parsed.data.reason, requestId: request.id });
    return { dataSource: after };
  });

  app.post<{ Params: { id: string } }>('/admin/data-sources/:id/run', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const source = await database.dataSource.findUnique({ where: { id: request.params.id } });
    if (!source) return reply.code(404).send({ error: 'DATA_SOURCE_NOT_FOUND' });
    if (!sourceCanRun(source)) return reply.code(409).send({ error: 'DATA_SOURCE_NOT_APPROVED' });
    const queue = sourceIngestionQueue();
    try {
      const job = await queue.add(ingestionJobName, { sourceId: source.id, trigger: 'MANUAL' }, {
        jobId: `manual:${source.id}:${Date.now()}`, attempts: source.maxAttempts,
        backoff: { type: 'exponential', delay: 5000 },
      });
      await auditLog({ actorId: actor.id, action: 'DATA_SOURCE_MANUAL_RUN_QUEUED', entityType: 'DataSource',
        entityId: source.id, after: { jobId: job.id }, requestId: request.id });
      return { jobId: job.id };
    } finally { await queue.close(); }
  });

  app.post<{ Params: { id: string } }>('/admin/data-sources/:id/pause', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const before = await database.dataSource.findUnique({ where: { id: request.params.id } });
    if (!before) return reply.code(404).send({ error: 'DATA_SOURCE_NOT_FOUND' });
    const after = await database.dataSource.update({ where: { id: request.params.id },
      data: { enabled: false, operationalStatus: 'PAUSED' } });
    await auditLog({ actorId: actor.id, action: 'DATA_SOURCE_PAUSED', entityType: 'DataSource',
      entityId: before.id, before, after, requestId: request.id });
    return { dataSource: after };
  });

  app.post<{ Params: { id: string } }>('/admin/data-sources/:id/resume', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const before = await database.dataSource.findUnique({ where: { id: request.params.id } });
    if (!before) return reply.code(404).send({ error: 'DATA_SOURCE_NOT_FOUND' });
    if (!sourceCanRun(before)) return reply.code(409).send({ error: 'DATA_SOURCE_NOT_APPROVED' });
    const after = await database.dataSource.update({ where: { id: request.params.id },
      data: { enabled: true, operationalStatus: 'IDLE' } });
    await refreshSourceHealth(after.id).catch(() => undefined);
    await auditLog({ actorId: actor.id, action: 'DATA_SOURCE_RESUMED', entityType: 'DataSource',
      entityId: before.id, before, after, requestId: request.id });
    return { dataSource: after };
  });

  app.get<{ Querystring: { source?: string; status?: string; date?: string } }>('/admin/ingestion-runs', async request => ({
    ingestionRuns: await database.ingestionRun.findMany({ where: {
      ...(request.query.source ? { source: { contains: request.query.source, mode: 'insensitive' as const } } : {}),
      ...(request.query.status ? { status: request.query.status as Database.EnumRunStatusFilter['equals'] } : {}),
      ...(request.query.date ? { startedAt: { gte: new Date(`${request.query.date}T00:00:00.000Z`),
        lt: new Date(`${request.query.date}T23:59:59.999Z`) } } : {}),
    }, include: { rows: { take: 25, orderBy: { rowNumber: 'asc' } } }, orderBy: { startedAt: 'desc' }, take: 100 }),
    extractionRuns: await database.extractionRun.findMany({ where: {
      ...(request.query.status ? { status: request.query.status as Database.EnumRunStatusFilter['equals'] } : {}),
    }, include: { brochure: { include: { chain: true } } }, orderBy: { startedAt: 'desc' }, take: 100 }),
  }));

  app.get<{ Params: { id: string } }>('/admin/ingestion-runs/:id', async (request, reply) => {
    const run = await database.ingestionRun.findUnique({ where: { id: request.params.id }, include: {
      rows: { include: { retailerProduct: true, observation: true }, orderBy: { rowNumber: 'asc' } },
      observations: { take: 50, include: priceInclude, orderBy: { observedAt: 'desc' } },
    } });
    if (run) return { kind: 'price-ingestion', run };
    const extractionRun = await database.extractionRun.findUnique({ where: { id: request.params.id }, include: {
      brochure: { include: { chain: true, pages: true } },
      offers: { include: { page: true, observation: true, promotion: true, reviewItems: true } },
      reviewItems: { include: reviewInclude },
    } });
    return extractionRun ? { kind: 'brochure-extraction', run: extractionRun } : reply.code(404).send({ error: 'RUN_NOT_FOUND' });
  });

  app.get<{ Querystring: { retailer?: string; status?: string } }>('/admin/brochures', async request => ({
    brochures: await database.brochure.findMany({ where: {
      ...(request.query.status ? { status: request.query.status as Database.EnumBrochureStatusFilter['equals'] } : {}),
      ...(request.query.retailer ? { chain: { name: { contains: request.query.retailer, mode: 'insensitive' as const } } } : {}),
    }, include: { chain: true, pages: true, extractionRuns: { take: 1, orderBy: { startedAt: 'desc' } },
      _count: { select: { offers: true } } }, orderBy: { importedAt: 'desc' }, take: 100 }),
  }));

  app.get<{ Params: { id: string } }>('/admin/brochures/:id', async (request, reply) => {
    const brochure = await database.brochure.findUnique({ where: { id: request.params.id }, include: {
      chain: true, pages: { orderBy: { pageNumber: 'asc' } }, extractionRuns: { orderBy: { startedAt: 'desc' } },
      offers: { include: { page: true, reviewItems: true, observation: true, promotion: { include: { conditions: true } } },
        orderBy: { createdAt: 'asc' } },
    } });
    return brochure ? { brochure } : reply.code(404).send({ error: 'BROCHURE_NOT_FOUND' });
  });

  app.put<{ Params: { id: string } }>('/admin/brochures/:id/source-authorization', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const parsed = sourceAuthorizationSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const before = await database.brochure.findUnique({ where: { id: request.params.id } });
    if (!before) return reply.code(404).send({ error: 'BROCHURE_NOT_FOUND' });
    const after = await database.brochure.update({ where: { id: request.params.id }, data: {
      sourceAuthorizationStatus: parsed.data.status,
      sourceOwner: parsed.data.sourceOwner,
      allowedUsage: parsed.data.allowedUsage,
      verificationPolicy: parsed.data.verificationPolicy,
      sourceNotes: parsed.data.sourceNotes,
      sourceEffectiveFrom: parsed.data.sourceEffectiveFrom ? new Date(parsed.data.sourceEffectiveFrom) : undefined,
      sourceEffectiveTo: parsed.data.sourceEffectiveTo ? new Date(parsed.data.sourceEffectiveTo) : undefined,
    } });
    await auditLog({ actorId: actor.id, action: 'SOURCE_AUTHORIZATION_CHANGED', entityType: 'Brochure',
      entityId: before.id, before, after, reason: parsed.data.reason, requestId: request.id });
    return { brochure: after };
  });

  app.get<{ Querystring: { retailer?: string; reason?: string; status?: string; sourceType?: string; confidenceMax?: string } }>('/admin/reviews', async request => ({
    reviewItems: await database.reviewItem.findMany({ where: {
      ...(request.query.reason ? { reason: request.query.reason } : {}),
      ...(request.query.status ? { state: request.query.status as Database.EnumMatchingReviewStateFilter['equals'] } : {}),
      ...(request.query.confidenceMax ? { confidence: { lte: Number(request.query.confidenceMax) } } : {}),
      ...(request.query.retailer ? { brochureOffer: { brochure: { chain: { name: { contains: request.query.retailer,
        mode: 'insensitive' as const } } } } } : {}),
      ...(request.query.sourceType ? { brochureOffer: { brochure: { source: { contains: request.query.sourceType,
        mode: 'insensitive' as const } } } } : {}),
    }, include: reviewInclude, orderBy: { createdAt: 'asc' }, take: 100 }),
  }));

  app.get<{ Querystring: { status?: string; source?: string; reason?: string } }>('/admin/ingestion-reviews', async request => ({
    reviewItems: await database.ingestionReviewItem.findMany({ where: {
      ...(request.query.status ? { state: request.query.status as Database.EnumMatchingReviewStateFilter['equals'] } : {}),
      ...(request.query.reason ? { reason: { contains: request.query.reason, mode: 'insensitive' as const } } : {}),
      ...(request.query.source ? { ingestionRow: { run: { source: { contains: request.query.source,
        mode: 'insensitive' as const } } } } : {}),
    }, include: ingestionReviewInclude, orderBy: { createdAt: 'asc' }, take: 100 }),
  }));

  app.post<{ Params: { id: string } }>('/admin/ingestion-reviews/:id/approve', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = ingestionReviewApproveSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const before = await database.ingestionReviewItem.findUnique({ where: { id: request.params.id },
      include: ingestionReviewInclude });
    if (!before) return reply.code(404).send({ error: 'INGESTION_REVIEW_NOT_FOUND' });
    try {
      const result = await approveIngestionReview({ reviewItemId: request.params.id, actorId: actor.id,
        variantId: parsed.data.variantId, correctedValues: parsed.data.correctedValues,
        note: parsed.data.note });
      const after = await database.ingestionReviewItem.findUnique({ where: { id: request.params.id },
        include: ingestionReviewInclude });
      await auditLog({ actorId: actor.id, action: 'INGESTION_REVIEW_APPROVED',
        entityType: 'IngestionReviewItem', entityId: request.params.id, before, after,
        requestId: request.id, metadata: { runId: result.run.id } });
      return { result };
    } catch (error) {
      return reply.code(422).send({ error: 'INGESTION_REVIEW_APPROVAL_FAILED',
        message: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post<{ Params: { id: string } }>('/admin/ingestion-reviews/:id/reject', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = reasonSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    const before = await database.ingestionReviewItem.findUnique({ where: { id: request.params.id },
      include: ingestionReviewInclude });
    if (!before) return reply.code(404).send({ error: 'INGESTION_REVIEW_NOT_FOUND' });
    const reviewItem = await rejectIngestionReview({ reviewItemId: request.params.id,
      actorId: actor.id, reason: parsed.data.reason });
    const after = await database.ingestionReviewItem.findUnique({ where: { id: request.params.id },
      include: ingestionReviewInclude });
    await auditLog({ actorId: actor.id, action: 'INGESTION_REVIEW_REJECTED',
      entityType: 'IngestionReviewItem', entityId: request.params.id, before, after,
      reason: parsed.data.reason, requestId: request.id });
    return { reviewItem };
  });

  app.get<{ Params: { id: string } }>('/admin/reviews/:id', async (request, reply) => {
    const review = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
    return review ? { reviewItem: review } : reply.code(404).send({ error: 'REVIEW_ITEM_NOT_FOUND' });
  });

  app.post<{ Params: { id: string } }>('/admin/reviews/:id/approve', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = approveSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      const before = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      const result = await approveBrochureReview(request.params.id, parsed.data.variantId);
      const after = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      await database.reviewEvent.create({ data: { reviewItemId: request.params.id, actorId: actor.id,
        action: parsed.data.variantId ? 'MANUAL_MATCH_APPROVED' : 'APPROVED', fromState: before?.state,
        toState: after?.state, metadata: { result } } });
      await auditLog({ actorId: actor.id, action: parsed.data.variantId ? 'REVIEW_MANUALLY_MATCHED' : 'REVIEW_APPROVED',
        entityType: 'ReviewItem', entityId: request.params.id, before, after, requestId: request.id,
        metadata: { result } });
      return { result };
    }
    catch (error) { return reply.code(422).send({ error: 'APPROVAL_FAILED', message: error instanceof Error ? error.message : String(error) }); }
  });

  app.post<{ Params: { id: string } }>('/admin/reviews/:id/match', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = matchSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      const before = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      const result = await approveBrochureReview(request.params.id, parsed.data.variantId);
      const after = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      await database.reviewEvent.create({ data: { reviewItemId: request.params.id, actorId: actor.id,
        action: 'MANUAL_MATCH_APPROVED', fromState: before?.state, toState: after?.state,
        metadata: { variantId: parsed.data.variantId, result } } });
      await auditLog({ actorId: actor.id, action: 'REVIEW_MANUALLY_MATCHED', entityType: 'ReviewItem',
        entityId: request.params.id, before, after, requestId: request.id,
        metadata: { variantId: parsed.data.variantId, result } });
      return { result };
    }
    catch (error) { return reply.code(422).send({ error: 'MATCH_FAILED', message: error instanceof Error ? error.message : String(error) }); }
  });

  app.post<{ Params: { id: string } }>('/admin/reviews/:id/reject', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = reasonSchema.safeParse(request.body ?? {});
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      const before = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      const reviewItem = await rejectBrochureReview(request.params.id);
      const after = await database.reviewItem.findUnique({ where: { id: request.params.id }, include: reviewInclude });
      await database.reviewEvent.create({ data: { reviewItemId: request.params.id, actorId: actor.id,
        action: 'REJECTED', fromState: before?.state, toState: after?.state, note: parsed.data.reason } });
      await auditLog({ actorId: actor.id, action: 'REVIEW_REJECTED', entityType: 'ReviewItem',
        entityId: request.params.id, before, after, reason: parsed.data.reason, requestId: request.id });
      return { reviewItem };
    }
    catch (error) { return reply.code(422).send({ error: 'REJECTION_FAILED', message: error instanceof Error ? error.message : String(error) }); }
  });

  app.post('/admin/reviews/batch', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'REVIEWER');
    if (!actor) return;
    const parsed = batchSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const summary: Array<{ id: string; status: string; message?: string; observationId?: string }> = [];
    for (const id of parsed.data.reviewItemIds) {
      const before = await database.reviewItem.findUnique({ where: { id }, include: reviewInclude });
      if (!before) { summary.push({ id, status: 'NOT_FOUND' }); continue; }
      try {
        if (parsed.data.action === 'REJECT') {
          await rejectBrochureReview(id);
          const after = await database.reviewItem.findUnique({ where: { id }, include: reviewInclude });
          await database.reviewEvent.create({ data: { reviewItemId: id, actorId: actor.id, action: 'BATCH_REJECTED',
            fromState: before.state, toState: after?.state, note: parsed.data.reason } });
          await auditLog({ actorId: actor.id, action: 'BATCH_REVIEW_REJECTED', entityType: 'ReviewItem',
            entityId: id, before, after, reason: parsed.data.reason, requestId: request.id });
          summary.push({ id, status: 'REJECTED' });
        } else {
          if (!before.selectedVariantId || (before.confidence ?? 0) < 0.85) {
            summary.push({ id, status: 'SKIPPED_UNSAFE_APPROVAL', message: 'Batch approval requires proposed variant and confidence >= 0.85' });
            continue;
          }
          const result = await approveBrochureReview(id, before.selectedVariantId);
          const after = await database.reviewItem.findUnique({ where: { id }, include: reviewInclude });
          await database.reviewEvent.create({ data: { reviewItemId: id, actorId: actor.id, action: 'BATCH_APPROVED',
            fromState: before.state, toState: after?.state, note: parsed.data.reason,
            metadata: { selectedVariantId: before.selectedVariantId, result } } });
          await auditLog({ actorId: actor.id, action: 'BATCH_REVIEW_APPROVED', entityType: 'ReviewItem',
            entityId: id, before, after, reason: parsed.data.reason, requestId: request.id,
            metadata: { result } });
          summary.push({ id, status: 'APPROVED', observationId: result.observationId });
        }
      } catch (error) {
        summary.push({ id, status: 'FAILED', message: error instanceof Error ? error.message : String(error) });
      }
    }
    return { action: parsed.data.action, summary };
  });

  app.get<{ Querystring: { search?: string } }>('/admin/products', async request => ({
    products: await database.product.findMany({ where: request.query.search ? { OR: [
      { name: { contains: request.query.search, mode: 'insensitive' } },
      { ean: { contains: request.query.search } },
      { brand: { name: { contains: request.query.search, mode: 'insensitive' } } },
      { category: { name: { contains: request.query.search, mode: 'insensitive' } } },
    ] } : {}, include: { brand: true, category: true, variants: true }, orderBy: { name: 'asc' }, take: 100 }),
  }));

  app.post<{ Params: { id: string } }>('/admin/products/:id/destructive-delete', async (request, reply) => {
    const actor = await requireAdmin(request, reply, 'ADMIN');
    if (!actor) return;
    const parsed = destructiveAttemptSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const product = await database.product.findUnique({ where: { id: request.params.id }, include: {
      variants: { include: { retailerProducts: { select: { id: true } } } },
    } });
    if (!product) return reply.code(404).send({ error: 'PRODUCT_NOT_FOUND' });
    const affectedRetailerProducts = product.variants.reduce((total: number, variant: { retailerProducts: unknown[] }) =>
      total + variant.retailerProducts.length, 0);
    await auditLog({ actorId: actor.id, action: 'DESTRUCTIVE_ACTION_BLOCKED', entityType: 'Product',
      entityId: product.id, before: product, reason: parsed.data.reason, requestId: request.id,
      metadata: { attempted: 'PRODUCT_DELETE', confirmation: parsed.data.confirmation, affectedRetailerProducts } });
    return reply.code(409).send({ error: 'DESTRUCTIVE_ACTION_BLOCKED',
      message: 'Product deletion is not supported. Archive/mapping maintenance must be modeled explicitly first.',
      affected: { variants: product.variants.length, retailerProducts: affectedRetailerProducts } });
  });

  app.get<{ Querystring: { search?: string; retailer?: string } }>('/admin/retailer-products', async request => ({
    retailerProducts: await database.retailerProduct.findMany({ where: {
      ...(request.query.search ? { OR: [
        { rawName: { contains: request.query.search, mode: 'insensitive' as const } },
        { ean: { contains: request.query.search } },
        { variant: { product: { name: { contains: request.query.search, mode: 'insensitive' as const } } } },
      ] } : {}),
      ...(request.query.retailer ? { chain: { name: { contains: request.query.retailer, mode: 'insensitive' as const } } } : {}),
    }, include: { chain: true, variant: { include: { product: { include: { brand: true, category: true } } } },
      _count: { select: { observations: true } } }, orderBy: { rawName: 'asc' }, take: 100 }),
  }));

  app.get<{ Querystring: { retailer?: string; product?: string; source?: string; verificationStatus?: string; freshness?: string } }>('/admin/prices', async request => {
    const cutoff = request.query.freshness === 'stale' ? new Date(Date.now() - loadConfig().PRICE_FRESHNESS_HOURS * 60 * 60 * 1000) : null;
    const observations = await database.priceObservation.findMany({ where: {
      ...(request.query.source ? { sourceType: request.query.source as Database.EnumPriceSourceTypeFilter['equals'] } : {}),
      ...(request.query.verificationStatus ? { verificationStatus: request.query.verificationStatus as Database.EnumVerificationStatusFilter['equals'] } : {}),
      ...(cutoff ? { observedAt: { lt: cutoff } } : {}),
      ...(request.query.retailer ? { retailerProduct: { chain: { name: { contains: request.query.retailer, mode: 'insensitive' as const } } } } : {}),
      ...(request.query.product ? { retailerProduct: { variant: { product: { name: { contains: request.query.product,
        mode: 'insensitive' as const } } } } } : {}),
    }, include: priceInclude, orderBy: { observedAt: 'desc' }, take: 100 });
    return { prices: observations.map(observation => ({ ...observation,
      sourceAuthorizationStatus: sourceAuthorizationFor(observation.sourceType, observation.brochureOffer?.brochure) })) };
  });

  app.get<{ Params: { id: string } }>('/admin/prices/:id', async (request, reply) => {
    const observation = await database.priceObservation.findUnique({ where: { id: request.params.id }, include: priceInclude });
    return observation ? { price: { ...observation,
      sourceAuthorizationStatus: sourceAuthorizationFor(observation.sourceType, observation.brochureOffer?.brochure) } } :
      reply.code(404).send({ error: 'PRICE_NOT_FOUND' });
  });

  app.get('/admin/promotions', async () => ({
    promotions: await database.promotion.findMany({ include: { chain: true, retailerProduct: { include: { variant: { include: {
      product: { include: { brand: true, category: true } } } } } }, brochureOffer: { include: { page: true, brochure: { include: { chain: true } } } },
      conditions: true, observations: { take: 5, orderBy: { observedAt: 'desc' } } }, orderBy: { startsAt: 'desc' }, take: 100 }),
  }));

  app.get('/admin/deals', async () => ({
    deals: await database.deal.findMany({ include: { canonicalProduct: { include: { brand: true, category: true } },
      retailerProduct: { include: { chain: true } }, branch: true, need: true, observation: true },
      orderBy: [{ evaluatedAt: 'desc' }], take: 100 }),
  }));

  app.get('/admin/alerts', async () => ({
    alerts: await database.alert.findMany({ include: { deal: true, need: true, notification: true },
      orderBy: { createdAt: 'desc' }, take: 100 }),
  }));

  app.get('/admin/notifications', async () => ({
    notifications: await database.notification.findMany({ include: { alert: { include: { deal: true, need: true } } },
      orderBy: { createdAt: 'desc' }, take: 100 }),
  }));

  app.get<{ Querystring: { entityType?: string; entityId?: string } }>('/admin/audit-logs', async request => ({
    auditLogs: await database.adminAuditLog.findMany({ where: {
      ...(request.query.entityType ? { entityType: request.query.entityType } : {}),
      ...(request.query.entityId ? { entityId: request.query.entityId } : {}),
    }, include: { actor: { select: { email: true, displayName: true, role: true } } },
    orderBy: { createdAt: 'desc' }, take: 100 }),
  }));
}
