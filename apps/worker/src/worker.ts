import { Worker } from 'bullmq';
import { database } from '@market/database';
import { loadConfig } from '@market/config';
import { evaluateActiveNeeds, evaluateAllActiveNeeds } from '@market/evaluation';
import { IngestionSkippedError, runRegisteredSource, upsertOperationalAlert } from '@market/ingestion';
import { deliverNotificationPush, deliverPushJobName, enqueuePendingPushDeliveries, enqueuePendingPushJobName,
  pushQueueName } from './push-delivery.js';
import { evaluationQueue, ingestionJobName, ingestionQueueName, jobName, pushDeliveryQueue, queueName,
  redisConnection, sourceIngestionQueue } from './queue.js';

const queue = evaluationQueue();
const pushQueue = pushDeliveryQueue();
const ingestionQueue = sourceIngestionQueue();
const worker = new Worker(queueName, async job => {
  const startedAt = new Date();
  console.log(JSON.stringify({ event: 'evaluation_started', jobId: job.id, startedAt }));
  const needIds = Array.isArray(job.data?.needIds) ? job.data.needIds.filter((id: unknown): id is string => typeof id === 'string') : undefined;
  const run = needIds ? await evaluateActiveNeeds(needIds) : await evaluateAllActiveNeeds();
  const push = await enqueuePendingPushDeliveries(pushQueue);
  console.log(JSON.stringify({ event: 'evaluation_finished', jobId: job.id, runId: run.id, startedAt,
    finishedAt: run.finishedAt, activeNeedsEvaluated: run.activeNeedsEvaluated, matchingProductsFound: run.matchingProductsFound,
    dealsCreated: run.dealsCreated, dealsUpdated: run.dealsUpdated, alertsCreated: run.alertsCreated,
    notificationsCreated: run.notificationsCreated, pushDeliveriesCreated: push.created, pushDeliveriesQueued: push.queued,
    pushDeliveriesSkipped: push.skipped, failures: run.failureCount, errors: run.errors }));
  if (run.failureCount) throw new Error(`Evaluation run ${run.id} had ${run.failureCount} need failures`);
  return { runId: run.id, push };
}, { connection: redisConnection(), concurrency: 1, autorun: false });

const ingestionWorker = new Worker(ingestionQueueName, async job => {
  const sourceId = String(job.data?.sourceId ?? '');
  const trigger = job.data?.trigger === 'MANUAL' || job.data?.trigger === 'DEVELOPMENT' ? job.data.trigger : 'SCHEDULED';
  try {
    const result = await runRegisteredSource(sourceId, { trigger, jobId: job.id,
      attempt: job.attemptsMade + 1 });
    if (result.affectedNeedIds.length) {
      await queue.add(jobName, { needIds: result.affectedNeedIds, ingestionRunId: result.run.id }, {
        jobId: `ingestion:${result.run.id}:evaluation`,
        attempts: 3, backoff: { type: 'exponential', delay: 1000 },
      });
    }
    console.log(JSON.stringify({ event: 'ingestion_finished', jobId: job.id, sourceId,
      runId: result.run.id, status: result.run.status, affectedNeeds: result.affectedNeedIds.length }));
    return { runId: result.run.id, affectedNeedIds: result.affectedNeedIds };
  } catch (error) {
    if (error instanceof IngestionSkippedError) {
      console.warn(JSON.stringify({ event: 'ingestion_skipped', jobId: job.id, sourceId,
        code: error.code, message: error.message }));
      return { skipped: true, code: error.code };
    }
    throw error;
  }
}, { connection: redisConnection(), concurrency: Number(process.env.INGESTION_WORKER_CONCURRENCY ?? 2), autorun: false });

const pushWorker = new Worker(pushQueueName, async job => {
  if (job.name === enqueuePendingPushJobName) return enqueuePendingPushDeliveries(pushQueue);
  if (job.name === deliverPushJobName) return deliverNotificationPush(job.data.deliveryId as string);
  throw new Error(`Unknown push job ${job.name}`);
}, { connection: redisConnection(), concurrency: 5, autorun: false });

worker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'evaluation_failed', jobId: job?.id,
  attempt: job?.attemptsMade, error: error.message })));
worker.on('error', error => console.error(JSON.stringify({ event: 'worker_error', error: error.message })));
pushWorker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'push_job_failed', jobId: job?.id,
  name: job?.name, attempt: job?.attemptsMade, error: error.message })));
pushWorker.on('error', error => console.error(JSON.stringify({ event: 'push_worker_error', error: error.message })));
ingestionWorker.on('failed', (job, error) => {
  console.error(JSON.stringify({ event: 'ingestion_job_failed',
    jobId: job?.id, sourceId: job?.data?.sourceId, attempt: job?.attemptsMade, error: error.message }));
  void (async () => {
    const candidateSourceId = typeof job?.data?.sourceId === 'string' ? job.data.sourceId : undefined;
    const source = candidateSourceId
      ? await database.dataSource.findUnique({ where: { id: candidateSourceId }, select: { id: true } })
      : null;
    await upsertOperationalAlert({ sourceId: source?.id, key: `job:${job?.id ?? 'unknown'}:failed`,
      kind: 'FAILED_RECURRING_JOB', title: 'Ingestion job failed',
      message: `Ingestion job ${job?.id ?? 'unknown'} failed after attempt ${job?.attemptsMade ?? 0}.`,
      severity: 'CRITICAL', metadata: { jobId: job?.id, attemptsMade: job?.attemptsMade,
        sourceId: candidateSourceId } });
  })().catch(alertError => console.error(JSON.stringify({ event: 'operational_alert_failed',
    error: alertError instanceof Error ? alertError.message : String(alertError) })));
});
ingestionWorker.on('error', error => console.error(JSON.stringify({ event: 'ingestion_worker_error', error: error.message })));

async function reconcileIngestionSchedules() {
  const sources = await database.dataSource.findMany();
  const desiredSchedulerIds = new Set(sources.map(source => `source:${source.id}`));
  const existingSourceIds = new Set(sources.map(source => source.id));
  const schedulers = await ingestionQueue.getJobSchedulers();
  await Promise.all(schedulers
    .filter(scheduler => scheduler.key.startsWith('source:') && !desiredSchedulerIds.has(scheduler.key))
    .map(scheduler => ingestionQueue.removeJobScheduler(scheduler.key)));
  const repeatableJobs = await ingestionQueue.getRepeatableJobs();
  await Promise.all(repeatableJobs
    .filter(job => job.key.startsWith('source:') && !desiredSchedulerIds.has(job.key))
    .map(job => ingestionQueue.removeRepeatableByKey(job.key)));
  const pendingJobs = await ingestionQueue.getJobs(['waiting', 'delayed'], 0, 500);
  await Promise.all(pendingJobs
    .filter(job => typeof job.data?.sourceId === 'string' && !existingSourceIds.has(job.data.sourceId))
    .map(job => job.remove().catch(() => undefined)));
  for (const source of sources) {
    const schedulerId = `source:${source.id}`;
    const scheduleAllowed = source.enabled && source.scheduleEveryMs && source.scheduleEveryMs > 0 &&
      (source.authorizationStatus === 'AUTHORIZED' || source.authorizationStatus === 'PUBLIC_DATA') &&
      (source.fictional || (source.onboardingStatus === 'APPROVED' && source.permittedCommercialUse));
    if (!scheduleAllowed) {
      await ingestionQueue.removeJobScheduler(schedulerId);
      continue;
    }
    await ingestionQueue.upsertJobScheduler(schedulerId, { every: source.scheduleEveryMs! }, {
      name: ingestionJobName,
      data: { sourceId: source.id, trigger: 'SCHEDULED' },
      opts: { attempts: source.maxAttempts, backoff: { type: 'exponential', delay: 5000 } },
    });
  }
}

const intervalMinutes = loadConfig().DEAL_EVALUATION_INTERVAL_MINUTES;
await queue.upsertJobScheduler('active-needs', { every: intervalMinutes * 60_000 }, { name: jobName,
  opts: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } } });
await pushQueue.upsertJobScheduler('pending-push-deliveries', { every: 60_000 }, { name: enqueuePendingPushJobName,
  opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
await reconcileIngestionSchedules();
void worker.run().catch(error => console.error(JSON.stringify({ event: 'worker_run_failed', error: error.message })));
void ingestionWorker.run().catch(error => console.error(JSON.stringify({ event: 'ingestion_worker_run_failed', error: error.message })));
void pushWorker.run().catch(error => console.error(JSON.stringify({ event: 'push_worker_run_failed', error: error.message })));
const scheduleTimer = setInterval(() => { void reconcileIngestionSchedules().catch(error =>
  console.error(JSON.stringify({ event: 'ingestion_schedule_reconcile_failed', error: error.message }))); }, 30_000);
console.log(JSON.stringify({ event: 'worker_ready', queue: queueName, pushQueue: pushQueueName,
  ingestionQueue: ingestionQueueName, scheduler: 'active-needs', intervalMinutes }));

async function shutdown() {
  clearInterval(scheduleTimer);
  await worker.close(); await ingestionWorker.close(); await pushWorker.close();
  await queue.close(); await ingestionQueue.close(); await pushQueue.close(); await database.$disconnect();
}
process.once('SIGINT', () => { void shutdown().then(() => process.exit(0)); });
process.once('SIGTERM', () => { void shutdown().then(() => process.exit(0)); });
