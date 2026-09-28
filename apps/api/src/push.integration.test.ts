import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@market/database';
import { buildApp } from './app.js';

describe('push devices and notification preferences', () => {
  let app: FastifyInstance;
  const userIds: string[] = [];
  const auth = (token: string) => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => {
    await prisma.notificationDelivery.deleteMany({ where: { pushDevice: { userId: { in: userIds } } } });
    await prisma.pushDevice.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.consumerAccountToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.consumerSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  async function register(email: string, password = 'push-test-password') {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: email } });
    expect(response.statusCode).toBe(201);
    userIds.push(response.json().user.id);
    return response.json() as { token: string; sessionId: string; user: { id: string; email: string } };
  }

  it('registers a push device, de-duplicates active registration, and updates lastSeenAt', async () => {
    const account = await register(`push-a-${Date.now()}@example.test`);
    const token = 'ExpoPushToken[pushDeviceAAAAAAAAAAAA]';
    const first = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(account.token),
      payload: { expoPushToken: token, platform: 'IOS', deviceName: 'iPhone', appVersion: '1.0.0' } });
    expect(first.statusCode).toBe(201);
    const second = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(account.token),
      payload: { expoPushToken: token, platform: 'IOS', deviceName: 'iPhone 15', appVersion: '1.0.1' } });
    expect(second.statusCode).toBe(201);
    expect(second.json().id).toBe(first.json().id);
    expect(second.json().deviceName).toBe('iPhone 15');
    const listed = await app.inject({ url: '/push/devices', headers: auth(account.token) });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().devices).toHaveLength(1);
    expect(listed.json().devices[0].expoPushToken).toBe(token);
  });

  it('moves a token between authenticated users without exposing device tokens cross-account', async () => {
    const userA = await register(`push-move-a-${Date.now()}@example.test`);
    const userB = await register(`push-move-b-${Date.now()}@example.test`);
    const token = 'ExpoPushToken[tokenMoveBBBBBBBBBBB]';
    const first = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(userA.token),
      payload: { expoPushToken: token, platform: 'ANDROID' } });
    expect(first.statusCode).toBe(201);
    const moved = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(userB.token),
      payload: { expoPushToken: token, platform: 'ANDROID' } });
    expect(moved.statusCode).toBe(201);
    expect(moved.json().id).toBe(first.json().id);
    expect((await app.inject({ url: '/push/devices', headers: auth(userA.token) })).json().devices).toHaveLength(0);
    expect((await app.inject({ url: '/push/devices', headers: auth(userB.token) })).json().devices).toHaveLength(1);
  });

  it('rejects invalid tokens and prevents unregistering another user device', async () => {
    const owner = await register(`push-owner-${Date.now()}@example.test`);
    const outsider = await register(`push-outsider-${Date.now()}@example.test`);
    const invalid = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(owner.token),
      payload: { expoPushToken: 'not-a-token', platform: 'IOS' } });
    expect(invalid.statusCode).toBe(400);
    const registered = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(owner.token),
      payload: { expoPushToken: 'ExpoPushToken[tokenOwnerCCCCCCCCCC]', platform: 'IOS' } });
    expect(registered.statusCode).toBe(201);
    expect((await app.inject({ method: 'DELETE', url: `/push/devices/${registered.json().id}`, headers: auth(outsider.token) })).statusCode)
      .toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/push/devices/${registered.json().id}`, headers: auth(owner.token) })).statusCode)
      .toBe(204);
    expect((await app.inject({ url: '/push/devices', headers: auth(owner.token) })).json().devices).toHaveLength(0);
  });

  it('stores conservative preferences and supports opt-in updates', async () => {
    const account = await register(`push-prefs-${Date.now()}@example.test`);
    const defaults = await app.inject({ url: '/push/preferences', headers: auth(account.token) });
    expect(defaults.statusCode).toBe(200);
    expect(defaults.json()).toMatchObject({ dealAlertsEnabled: false, greatDealEnabled: false, buyEnabled: false });
    const updated = await app.inject({ method: 'PATCH', url: '/push/preferences', headers: auth(account.token),
      payload: { dealAlertsEnabled: true, greatDealEnabled: true, buyEnabled: false } });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ dealAlertsEnabled: true, greatDealEnabled: true, buyEnabled: false });
  });

  it('disables current-session devices on logout and all devices on account deletion', async () => {
    const logoutAccount = await register(`push-logout-${Date.now()}@example.test`);
    const logoutDevice = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(logoutAccount.token),
      payload: { expoPushToken: 'ExpoPushToken[tokenLogoutDDDDDDDD]', platform: 'IOS' } });
    expect(logoutDevice.statusCode).toBe(201);
    expect((await app.inject({ method: 'POST', url: '/auth/logout', headers: auth(logoutAccount.token) })).statusCode).toBe(204);
    expect((await prisma.pushDevice.findUniqueOrThrow({ where: { id: logoutDevice.json().id } })).disabledAt).toBeTruthy();

    const deleteAccount = await register(`push-delete-${Date.now()}@example.test`, 'delete-push-password');
    const deleteDevice = await app.inject({ method: 'POST', url: '/push/devices', headers: auth(deleteAccount.token),
      payload: { expoPushToken: 'ExpoPushToken[tokenDeleteEEEEEEEE]', platform: 'ANDROID' } });
    expect(deleteDevice.statusCode).toBe(201);
    const deleted = await app.inject({ method: 'DELETE', url: '/account', headers: auth(deleteAccount.token),
      payload: { currentPassword: 'delete-push-password', confirmation: 'DELETE MY ACCOUNT' } });
    expect(deleted.statusCode).toBe(204);
    expect((await prisma.pushDevice.findUniqueOrThrow({ where: { id: deleteDevice.json().id } })).disabledAt).toBeTruthy();
  });
});
