import { Queue } from 'bullmq';
import { loadConfig } from '@market/config';
import { pushQueueName } from './push-delivery.js';

export const queueName = 'deal-evaluation';
export const jobName = 'evaluate-active-needs';
export const ingestionQueueName = 'source-ingestion';
export const ingestionJobName = 'run-source-ingestion';
export function redisConnection() {
  const url = new URL(loadConfig().REDIS_URL);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined,
    password: url.password || undefined, db: Number(url.pathname.slice(1) || 0), maxRetriesPerRequest: null };
}
export function evaluationQueue() {
  return new Queue(queueName, { connection: redisConnection(), defaultJobOptions: {
    attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 100,
  } });
}

export function pushDeliveryQueue() {
  return new Queue(pushQueueName, { connection: redisConnection(), defaultJobOptions: {
    attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 500, removeOnFail: 500,
  } });
}

export function sourceIngestionQueue() {
  return new Queue(ingestionQueueName, { connection: redisConnection(), defaultJobOptions: {
    attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 200, removeOnFail: 200,
  } });
}
