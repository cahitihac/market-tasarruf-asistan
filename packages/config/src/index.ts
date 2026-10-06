import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv({ path: new URL('../../../.env', import.meta.url).pathname });

const optionalUrl = z.preprocess(value => value === '' ? undefined : value, z.string().url().optional());

const envSchema = z.object({
  DYNAMODB_TABLE: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).default('market-assistant-local')),
  DYNAMODB_ENDPOINT: optionalUrl,
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://127.0.0.1:8081,http://localhost:3002,http://127.0.0.1:3002'),
  DEAL_EVALUATION_INTERVAL_MINUTES: z.coerce.number().positive().default(5),
  PRICE_FRESHNESS_HOURS: z.coerce.number().positive().default(72),
  INGESTION_DEMO_SCHEDULE_MS: z.coerce.number().int().positive().default(60_000),
  INGESTION_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  JOB_BACKEND: z.enum(['bullmq', 'sqs']).default('bullmq'),
  EVALUATION_QUEUE_URL: optionalUrl,
  INGESTION_QUEUE_URL: optionalUrl,
  PUSH_QUEUE_URL: optionalUrl,
  PUSH_STATUS_QUEUE_URL: optionalUrl,
  OPS_ALERT_PROVIDER: z.enum(['none', 'mock', 'webhook']).default('none'),
  OPS_ALERT_WEBHOOK_URL: z.string().url().optional(),
  OPS_ALERT_MIN_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),
  OPENAI_API_KEY: z.string().optional(),
  BROCHURE_EXTRACTION_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  BROCHURE_EXTRACTION_MODEL: z.string().default('gpt-5'),
  EXPO_PUSH_ACCESS_TOKEN: z.string().optional(),
});

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  return envSchema.parse(env);
}
