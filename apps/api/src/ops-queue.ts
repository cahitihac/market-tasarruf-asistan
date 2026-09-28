import { Queue } from 'bullmq';
import { loadConfig } from '@market/config';

export const ingestionQueueName = 'source-ingestion';
export const ingestionJobName = 'run-source-ingestion';

function redisConnection() {
  const url = new URL(loadConfig().REDIS_URL);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined,
    password: url.password || undefined, db: Number(url.pathname.slice(1) || 0), maxRetriesPerRequest: null };
}

export function sourceIngestionQueue() {
  return new Queue(ingestionQueueName, { connection: redisConnection(), defaultJobOptions: {
    attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 200, removeOnFail: 200,
  } });
}
