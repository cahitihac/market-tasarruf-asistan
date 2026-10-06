import type { FastifyInstance, FastifyReply } from 'fastify';
import { notificationPreferencesInputSchema, pushDeviceInputSchema } from '@market/contracts';
import { Database, database } from '@market/database';
import { z } from 'zod';
import { requireConsumer, type ConsumerRequest } from './consumer-auth.js';

const expoPushTokenPattern = /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/;

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: error.issues.map(issue => ({
    path: issue.path.join('.'), message: issue.message,
  })) });
}

function serializePreferences(preferences: {
  dealAlertsEnabled?: boolean;
  greatDealEnabled?: boolean;
  buyEnabled?: boolean;
  updatedAt?: Date | null;
} | null) {
  return {
    dealAlertsEnabled: preferences?.dealAlertsEnabled ?? false,
    greatDealEnabled: preferences?.greatDealEnabled ?? false,
    buyEnabled: preferences?.buyEnabled ?? false,
    updatedAt: preferences?.updatedAt ?? null,
  };
}

export async function disableDevicesForSession(userId: string, sessionId: string | undefined, now = new Date()) {
  if (!sessionId) return;
  await database.pushDevice.updateMany({ where: { userId, sessionId, disabledAt: null }, data: { disabledAt: now } });
  await database.notificationDelivery.updateMany({ where: {
    status: 'PENDING',
    pushDevice: { userId, sessionId },
  }, data: { status: 'SKIPPED', failedAt: now, lastError: 'Session revoked before push delivery.' } });
}

export async function disableDevicesForUser(userId: string, now = new Date()) {
  await database.pushDevice.updateMany({ where: { userId, disabledAt: null }, data: { disabledAt: now } });
  await database.notificationDelivery.updateMany({ where: {
    status: 'PENDING',
    notification: { userId },
  }, data: { status: 'SKIPPED', failedAt: now, lastError: 'Account disabled before push delivery.' } });
}

export async function registerPushRoutes(app: FastifyInstance) {
  app.get('/push/devices', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    return { devices: await database.pushDevice.findMany({ where: { userId: user.id, disabledAt: null },
      orderBy: { lastSeenAt: 'desc' } }) };
  });

  app.post('/push/devices', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const parsed = pushDeviceInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    if (!expoPushTokenPattern.test(parsed.data.expoPushToken)) {
      return reply.code(400).send({ error: 'INVALID_EXPO_PUSH_TOKEN', message: 'Expo push token geçersiz görünüyor.' });
    }
    const now = new Date();
    const sessionId = (request as ConsumerRequest).consumerSessionId;
    try {
      const device = await database.pushDevice.upsert({
        where: { expoPushToken: parsed.data.expoPushToken },
        create: { userId: user.id, sessionId, lastSeenAt: now, ...parsed.data },
        update: { userId: user.id, sessionId, disabledAt: null, lastSeenAt: now,
          platform: parsed.data.platform, deviceName: parsed.data.deviceName ?? null, appVersion: parsed.data.appVersion ?? null },
      });
      return reply.code(201).send(device);
    } catch (error) {
      if (error instanceof Database.RequestError && error.code === 'P2002') {
        return reply.code(409).send({ error: 'DEVICE_TOKEN_CONFLICT' });
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/push/devices/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const result = await database.pushDevice.updateMany({ where: { id: request.params.id, userId: user.id, disabledAt: null },
      data: { disabledAt: new Date() } });
    if (result.count === 0) return reply.code(404).send({ error: 'PUSH_DEVICE_NOT_FOUND' });
    return reply.code(204).send();
  });

  app.get('/push/preferences', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const preferences = await database.notificationPreference.findUnique({ where: { userId: user.id } });
    return serializePreferences(preferences);
  });

  app.patch('/push/preferences', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const parsed = notificationPreferencesInputSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const preferences = await database.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...parsed.data },
      update: parsed.data,
    });
    return serializePreferences(preferences);
  });
}
