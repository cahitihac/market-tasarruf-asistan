import { database } from '@market/database';

type RecordValue = { body: string };
type Event = { Records?: RecordValue[] };
type PushStatus = { deliveryId: string; status: 'SENT' | 'INVALID_TOKEN' | 'FAILED'; providerMessageId?: string; error?: string };

export async function pushStatusHandler(event: Event) {
  for (const record of event.Records ?? []) {
    const status = JSON.parse(record.body) as PushStatus;
    if (!status.deliveryId || !status.status) throw new Error('Invalid push status message');
    const delivery = await database.notificationDelivery.findUnique({ where: { id: status.deliveryId } });
    if (!delivery || ['SENT', 'INVALID_TOKEN', 'SKIPPED'].includes(delivery.status)) continue;
    if (status.status === 'SENT') {
      await database.$transaction(async tx => {
        await tx.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'SENT', providerMessageId: status.providerMessageId, sentAt: new Date(), failedAt: null, lastError: null,
        } });
        await tx.pushDevice.update({ where: { id: delivery.pushDeviceId }, data: { lastDeliveryAt: new Date() } });
      });
    } else if (status.status === 'INVALID_TOKEN') {
      await database.$transaction(async tx => {
        await tx.notificationDelivery.update({ where: { id: delivery.id }, data: {
          status: 'INVALID_TOKEN', failedAt: new Date(), lastError: status.error ?? 'Invalid push token.',
        } });
        await tx.pushDevice.update({ where: { id: delivery.pushDeviceId }, data: { disabledAt: new Date() } });
      });
    } else {
      await database.notificationDelivery.update({ where: { id: delivery.id }, data: {
        status: 'FAILED', failedAt: new Date(), lastError: status.error ?? 'Push delivery failed.',
      } });
    }
  }
}
