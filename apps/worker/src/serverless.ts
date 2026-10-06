import { createRequire } from 'node:module';
import { database } from '@market/database';
import { evaluateActiveNeeds, evaluateAllActiveNeeds } from '@market/evaluation';
import { IngestionSkippedError, runRegisteredSource } from '@market/ingestion';
import { enqueuePendingPushDeliveries, deliverNotificationPush } from './push-delivery.js';
export { publicPushHandler } from './public-push.js';
export { pushStatusHandler } from './push-status.js';

const require = createRequire(import.meta.url);
type SqsClient = { send(command: unknown): Promise<{ MessageId?: string }> };
type SqsModule = { SQSClient: new (config?: unknown) => SqsClient; SendMessageCommand: new (input: unknown) => unknown };
function sqsModule() { return require('@aws-sdk/client-sqs') as SqsModule; }

type SqsRecord = { body: string; messageId?: string };
type SqsEvent = { Records?: SqsRecord[] };
type JobEnvelope = { name?: string; data?: Record<string, unknown> };

let sqs: SqsClient | undefined;
function getSqs() { return sqs ??= new (sqsModule().SQSClient)({}); }

function required(name: 'EVALUATION_QUEUE_URL' | 'INGESTION_QUEUE_URL' | 'PUSH_QUEUE_URL') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for serverless workers`);
  return value;
}

function body(record: SqsRecord): JobEnvelope {
  try {
    const value = JSON.parse(record.body) as JobEnvelope;
    if (!value || typeof value !== 'object') throw new Error('Envelope is not an object');
    return value;
  } catch (error) {
    throw new Error(`Invalid SQS job envelope: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function queue(url: string) {
  return {
    add: async (name: string, data: unknown, options?: Record<string, unknown>) => {
      const module = sqsModule();
      const result = await getSqs().send(new module.SendMessageCommand({ QueueUrl: url,
        MessageBody: JSON.stringify({ name, data, options }) }));
      return { id: result.MessageId ?? crypto.randomUUID() };
    },
  };
}

async function enqueueEvaluation(needIds: string[] | undefined, ingestionRunId?: string) {
  const module = sqsModule();
  await getSqs().send(new module.SendMessageCommand({ QueueUrl: required('EVALUATION_QUEUE_URL'),
    MessageBody: JSON.stringify({ name: 'evaluate-active-needs', data: { needIds, ingestionRunId } }) }));
}

export async function evaluationHandler(event: SqsEvent) {
  for (const record of event.Records ?? []) {
    const job = body(record);
    const needIds = Array.isArray(job.data?.needIds)
      ? job.data.needIds.filter((id): id is string => typeof id === 'string') : undefined;
    const run = needIds ? await evaluateActiveNeeds(needIds) : await evaluateAllActiveNeeds();
    const push = await enqueuePendingPushDeliveries(queue(required('PUSH_QUEUE_URL')));
    console.log(JSON.stringify({ event: 'serverless_evaluation_finished', messageId: record.messageId,
      runId: run.id, dealsCreated: run.dealsCreated, dealsUpdated: run.dealsUpdated,
      notificationsCreated: run.notificationsCreated, pushDeliveriesQueued: push.queued,
      failures: run.failureCount }));
    if (run.failureCount) throw new Error(`Evaluation run ${run.id} had ${run.failureCount} need failures`);
  }
}

async function ingestOne(sourceId: string, trigger: 'SCHEDULED' | 'MANUAL') {
  try {
    const result = await runRegisteredSource(sourceId, { trigger });
    if (result.affectedNeedIds.length) await enqueueEvaluation(result.affectedNeedIds, result.run.id);
  } catch (error) {
    if (error instanceof IngestionSkippedError) {
      console.warn(JSON.stringify({ event: 'serverless_ingestion_skipped', sourceId, code: error.code }));
      return;
    }
    throw error;
  }
}

export async function ingestionHandler(event: SqsEvent) {
  for (const record of event.Records ?? []) {
    const job = body(record);
    const sourceId = typeof job.data?.sourceId === 'string' ? job.data.sourceId : undefined;
    if (sourceId) {
      await ingestOne(sourceId, job.data?.trigger === 'MANUAL' ? 'MANUAL' : 'SCHEDULED');
      continue;
    }
    const sources = await database.dataSource.findMany({ where: { enabled: true,
      authorizationStatus: { in: ['AUTHORIZED', 'PUBLIC_DATA'] },
      OR: [{ fictional: true }, { onboardingStatus: 'APPROVED', permittedCommercialUse: true }] },
      select: { id: true } });
    for (const source of sources) await ingestOne(source.id, 'SCHEDULED');
  }
}

export async function pushHandler(event: SqsEvent) {
  for (const record of event.Records ?? []) {
    const job = body(record);
    const deliveryId = typeof job.data?.deliveryId === 'string' ? job.data.deliveryId : undefined;
    if (deliveryId) await deliverNotificationPush(deliveryId);
  }
}
