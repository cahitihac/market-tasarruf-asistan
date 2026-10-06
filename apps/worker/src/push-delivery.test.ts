import { afterAll, describe, expect, it } from 'vitest';
import { Database, database } from '@market/database';
import { deliverNotificationPush, enqueueNotificationPushDeliveries } from './push-delivery.js';
import { MockPushProvider } from './push-provider.js';

const userIds: string[] = [];
const categoryIds: string[] = [];
const productIds: string[] = [];
const variantIds: string[] = [];
const chainIds: string[] = [];
const retailerProductIds: string[] = [];
const observationIds: string[] = [];

const queue = () => {
  const jobs: Array<{ name: string; data: unknown; opts?: unknown }> = [];
  return { jobs, add: async (name: string, data: unknown, opts?: unknown) => { jobs.push({ name, data, opts }); return null; } };
};

async function fixture(label: 'BUY' | 'GREAT_DEAL' = 'GREAT_DEAL') {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await database.user.create({ data: { email: `push-worker-${suffix}@example.test` } });
  userIds.push(user.id);
  const category = await database.category.create({ data: { slug: `push-cat-${suffix}`, name: 'Bulaşık Tableti' } });
  categoryIds.push(category.id);
  const product = await database.product.create({ data: { name: 'Finish Quantum', normalizedName: `finish quantum ${suffix}`,
    categoryId: category.id } });
  productIds.push(product.id);
  const variant = await database.productVariant.create({ data: { productId: product.id, label: '40 tablet', quantity: 40, unit: 'piece' } });
  variantIds.push(variant.id);
  const chain = await database.storeChain.create({ data: { slug: `push-chain-${suffix}`, name: 'CarrefourSA' } });
  chainIds.push(chain.id);
  const retailerProduct = await database.retailerProduct.create({ data: { chainId: chain.id, externalId: `push-rp-${suffix}`,
    rawName: 'Finish Quantum 40 Tablet', normalizedName: `finish quantum 40 ${suffix}`, variantId: variant.id } });
  retailerProductIds.push(retailerProduct.id);
  const observation = await database.priceObservation.create({ data: { sourceKey: `push-obs-${suffix}`,
    retailerProductId: retailerProduct.id, observedAt: new Date(), priceMinor: 27900 } });
  observationIds.push(observation.id);
  const need = await database.userNeed.create({ data: { userId: user.id, title: 'Finish tablet', categoryId: category.id } });
  const deal = await database.deal.create({ data: { snapshotKey: `push-deal-${suffix}`, userId: user.id, needId: need.id,
    canonicalProductId: product.id, retailerProductId: retailerProduct.id, observationId: observation.id,
    productName: product.name, retailerName: chain.name, currentPriceMinor: 27900, unitPriceMinor: 698,
    unitBasis: 'piece', matchScore: 92, score: 96, label, action: 'BUY',
    reasons: ['good_discount'] as Database.InputJsonValue, matchReasons: ['brand_match'] as Database.InputJsonValue,
    priceStatistics: { differenceFrom90dPercent: -34, sampleCount: 10 } as Database.InputJsonValue,
    observedAt: new Date() } });
  const alert = await database.alert.create({ data: { dedupeKey: `push-alert-${suffix}`, userId: user.id, needId: need.id, dealId: deal.id } });
  const notification = await database.notification.create({ data: { userId: user.id, alertId: alert.id, type: 'DEAL_ALERT',
    title: 'Finish Quantum için fırsat', body: "CarrefourSA'da 279 TL. Son 90 gün ortalamasından %34 daha ucuz." } });
  return { user, deal, notification };
}

async function enablePush(userId: string, tokenSuffix: string, enabled = true) {
  await database.notificationPreference.upsert({ where: { userId },
    create: { userId, dealAlertsEnabled: enabled, greatDealEnabled: enabled, buyEnabled: enabled },
    update: { dealAlertsEnabled: enabled, greatDealEnabled: enabled, buyEnabled: enabled } });
  return database.pushDevice.create({ data: { userId, expoPushToken: `ExpoPushToken[${tokenSuffix}]`, platform: 'IOS' } });
}

describe('push delivery worker', () => {
  afterAll(async () => {
    await database.notificationDelivery.deleteMany({ where: { notification: { userId: { in: userIds } } } });
    await database.pushDevice.deleteMany({ where: { userId: { in: userIds } } });
    await database.notification.deleteMany({ where: { userId: { in: userIds } } });
    await database.alert.deleteMany({ where: { userId: { in: userIds } } });
    await database.recommendation.deleteMany({ where: { userId: { in: userIds } } });
    await database.deal.deleteMany({ where: { userId: { in: userIds } } });
    await database.userNeed.deleteMany({ where: { userId: { in: userIds } } });
    await database.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
    await database.user.deleteMany({ where: { id: { in: userIds } } });
    await database.priceObservation.deleteMany({ where: { id: { in: observationIds } } });
    await database.retailerProduct.deleteMany({ where: { id: { in: retailerProductIds } } });
    await database.productVariant.deleteMany({ where: { id: { in: variantIds } } });
    await database.product.deleteMany({ where: { id: { in: productIds } } });
    await database.category.deleteMany({ where: { id: { in: categoryIds } } });
    await database.storeChain.deleteMany({ where: { id: { in: chainIds } } });
    await database.$disconnect();
  });

  it('creates one delivery per owned device and sends a safe deal deep-link payload', async () => {
    const data = await fixture('GREAT_DEAL');
    await enablePush(data.user.id, 'workerSuccessAAAAAAAA');
    const stub = queue();
    await enqueueNotificationPushDeliveries(data.notification.id, stub);
    await enqueueNotificationPushDeliveries(data.notification.id, stub);
    expect(await database.notificationDelivery.count({ where: { notificationId: data.notification.id } })).toBe(1);
    const delivery = await database.notificationDelivery.findFirstOrThrow({ where: { notificationId: data.notification.id } });
    const provider = new MockPushProvider();
    await deliverNotificationPush(delivery.id, provider);
    await deliverNotificationPush(delivery.id, provider);
    expect(provider.messages).toHaveLength(1);
    expect(provider.messages[0]).toMatchObject({ title: 'Finish Quantum için fırsat',
      data: { type: 'DEAL', dealId: data.deal.id } });
    expect(await database.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } }))
      .toMatchObject({ status: 'SENT', providerMessageId: 'mock-ticket-1' });
  });

  it('marks temporary provider failures as failed and leaves them retryable', async () => {
    const data = await fixture('BUY');
    await enablePush(data.user.id, 'workerRetryBBBBBBBBB');
    const stub = queue();
    await enqueueNotificationPushDeliveries(data.notification.id, stub);
    const delivery = await database.notificationDelivery.findFirstOrThrow({ where: { notificationId: data.notification.id } });
    await expect(deliverNotificationPush(delivery.id, new MockPushProvider('temporary-failure'))).rejects.toThrow('Mock temporary failure');
    const failed = await database.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(failed.status).toBe('FAILED');
    expect(failed.attemptCount).toBe(1);
    const provider = new MockPushProvider();
    await deliverNotificationPush(delivery.id, provider);
    expect((await database.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status).toBe('SENT');
  });

  it('disables permanently invalid Expo tokens without retrying forever', async () => {
    const data = await fixture('GREAT_DEAL');
    const device = await enablePush(data.user.id, 'workerInvalidCCCCCCC');
    const stub = queue();
    await enqueueNotificationPushDeliveries(data.notification.id, stub);
    const delivery = await database.notificationDelivery.findFirstOrThrow({ where: { notificationId: data.notification.id } });
    await deliverNotificationPush(delivery.id, new MockPushProvider('invalid-token'));
    expect((await database.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status).toBe('INVALID_TOKEN');
    expect((await database.pushDevice.findUniqueOrThrow({ where: { id: device.id } })).disabledAt).toBeTruthy();
  });

  it('skips disabled preferences and disabled devices', async () => {
    const prefsOff = await fixture('GREAT_DEAL');
    await enablePush(prefsOff.user.id, 'workerPrefsDDDDDDDD', false);
    const stub = queue();
    await enqueueNotificationPushDeliveries(prefsOff.notification.id, stub);
    expect(stub.jobs).toHaveLength(0);
    expect((await database.notificationDelivery.findFirstOrThrow({ where: { notificationId: prefsOff.notification.id } })).status)
      .toBe('SKIPPED');

    const disabled = await fixture('BUY');
    const device = await enablePush(disabled.user.id, 'workerDisabledEEEEEE');
    const delivery = await database.notificationDelivery.create({ data: { notificationId: disabled.notification.id, pushDeviceId: device.id } });
    await database.pushDevice.update({ where: { id: device.id }, data: { disabledAt: new Date() } });
    await deliverNotificationPush(delivery.id, new MockPushProvider());
    expect((await database.notificationDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status).toBe('SKIPPED');
  });

  it('never delivers user A notifications to user B devices', async () => {
    const userA = await fixture('GREAT_DEAL');
    const userB = await fixture('GREAT_DEAL');
    await enablePush(userB.user.id, 'workerUserBFFFFFFFFF');
    const stub = queue();
    await enqueueNotificationPushDeliveries(userA.notification.id, stub);
    expect(await database.notificationDelivery.count({ where: { notificationId: userA.notification.id } })).toBe(0);
  });
});
