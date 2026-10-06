import { QueueEvents } from 'bullmq';
import { database } from '@market/database';
import { evaluationQueue, ingestionJobName, queueName, redisConnection, sourceIngestionQueue, jobName } from '../apps/worker/src/queue.js';

const apiBase = process.env.API_BASE_URL ?? 'http://127.0.0.1:3003';
const suffix = process.env.PHASE16_DEMO_SUFFIX ?? new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const anomalyPath = new URL('../fixtures/anomaly-prices.json', import.meta.url).pathname;
const pocPath = new URL('../fixtures/poc-prices.json', import.meta.url).pathname;

type JsonObject = Record<string, unknown>;

async function api(path: string, token?: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) as JsonObject : {};
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed: ${response.status} ${text}`);
  return body;
}

async function waitFor<T>(label: string, read: () => Promise<T | null>, timeoutMs = 30_000) {
  const started = Date.now();
  let last: T | null = null;
  while (Date.now() - started < timeoutMs) {
    last = await read();
    if (last) return last;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${label}; last=${JSON.stringify(last)}`);
}

async function waitForRun(jobId: string) {
  return waitFor(`ingestion run ${jobId}`, () => database.ingestionRun.findFirst({
    where: { jobId, finishedAt: { not: null } },
    orderBy: { startedAt: 'desc' },
  }), 45_000);
}

async function queueManualSource(sourceId: string, token: string) {
  const result = await api(`/admin/data-sources/${sourceId}/run`, token, { method: 'POST', body: JSON.stringify({}) });
  return String(result.jobId);
}

async function main() {
  const health = await api('/health');
  const signIn = await api('/admin/auth/sign-in', undefined, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@market.local', password: 'admin-demo' }),
  });
  const token = String(signIn.token);

  const localSource = await database.dataSource.findUniqueOrThrow({ where: { slug: 'local-poc-fixture' } });
  const scheduledStartedAfter = new Date();
  const scheduledRun = await waitFor('scheduled local fixture ingestion', () => database.ingestionRun.findFirst({
    where: { dataSourceId: localSource.id, trigger: 'SCHEDULED', startedAt: { gte: scheduledStartedAfter } },
    orderBy: { startedAt: 'desc' },
  }), 20_000);

  const anomalySource = await database.dataSource.create({ data: {
    slug: `phase16-demo-anomaly-${suffix}`,
    name: `Phase 16 anomaly fixture ${suffix}`,
    owner: 'Market Tasarruf Asistani development fixtures',
    ownerContact: 'fixtures@market.local',
    connectorType: 'JSON',
    authorizationStatus: 'AUTHORIZED',
    onboardingStatus: 'APPROVED',
    permittedCommercialUse: false,
    allowedDataRetentionDays: 7,
    geographicCoverage: { country: 'TR', fixture: true },
    credentialRequirements: 'None. Local fixture only.',
    feedSpecificationUrl: 'fixture://anomaly-prices.json',
    feedSpecification: { format: 'JSON', rows: 'fixtures/anomaly-prices.json' },
    enabled: true,
    freshnessHours: 168,
    timeoutMs: 30_000,
    maxAttempts: 1,
    fictional: true,
    operationalStatus: 'IDLE',
    config: { localPath: anomalyPath, sourceUrl: 'fixture://anomaly-prices.json' },
    notes: 'Phase 16 live demo fixture; not real retailer data.',
  } });

  const anomalyJobId = await queueManualSource(anomalySource.id, token);
  const anomalyRun = await waitForRun(anomalyJobId);
  const reviewResponse = await api(`/admin/ingestion-reviews?status=PENDING&source=${encodeURIComponent(anomalySource.name)}`, token);
  const reviewItems = reviewResponse.reviewItems as Array<{ id: string; reason: string }>;
  const currencyReview = reviewItems.find(item => item.reason.includes('Unexpected currency')) ?? reviewItems[0];
  if (!currencyReview) throw new Error('Expected anomaly fixture to create ingestion review items');
  const finishVariant = await database.productVariant.findFirstOrThrow({ where: {
    product: { name: 'Finish Quantum 72 tablets' },
  } });
  const approved = await api(`/admin/ingestion-reviews/${currencyReview.id}/approve`, token, {
    method: 'POST',
    body: JSON.stringify({ variantId: finishVariant.id, correctedValues: { currency: 'TRY' },
      note: 'Phase 16 fixture correction during live demo' }),
  });
  const approvalRun = (approved.result as JsonObject).run as { id: string; observationsCreatedCount: number; status: string };

  const dishwasherCategory = await database.category.findUniqueOrThrow({ where: { slug: 'dishwasher-tablets' } });
  const demoUser = await database.user.create({ data: {
    email: `phase16-demo-${suffix}@market.local`,
    displayName: `Phase 16 demo ${suffix}`,
    emailVerifiedAt: new Date(),
  } });
  const demoNeed = await database.userNeed.create({ data: {
    userId: demoUser.id,
    categoryId: dishwasherCategory.id,
    title: 'Phase 16 fixture dishwasher tablets',
    constraints: { preferredBrands: ['Finish'], minimumCount: 40, allowAlternatives: false },
  } });

  const evalQueue = evaluationQueue();
  const evalEvents = new QueueEvents(queueName, { connection: redisConnection() });
  await evalEvents.waitUntilReady();
  const evalJob = await evalQueue.add(jobName, {
    needIds: [demoNeed.id],
    reason: 'phase16-live-demo',
  }, { jobId: `phase16-demo:${suffix}:evaluation`, attempts: 1 });
  const evalResult = await evalJob.waitUntilFinished(evalEvents, 60_000) as { runId: string };
  await evalEvents.close();
  await evalQueue.close();
  const evaluation = await database.evaluationRun.findUniqueOrThrow({ where: { id: evalResult.runId } });

  const failingSource = await database.dataSource.create({ data: {
    slug: `phase16-demo-failing-${suffix}`,
    name: `Phase 16 failing fixture ${suffix}`,
    owner: 'Market Tasarruf Asistani development fixtures',
    ownerContact: 'fixtures@market.local',
    connectorType: 'JSON',
    authorizationStatus: 'AUTHORIZED',
    onboardingStatus: 'APPROVED',
    permittedCommercialUse: false,
    allowedDataRetentionDays: 7,
    geographicCoverage: { country: 'TR', fixture: true },
    credentialRequirements: 'None. Local fixture only.',
    feedSpecificationUrl: 'fixture://missing-file.json',
    feedSpecification: { format: 'JSON', rows: 'missing fixture path' },
    enabled: true,
    freshnessHours: 168,
    timeoutMs: 5_000,
    maxAttempts: 2,
    fictional: true,
    operationalStatus: 'IDLE',
    config: { localPath: '/tmp/phase16-missing-fixture.json', sourceUrl: 'fixture://missing-file.json' },
    notes: 'Phase 16 simulated failure fixture; not real retailer data.',
  } });
  const failingJobId = await queueManualSource(failingSource.id, token);
  await waitFor('failed ingestion alert', () => database.operationalAlert.findFirst({
    where: { dataSourceId: failingSource.id, kind: 'INGESTION_FAILURE', status: 'OPEN' },
  }), 30_000);
  const failedRun = await database.ingestionRun.findFirst({
    where: { dataSourceId: failingSource.id, status: 'FAILED' },
    orderBy: { startedAt: 'desc' },
  });
  const failureAlert = await database.operationalAlert.findFirstOrThrow({
    where: { dataSourceId: failingSource.id, kind: 'INGESTION_FAILURE' },
    orderBy: { lastSeenAt: 'desc' },
  });

  await database.dataSource.update({ where: { id: failingSource.id }, data: {
    config: { localPath: pocPath, sourceUrl: 'fixture://poc-prices.json' },
    feedSpecificationUrl: 'fixture://poc-prices.json',
    feedSpecification: { format: 'JSON', rows: 'fixtures/poc-prices.json' },
    operationalStatus: 'IDLE',
  } });
  const recoveryJobId = await queueManualSource(failingSource.id, token);
  const recoveryRun = await waitForRun(recoveryJobId);
  const recoveredAlert = await database.operationalAlert.findUnique({
    where: { dedupeKey: `source:${failingSource.id}:failed-runs` },
  });

  const operations = await api('/admin/operations', token);
  const sources = await api('/admin/data-sources', token);

  const observationCount = await database.priceObservation.count({ where: { ingestionRunId: approvalRun.id } });
  const notificationCount = await database.notification.count({ where: { createdAt: { gte: evaluation.startedAt } } });
  const reviewAfter = await database.ingestionReviewItem.findUniqueOrThrow({ where: { id: currencyReview.id },
    include: { events: true } });

  console.log(JSON.stringify({
    fixtureOnly: true,
    health,
    localFixtureSource: {
      slug: localSource.slug,
      fictional: localSource.fictional,
      scheduleEveryMs: localSource.scheduleEveryMs,
      authorizationStatus: localSource.authorizationStatus,
      onboardingStatus: localSource.onboardingStatus,
    },
    scheduledRun: {
      id: scheduledRun.id,
      status: scheduledRun.status,
      rowCount: scheduledRun.rowCount,
      observationsCreatedCount: scheduledRun.observationsCreatedCount,
      duplicatesSkippedCount: scheduledRun.duplicatesSkippedCount,
      failureCount: scheduledRun.failureCount,
    },
    anomalyRun: {
      id: anomalyRun.id,
      status: anomalyRun.status,
      rowCount: anomalyRun.rowCount,
      failureCount: anomalyRun.failureCount,
      reviewItemsCreated: reviewItems.length,
    },
    reviewApproval: {
      reviewItemId: currencyReview.id,
      finalState: reviewAfter.state,
      eventCount: reviewAfter.events.length,
      approvalRunId: approvalRun.id,
      approvalRunStatus: approvalRun.status,
      observationsCreated: observationCount,
    },
    evaluation: {
      runId: evaluation.id,
      activeNeedsEvaluated: evaluation.activeNeedsEvaluated,
      matchingProductsFound: evaluation.matchingProductsFound,
      dealsCreated: evaluation.dealsCreated,
      dealsUpdated: evaluation.dealsUpdated,
      alertsCreated: evaluation.alertsCreated,
      notificationsCreated: evaluation.notificationsCreated,
      notificationRowsForRun: notificationCount,
    },
    failureRecovery: {
      failedJobId: failingJobId,
      failedRunId: failedRun?.id,
      failureAlert: {
        status: failureAlert.status,
        externalSendCount: failureAlert.externalSendCount,
        externalLastError: failureAlert.externalLastError,
      },
      recoveryJobId,
      recoveryRun: {
        id: recoveryRun.id,
        status: recoveryRun.status,
        rowCount: recoveryRun.rowCount,
      },
      recoveredAlert: recoveredAlert ? {
        status: recoveredAlert.status,
        resolvedAt: recoveredAlert.resolvedAt,
      } : null,
    },
    adminMonitoring: {
      openAlerts: (operations.alerts as unknown[]).length,
      queue: operations.queue,
      dataSourcesVisible: (sources.dataSources as unknown[]).length,
    },
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  const queue = sourceIngestionQueue();
  await queue.getJobs(['waiting', 'delayed']).then(jobs => Promise.all(jobs
    .filter(job => job.name === ingestionJobName && typeof job.id === 'string' && job.id.includes(`phase16-demo`))
    .map(job => job.remove().catch(() => undefined)))).catch(() => undefined);
  await queue.close().catch(() => undefined);
  await database.$disconnect();
});
