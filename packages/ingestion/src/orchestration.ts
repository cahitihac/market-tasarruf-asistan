import { Prisma, prisma } from '@market/database';
import { fileConnector, type PriceSourceConnector } from './connector.js';
import { ingestPrices, type IngestRunOptions } from './ingest.js';
import { resolveOperationalAlert, upsertOperationalAlert } from './operational-alerts.js';
import { createOpenPricesConnector } from './open-prices.js';
import { priceMinor, priceRecordSchema } from './record.js';

type Trigger = 'SCHEDULED' | 'MANUAL' | 'DEVELOPMENT';
type DataSourceRecord = NonNullable<Awaited<ReturnType<typeof prisma.dataSource.findUnique>>>;

export class IngestionSkippedError extends Error {
  constructor(readonly code: 'SOURCE_NOT_AUTHORIZED' | 'SOURCE_DISABLED' | 'SOURCE_RUNNING' | 'SOURCE_RATE_LIMITED',
    message: string) {
    super(message);
    this.name = 'IngestionSkippedError';
  }
}

function jsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function authorizedFor(source: DataSourceRecord, trigger: Trigger) {
  const authorized = trigger === 'SCHEDULED'
    ? source.authorizationStatus === 'AUTHORIZED' || source.authorizationStatus === 'PUBLIC_DATA'
    : source.authorizationStatus !== 'UNVERIFIED' && source.authorizationStatus !== 'RESTRICTED';
  if (!authorized) return false;
  return source.fictional || (source.onboardingStatus === 'APPROVED' && source.permittedCommercialUse);
}

async function createConnector(source: DataSourceRecord): Promise<PriceSourceConnector> {
  const config = jsonObject(source.config);
  if (source.connectorType === 'JSON' || source.connectorType === 'CSV') {
    const localPath = config.localPath;
    if (typeof localPath !== 'string' || !localPath.trim()) throw new Error('Source config requires localPath for file connectors');
    return fileConnector(localPath, { sourceName: source.name,
      sourceUrl: typeof config.sourceUrl === 'string' ? config.sourceUrl : undefined });
  }
  if (source.connectorType === 'OPEN_PRICES') {
    return createOpenPricesConnector({
      maxRecords: typeof config.maxRecords === 'number' ? config.maxRecords : 25,
      timeoutMs: source.timeoutMs,
    });
  }
  throw new Error(`Scheduled connector ${source.connectorType} is not supported by the registry`);
}

async function anomalyMessage(raw: unknown): Promise<string | null> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.mappingError === 'string') return null;
  if ('currency' in record && record.currency !== 'TRY') return `Unexpected currency: ${String(record.currency)}`;
  const parsed = priceRecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.packageQuantity > 100_000 || parsed.data.packageCount > 500) return 'Invalid package size requires review';
  const currentMinor = priceMinor(parsed.data.currentPrice);
  if (currentMinor <= 0 || currentMinor > 5_000_000) return 'Extreme price value requires review';
  if (!parsed.data.ean) return null;
  const latest = await prisma.priceObservation.findFirst({ where: {
    retailerProduct: { ean: parsed.data.ean, chain: { OR: [
      { slug: { equals: parsed.data.retailer, mode: 'insensitive' } },
      { name: { equals: parsed.data.retailer, mode: 'insensitive' } },
    ] } },
    currency: 'TRY',
  }, orderBy: [{ observedAt: 'desc' }, { retrievedAt: 'desc' }] });
  if (!latest || latest.priceMinor <= 0) return null;
  const movement = Math.abs(currentMinor - latest.priceMinor) / latest.priceMinor;
  return movement >= 0.9 ? `Extreme price movement requires review: ${Math.round(movement * 100)}%` : null;
}

function withAnomalyDetection(connector: PriceSourceConnector): PriceSourceConnector {
  return {
    ...connector,
    getProducts: connector.getProducts?.bind(connector),
    getPrices: async () => {
      const rows = await connector.getPrices();
      return Promise.all(rows.map(async row => {
        const message = await anomalyMessage(row);
        return message && row && typeof row === 'object' ? { ...row as Record<string, unknown>, mappingError: message } : row;
      }));
    },
  };
}

async function markSourceComplete(source: DataSourceRecord, run: Awaited<ReturnType<typeof ingestPrices>>) {
  const success = run.status === 'SUCCEEDED' || run.status === 'PARTIAL';
  const previousRecordCount = source.lastRecordCount;
  const status = success ? 'IDLE' : 'FAILING';
  await prisma.dataSource.update({ where: { id: source.id }, data: {
    operationalStatus: status, lastRunStatus: run.status, lastRunId: run.id,
    lastSuccessfulRunAt: success ? run.finishedAt ?? new Date() : source.lastSuccessfulRunAt,
    lastRecordCount: run.rowCount, lastFailureMessage: success ? null :
      Array.isArray(run.errors) && run.errors[0] && typeof run.errors[0] === 'object' && 'message' in run.errors[0]
        ? String(run.errors[0].message) : 'Ingestion failed',
  } });
  if (success) await resolveOperationalAlert(`source:${source.id}:failed-runs`);
  else await upsertOperationalAlert({ sourceId: source.id, key: `source:${source.id}:failed-runs`,
    kind: 'INGESTION_FAILURE', title: `${source.name} ingestion failed`,
    message: `Latest run ${run.id} finished with ${run.failureCount} failures.`, severity: 'CRITICAL',
    metadata: { runId: run.id, status: run.status, failureCount: run.failureCount } });
  if (previousRecordCount != null && previousRecordCount >= 10 && run.rowCount < Math.floor(previousRecordCount * 0.5)) {
    await upsertOperationalAlert({ sourceId: source.id, key: `source:${source.id}:record-drop`,
      kind: 'RECORD_COUNT_DROP', title: `${source.name} record count dropped`,
      message: `Run ${run.id} processed ${run.rowCount} rows; previous successful run processed ${previousRecordCount}.`,
      metadata: { runId: run.id, previousRecordCount, rowCount: run.rowCount } });
  } else await resolveOperationalAlert(`source:${source.id}:record-drop`);
}

export async function affectedNeedIdsForRun(runId: string): Promise<string[]> {
  const run = await prisma.ingestionRun.findUnique({ where: { id: runId }, include: { dataSource: true } });
  const freshnessHours = run?.dataSource?.freshnessHours ?? 72;
  const cutoff = new Date(Date.now() - freshnessHours * 60 * 60 * 1000);
  const observations = await prisma.priceObservation.findMany({ where: { ingestionRunId: runId,
    observedAt: { gte: cutoff }, OR: [{ promotionId: null }, { promotion: { endsAt: { gte: new Date() } } }] },
    select: { retailerProduct: { select: { variant: { select: { product: { select: { categoryId: true } } } } } } } });
  const categoryIds = [...new Set(observations.map(item => item.retailerProduct.variant?.product.categoryId).filter((value): value is string => Boolean(value)))];
  if (!categoryIds.length) return [];
  const needs = await prisma.userNeed.findMany({ where: { active: true, categoryId: { in: categoryIds } },
    select: { id: true } });
  return needs.map(need => need.id);
}

export async function refreshSourceHealth(sourceId: string) {
  const source = await prisma.dataSource.findUniqueOrThrow({ where: { id: sourceId } });
  if (!source.enabled) return prisma.dataSource.update({ where: { id: sourceId },
    data: { operationalStatus: source.operationalStatus === 'PAUSED' ? 'PAUSED' : 'DISABLED' } });
  const staleAfter = new Date(Date.now() - source.freshnessHours * 60 * 60 * 1000);
  if (!source.lastSuccessfulRunAt || source.lastSuccessfulRunAt < staleAfter) {
    await upsertOperationalAlert({ sourceId, key: `source:${source.id}:stale`,
      kind: 'STALE_SOURCE', title: `${source.name} is stale`,
      message: `No successful run within ${source.freshnessHours} hours.`, severity: 'WARNING' });
    return prisma.dataSource.update({ where: { id: sourceId }, data: { operationalStatus: 'STALE' } });
  }
  await resolveOperationalAlert(`source:${source.id}:stale`);
  return prisma.dataSource.update({ where: { id: sourceId }, data: { operationalStatus: 'IDLE' } });
}

export async function runRegisteredSource(sourceIdOrSlug: string, input: IngestRunOptions & { trigger?: Trigger } = {}) {
  const source = await prisma.dataSource.findFirst({ where: { OR: [{ id: sourceIdOrSlug }, { slug: sourceIdOrSlug }] } });
  if (!source) throw new Error(`Data source not found: ${sourceIdOrSlug}`);
  const trigger = (input.trigger as Trigger | undefined) ?? 'MANUAL';
  if (!source.enabled) throw new IngestionSkippedError('SOURCE_DISABLED', `${source.name} is disabled`);
  if (!authorizedFor(source, trigger)) throw new IngestionSkippedError('SOURCE_NOT_AUTHORIZED',
    `${source.name} is not authorized for ${trigger.toLowerCase()} ingestion`);
  const now = new Date();
  if (source.rateLimitPerMinute && source.lastRunAt &&
    now.getTime() - source.lastRunAt.getTime() < 60_000 / source.rateLimitPerMinute) {
    throw new IngestionSkippedError('SOURCE_RATE_LIMITED', `${source.name} is rate limited`);
  }
  const staleRunningBefore = new Date(now.getTime() - Math.max(source.timeoutMs * 2, 60_000));
  const claimed = await prisma.dataSource.updateMany({ where: { id: source.id, OR: [
    { operationalStatus: { not: 'RUNNING' } }, { lastRunAt: { lt: staleRunningBefore } }, { lastRunAt: null },
  ] }, data: { operationalStatus: 'RUNNING', lastRunAt: now, lastFailureMessage: null } });
  if (!claimed.count) {
    await upsertOperationalAlert({ sourceId: source.id, key: `source:${source.id}:overlap`,
      kind: 'OVERLAPPING_RUN', title: `${source.name} ingestion overlap prevented`,
      message: 'A second run was skipped because the source already has an active run.' });
    throw new IngestionSkippedError('SOURCE_RUNNING', `${source.name} already has an active ingestion run`);
  }
  await resolveOperationalAlert(`source:${source.id}:overlap`);
  try {
    const connector = withAnomalyDetection(await createConnector(source));
    const verificationStatus = source.fictional ? 'DEMO' :
      source.authorizationStatus === 'AUTHORIZED' ? 'VERIFIED' : 'SUPPLIED_UNVERIFIED';
    const run = await ingestPrices(connector, { ...input, dataSourceId: source.id, trigger, verificationStatus });
    await markSourceComplete(source, run);
    await refreshSourceHealth(source.id);
    return { run, affectedNeedIds: await affectedNeedIdsForRun(run.id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.dataSource.update({ where: { id: source.id }, data: {
      operationalStatus: 'FAILING', lastRunStatus: 'FAILED', lastFailureMessage: message,
    } });
    await upsertOperationalAlert({ sourceId: source.id, key: `source:${source.id}:failed-runs`,
      kind: 'INGESTION_FAILURE', title: `${source.name} ingestion failed`, message,
      severity: 'CRITICAL' });
    throw error;
  }
}

export async function inspectSourceFreshness(sourceId: string) {
  const source = await prisma.dataSource.findUniqueOrThrow({ where: { id: sourceId } });
  const cutoff = new Date(Date.now() - source.freshnessHours * 60 * 60 * 1000);
  const [freshObservations, staleObservations, expiredPromotions, unmatchedRows] = await Promise.all([
    prisma.priceObservation.count({ where: { ingestionRun: { dataSourceId: sourceId }, observedAt: { gte: cutoff } } }),
    prisma.priceObservation.count({ where: { ingestionRun: { dataSourceId: sourceId }, observedAt: { lt: cutoff } } }),
    prisma.priceObservation.count({ where: { ingestionRun: { dataSourceId: sourceId },
      promotion: { endsAt: { lt: new Date() } } } }),
    prisma.ingestionRow.count({ where: { run: { dataSourceId: sourceId }, status: { in: ['UNMATCHED', 'FAILED'] } } }),
  ]);
  return { freshObservations, staleObservations, expiredPromotions, unmatchedRows, freshnessCutoff: cutoff };
}
