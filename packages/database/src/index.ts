import { config as loadDotEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

loadDotEnv({ path: new URL('../../../.env', import.meta.url).pathname });
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
export { Prisma } from '@prisma/client';
export type { UserNeed, Deal, Alert, Notification, NotificationDeliveryStatus, PushPlatform } from '@prisma/client';
