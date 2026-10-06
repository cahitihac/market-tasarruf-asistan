import { createRequire } from 'node:module';
import { Queue } from 'bullmq';
import { loadConfig } from '@market/config';

const require = createRequire(import.meta.url);
type SqsClient = { send(command: unknown): Promise<{ MessageId?: string; Attributes?: Record<string, string> }>; destroy(): void };
type SqsModule = { SQSClient: new (config?: unknown) => SqsClient; SendMessageCommand: new (input: unknown) => unknown;
  GetQueueAttributesCommand: new (input: unknown) => unknown };
function sqsModule() { return require('@aws-sdk/client-sqs') as SqsModule; }

export const ingestionQueueName = 'source-ingestion';
export const ingestionJobName = 'run-source-ingestion';

function redisConnection() {
  const url = new URL(loadConfig().REDIS_URL);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined,
    password: url.password || undefined, db: Number(url.pathname.slice(1) || 0), maxRetriesPerRequest: null };
}

type QueueJob = {
  id: string;
  name?: string;
  data?: Record<string, unknown>;
  attemptsMade?: number;
  failedReason?: string;
  timestamp?: number;
  delay?: number;
  remove(): Promise<void>;
};

export type IngestionQueue = {
  add(name: string, data: Record<string, unknown>, options?: Record<string, unknown>): Promise<{ id: string }>;
  getFailed(start: number, end: number): Promise<QueueJob[]>;
  getDelayed(start: number, end: number): Promise<QueueJob[]>;
  getWaiting(start: number, end: number): Promise<QueueJob[]>;
  getActive(start: number, end: number): Promise<QueueJob[]>;
  getJob(id: string): Promise<QueueJob | null>;
  close(): Promise<void>;
};

const testJobs = new Map<string, QueueJob>();
function testQueue(): IngestionQueue {
  const empty = async () => [] as QueueJob[];
  return {
    add: async (name, data, options = {}) => {
      const id = typeof options.jobId === 'string' ? options.jobId : crypto.randomUUID();
      testJobs.set(id, { id, name, data, timestamp: Date.now(), remove: async () => { testJobs.delete(id); } });
      return { id };
    },
    getFailed: empty,
    getDelayed: empty,
    getWaiting: async () => [...testJobs.values()],
    getActive: empty,
    getJob: async id => testJobs.get(id) ?? null,
    close: async () => undefined,
  };
}

function bullMqQueue(): IngestionQueue {
  const queue = new Queue(ingestionQueueName, { connection: redisConnection(), defaultJobOptions: {
    attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 200, removeOnFail: 200,
  } });
  const adapt = (job: Awaited<ReturnType<typeof queue.getJob>>): QueueJob | null => job ? {
    id: String(job.id), name: job.name, data: job.data, attemptsMade: job.attemptsMade,
    failedReason: job.failedReason, timestamp: job.timestamp, delay: job.delay,
    remove: () => job.remove().then(() => undefined),
  } : null;
  return {
    add: async (name, data, options) => {
      const job = await queue.add(name, data, options);
      return { id: String(job.id) };
    },
    getFailed: async (start, end) => (await queue.getFailed(start, end)).map(adapt).filter((job): job is QueueJob => Boolean(job)),
    getDelayed: async (start, end) => (await queue.getDelayed(start, end)).map(adapt).filter((job): job is QueueJob => Boolean(job)),
    getWaiting: async (start, end) => (await queue.getWaiting(start, end)).map(adapt).filter((job): job is QueueJob => Boolean(job)),
    getActive: async (start, end) => (await queue.getActive(start, end)).map(adapt).filter((job): job is QueueJob => Boolean(job)),
    getJob: async id => adapt(await queue.getJob(id)),
    close: () => queue.close(),
  };
}

function sqsQueue(queueUrl: string): IngestionQueue {
  let client: SqsClient | undefined;
  const getClient = () => client ??= new (sqsModule().SQSClient)({});
  const unsupported = async () => [] as QueueJob[];
  return {
    add: async (name, data, options = {}) => {
      const requestedId = typeof options.jobId === 'string' ? options.jobId : undefined;
      const module = sqsModule();
      const result = await getClient().send(new module.SendMessageCommand({ QueueUrl: queueUrl,
        MessageBody: JSON.stringify({ name, data, options }) }));
      return { id: requestedId ?? result.MessageId ?? crypto.randomUUID() };
    },
    getFailed: unsupported,
    getDelayed: unsupported,
    getWaiting: unsupported,
    getActive: unsupported,
    getJob: async () => null,
    close: async () => { client?.destroy(); },
  };
}

export function sourceIngestionQueue(): IngestionQueue {
  if (process.env.NODE_ENV === 'test') return testQueue();
  const config = loadConfig();
  if (config.JOB_BACKEND === 'sqs') {
    if (!config.INGESTION_QUEUE_URL) throw new Error('INGESTION_QUEUE_URL is required when JOB_BACKEND=sqs');
    return sqsQueue(config.INGESTION_QUEUE_URL);
  }
  return bullMqQueue();
}

export async function serverlessQueueSnapshot(queueUrl: string) {
  const module = sqsModule();
  const client = new module.SQSClient({});
  try {
    const attributes = await client.send(new module.GetQueueAttributesCommand({ QueueUrl: queueUrl,
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed'] }));
    return {
      counts: {
        waiting: Number(attributes.Attributes?.ApproximateNumberOfMessages ?? 0),
        active: Number(attributes.Attributes?.ApproximateNumberOfMessagesNotVisible ?? 0),
        delayed: Number(attributes.Attributes?.ApproximateNumberOfMessagesDelayed ?? 0),
        failed: 0,
      }, failed: [], delayed: [],
    };
  } finally { client.destroy(); }
}
