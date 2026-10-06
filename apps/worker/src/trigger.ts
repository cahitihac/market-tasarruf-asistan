import { QueueEvents } from 'bullmq';
import { database } from '@market/database';
import { evaluationQueue, jobName, queueName, redisConnection } from './queue.js';

const queue = evaluationQueue();
const events = new QueueEvents(queueName, { connection: redisConnection() });
try {
  await events.waitUntilReady();
  const job = await queue.add(jobName, { requestedAt: new Date().toISOString() });
  console.log(JSON.stringify({ event: 'manual_job_queued', jobId: job.id }));
  const result = await job.waitUntilFinished(events, 120_000);
  console.log(JSON.stringify({ event: 'manual_job_completed', jobId: job.id, result }));
} finally {
  await events.close(); await queue.close(); await database.$disconnect();
}
