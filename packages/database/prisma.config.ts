import { config as loadDotEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadDotEnv({ path: new URL('../../.env', import.meta.url).pathname });
export default defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' } });
