import { Database, database, type NotificationDeliveryStatus } from '@market/database';
import { configuredPushProvider, PushProviderError, type PushData, type PushMessage, type PushProvider } from './push-provider.js';

export const pushQueueName = 'push-delivery';
export const deliverPushJobName = 'deliver-notification-push';
export const enqueuePendingPushJobName = 'enqueue-pending-push-deliveries';

type PushQueueLike = {
  add(name: string, data: unknown, opts?: unknown): Promise<unknown>;
};

const deliveryInclude = { notification: { include: { alert: { include: { deal: true } }, user: true } },
  pushDevice: true } as const;

function preferenceAllows(preferences: { dealAlertsEnabled?: boolean; greatDealEnabled?: boolean; buyEnabled?: boolean } | null,
  label: string) {
  if (!preferences?.dealAlertsEnabled) return false;
  if (label === 'GREAT_DEAL') return preferences.greatDealEnabled;
  if (label === 'BUY') return preferences.buyEnabled;
  return false;
}

function pushMessageForDelivery(delivery: Database.NotificationDeliveryGetPayload<{ include: typeof deliveryInclude }>): PushMessage {
  const deal = delivery.notification.alert.deal;
  return {
    to: delivery.pushDevice.expoPushToken,
    title: delivery.notification.title,
    body: delivery.notification.body,
    sound: 'default',
    data: { type: 'DEAL', dealId: deal.id } satisfies PushData,
  };
}

async function addDeliveryJob(queue: PushQueueLike, deliveryId: string, message: PushMessage) {
  await queue.add(deliverPushJobName, { deliveryId, message }, {
    jobId: deliveryId,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 500,
    removeOnFail: 500,
  });
}

async function createDelivery(notificationId: string, pushDeviceId: string, status: NotificationDeliveryStatus, lastError?: string) {
  try {
    return await database.notificationDelivery.create({ data: { notificationId, pushDeviceId, status, lastError,
      failedAt: status === 'SKIPPED' ? new Date() : null } });
  } catch (error) {
    if (error instanceof Database.RequestError && error.code === 'P2002') {
      return database.notificationDelivery.findUniqueOrThrow({ where: {
        notificationId_pushDeviceId_channel: { notificationId, pushDeviceId, channel: 'PUSH' },
      } });
    }
    throw error;
  }
}

export async function enqueueNotificationPushDeliveries(notificationId: string, queue: PushQueueLike) {
  const notification = await database.notification.findUnique({ where: { id: notificationId },
    include: { alert: { include: { deal: true } }, user: true } });
  if (!notification || notification.user.status !== 'ACTIVE' || notification.user.deletedAt) return { created: 0, queued: 0, skipped: 0 };
  const devices = await database.pushDevice.findMany({ where: { userId: notification.userId, disabledAt: null }, orderBy: { createdAt: 'asc' } });
  if (devices.length === 0) return { created: 0, queued: 0, skipped: 0 };
  const preferences = await database.notificationPreference.findUnique({ where: { userId: notification.userId } });
  const allowed = preferenceAllows(preferences, notification.alert.deal.label);
  let created = 0;
  let queued = 0;
  let skipped = 0;
  for (const device of devices) {
    const delivery = await createDelivery(notification.id, device.id, allowed ? 'PENDING' : 'SKIPPED',
      allowed ? undefined : 'User notification preferences skip this deal notification.');
    if (delivery.createdAt.getTime() === delivery.updatedAt.getTime()) created++;
    if (delivery.status === 'SKIPPED') {
      skipped++;
      continue;
    }
    if (delivery.status === 'PENDING' || delivery.status === 'FAILED') {
      await addDeliveryJob(queue, delivery.id, {
        to: device.expoPushToken,
        title: notification.title,
        body: notification.body,
        sound: 'default',
        data: { type: 'DEAL', dealId: notification.alert.deal.id },
      });
      queued++;
    }
  }
  return { created, queued, skipped };
}

export async function enqueuePendingPushDeliveries(queue: PushQueueLike, limit = 100) {
  const notifications = await database.notification.findMany({ where: { deliveries: { none: {} } },
    select: { id: true }, orderBy: { createdAt: 'asc' }, take: limit });
  let created = 0;
  let queued = 0;
  let skipped = 0;
  for (const notification of notifications) {
    const result = await enqueueNotificationPushDeliveries(notification.id, queue);
    created += result.created;
    queued += result.queued;
    skipped += result.skipped;
  }
  return { scanned: notifications.length, created, queued, skipped };
}

function deliveryLog(delivery: Database.NotificationDeliveryGetPayload<{ include: typeof deliveryInclude }>, extra: Record<string, unknown>) {
  return {
    event: 'push_delivery',
    notificationId: delivery.notificationId,
    deliveryId: delivery.id,
    provider: 'expo',
    attempt: delivery.attemptCount + 1,
    ...extra,
  };
}

export async function deliverNotificationPush(deliveryId: string, provider: PushProvider = configuredPushProvider()) {
  const delivery = await database.notificationDelivery.findUnique({ where: { id: deliveryId }, include: deliveryInclude });
  if (!delivery || delivery.channel !== 'PUSH') return;
  if (delivery.status === 'SENT' || delivery.status === 'INVALID_TOKEN' || delivery.status === 'SKIPPED') {
    console.log(JSON.stringify(delivery ? deliveryLog(delivery, { status: delivery.status.toLowerCase(), skipped: true }) :
      { event: 'push_delivery_missing', deliveryId }));
    return;
  }
  if (delivery.pushDevice.disabledAt || delivery.notification.user.status !== 'ACTIVE' || delivery.notification.user.deletedAt) {
    await database.notificationDelivery.update({ where: { id: delivery.id }, data: {
      status: 'SKIPPED', failedAt: new Date(), lastError: 'Device or account is disabled.',
    } });
    console.log(JSON.stringify(deliveryLog(delivery, { status: 'skipped', failureClass: 'disabled' })));
    return;
  }
  try {
    await database.notificationDelivery.update({ where: { id: delivery.id }, data: { attemptCount: { increment: 1 } } });
    const result = await provider.send(pushMessageForDelivery(delivery));
    if (result.status === 'ok') {
      await database.$transaction(async tx => {
        await tx.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'SENT', providerMessageId: result.providerMessageId, sentAt: new Date(), failedAt: null, lastError: null,
        } });
        await tx.pushDevice.update({ where: { id: delivery.pushDeviceId }, data: { lastDeliveryAt: new Date() } });
      });
      console.log(JSON.stringify(deliveryLog(delivery, { status: 'sent', providerMessageId: result.providerMessageId })));
      return;
    }
    if (result.status === 'invalid-token') {
      await database.$transaction(async tx => {
        await tx.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'INVALID_TOKEN', failedAt: new Date(), lastError: result.error ?? 'Invalid Expo push token.',
        } });
        await tx.pushDevice.update({ where: { id: delivery.pushDeviceId }, data: { disabledAt: new Date() } });
      });
      console.log(JSON.stringify(deliveryLog(delivery, { status: 'invalid_token', failureClass: 'invalid-token' })));
      return;
    }
    await database.notificationDelivery.update({ where: { id: delivery.id }, data: {
      status: 'FAILED', failedAt: new Date(), lastError: result.error ?? 'Expo push delivery failed.',
    } });
    console.error(JSON.stringify(deliveryLog(delivery, { status: 'failed', failureClass: 'provider-error' })));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const kind = error instanceof PushProviderError ? error.kind : 'temporary';
    if (kind === 'invalid-token') {
      await database.$transaction(async tx => {
        await tx.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'INVALID_TOKEN', failedAt: new Date(), lastError: message,
        } });
        await tx.pushDevice.update({ where: { id: delivery.pushDeviceId }, data: { disabledAt: new Date() } });
      });
      console.log(JSON.stringify(deliveryLog(delivery, { status: 'invalid_token', failureClass: kind })));
      return;
    }
    await database.notificationDelivery.update({ where: { id: delivery.id }, data: {
      status: 'FAILED', failedAt: new Date(), lastError: message,
    } });
    console.error(JSON.stringify(deliveryLog(delivery, { status: 'failed', failureClass: kind, error: message })));
    if (kind === 'temporary') throw error;
  }
}
