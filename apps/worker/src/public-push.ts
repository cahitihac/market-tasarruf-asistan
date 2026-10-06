import { createRequire } from 'node:module';
import { PushProviderError, configuredPushProvider, type PushMessage } from './push-provider.js';
import { loadRuntimeParameters } from './runtime-parameters.js';

const require = createRequire(import.meta.url);
type SqsClient = { send(command: unknown): Promise<unknown> };
type SqsModule = { SQSClient: new (config?: unknown) => SqsClient; SendMessageCommand: new (input: unknown) => unknown };
function sqsModule() { return require('@aws-sdk/client-sqs') as SqsModule; }

type RecordValue = { body: string };
type Event = { Records?: RecordValue[] };
type Job = { data?: { deliveryId?: unknown; message?: unknown } };
type PushStatus = { deliveryId: string; status: 'SENT' | 'INVALID_TOKEN' | 'FAILED'; providerMessageId?: string; error?: string };

let client: SqsClient | undefined;
function sqs() { return client ??= new (sqsModule().SQSClient)({}); }

function statusQueueUrl() {
  const value = process.env.PUSH_STATUS_QUEUE_URL;
  if (!value) throw new Error('PUSH_STATUS_QUEUE_URL is required for public push delivery');
  return value;
}

function job(record: RecordValue): Job {
  const value = JSON.parse(record.body) as Job;
  if (!value?.data || typeof value.data.deliveryId !== 'string' || !value.data.message) {
    throw new Error('Push job is missing deliveryId or message');
  }
  return value;
}

async function persistStatus(status: PushStatus) {
  const module = sqsModule();
  await sqs().send(new module.SendMessageCommand({ QueueUrl: statusQueueUrl(), MessageBody: JSON.stringify(status) }));
}

export async function publicPushHandler(event: Event) {
  await loadRuntimeParameters();
  for (const record of event.Records ?? []) {
    const value = job(record);
    const deliveryId = value.data!.deliveryId as string;
    const message = value.data!.message as PushMessage;
    try {
      const result = await configuredPushProvider().send(message);
      if (result.status === 'ok') await persistStatus({ deliveryId, status: 'SENT', providerMessageId: result.providerMessageId });
      else if (result.status === 'invalid-token') await persistStatus({ deliveryId, status: 'INVALID_TOKEN', error: result.error });
      else await persistStatus({ deliveryId, status: 'FAILED', error: result.error });
    } catch (error) {
      if (error instanceof PushProviderError && error.kind === 'temporary') throw error;
      await persistStatus({ deliveryId, status: 'FAILED', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
