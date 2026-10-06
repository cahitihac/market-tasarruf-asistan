import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { database } from '@market/database';
import { evaluateNeed } from '@market/evaluation';
import { buildApp } from './app.js';
import { tokenHash } from './consumer-auth.js';

describe('consumer authentication and data isolation', () => {
  let app: FastifyInstance;
  const emails = [`auth-a-${Date.now()}@example.test`, `auth-b-${Date.now()}@example.test`];
  const userIds: string[] = [];
  const needIds: string[] = [];

  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => {
    await database.notification.deleteMany({ where: { userId: { in: userIds } } });
    await database.alert.deleteMany({ where: { userId: { in: userIds } } });
    await database.recommendation.deleteMany({ where: { userId: { in: userIds } } });
    await database.deal.deleteMany({ where: { userId: { in: userIds } } });
    await database.userNeed.deleteMany({ where: { id: { in: needIds } } });
    await database.consumerAccountToken.deleteMany({ where: { userId: { in: userIds } } });
    await database.consumerSession.deleteMany({ where: { userId: { in: userIds } } });
    await database.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  async function register(email: string, password = 'auth-test-password') {
    const response = await app.inject({ method: 'POST', url: '/auth/register', payload: { email, password, displayName: email } });
    expect(response.statusCode).toBe(201);
    userIds.push(response.json().user.id);
    return response.json() as { token: string; user: { id: string; email: string } };
  }

  const auth = (token: string) => ({ authorization: `Bearer ${token}` });
  const tokenFrom = (url: string) => new URL(url).searchParams.get('token')!;
  async function latestDevLink(email: string, type: 'verification' | 'password-reset') {
    const response = await app.inject('/auth/dev-email-links');
    expect(response.statusCode).toBe(200);
    const message = response.json().messages.find((item: { email: string; type: string }) => item.email === email && item.type === type);
    expect(message).toBeTruthy();
    return message.url as string;
  }

  it('registers, rejects duplicate email, logs in, returns /auth/me, and invalidates logout sessions', async () => {
    const first = await register(emails[0]!);
    const duplicate = await app.inject({ method: 'POST', url: '/auth/register',
      payload: { email: emails[0], password: 'auth-test-password' } });
    expect(duplicate.statusCode).toBe(409);

    const badPassword = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: emails[0], password: 'wrong-password' } });
    expect(badPassword.statusCode).toBe(401);
    const missingAccount = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: 'missing@example.test', password: 'wrong-password' } });
    expect(missingAccount.statusCode).toBe(401);

    const login = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: emails[0], password: 'auth-test-password' } });
    expect(login.statusCode).toBe(200);
    expect(login.json().user.email).toBe(emails[0]);
    expect(login.json().user.passwordHash).toBeUndefined();

    const me = await app.inject({ url: '/auth/me', headers: auth(login.json().token) });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.id).toBe(first.user.id);

    expect((await app.inject('/needs')).statusCode).toBe(401);
    const logout = await app.inject({ method: 'POST', url: '/auth/logout', headers: auth(login.json().token) });
    expect(logout.statusCode).toBe(204);
    expect((await app.inject({ url: '/auth/me', headers: auth(login.json().token) })).statusCode).toBe(401);
  });

  it('verifies email tokens once, rejects expired tokens, and resends verification links', async () => {
    const email = `verify-${Date.now()}@example.test`;
    const registered = await register(email, 'verify-test-password');
    expect(registered.user.email).toBe(email);
    expect((await database.user.findUniqueOrThrow({ where: { id: registered.user.id } })).emailVerifiedAt).toBeNull();

    const firstToken = tokenFrom(await latestDevLink(email, 'verification'));
    const verified = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { token: firstToken } });
    expect(verified.statusCode).toBe(200);
    expect((await database.user.findUniqueOrThrow({ where: { id: registered.user.id } })).emailVerifiedAt).toBeTruthy();

    const reused = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { token: firstToken } });
    expect(reused.statusCode).toBe(400);

    const unverified = await register(`verify-resend-${Date.now()}@example.test`, 'verify-test-password');
    const resend = await app.inject({ method: 'POST', url: '/auth/resend-verification', headers: auth(unverified.token), payload: {} });
    expect(resend.statusCode).toBe(200);

    const expiredToken = 'expired-verification-token-with-valid-length';
    await database.consumerAccountToken.create({ data: { userId: unverified.user.id, purpose: 'EMAIL_VERIFICATION',
      tokenHash: tokenHash(expiredToken), expiresAt: new Date(Date.now() - 1000) } });
    const expired = await app.inject({ method: 'POST', url: '/auth/verify-email', payload: { token: expiredToken } });
    expect(expired.statusCode).toBe(400);
  });

  it('handles forgot/reset password without account enumeration and invalidates old sessions', async () => {
    const email = `reset-${Date.now()}@example.test`;
    await register(email, 'old-reset-password');
    const login = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'old-reset-password' } });
    expect(login.statusCode).toBe(200);

    const unknown = await app.inject({ method: 'POST', url: '/auth/forgot-password',
      payload: { email: `missing-reset-${Date.now()}@example.test` } });
    expect(unknown.statusCode).toBe(200);
    const forgot = await app.inject({ method: 'POST', url: '/auth/forgot-password', payload: { email } });
    expect(forgot.statusCode).toBe(200);
    const resetToken = tokenFrom(await latestDevLink(email, 'password-reset'));

    const reset = await app.inject({ method: 'POST', url: '/auth/reset-password',
      payload: { token: resetToken, password: 'new-reset-password' } });
    expect(reset.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'old-reset-password' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'new-reset-password' } })).statusCode).toBe(200);
    expect((await app.inject({ url: '/auth/me', headers: auth(login.json().token) })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/reset-password',
      payload: { token: resetToken, password: 'another-reset-password' } })).statusCode).toBe(400);

    const expiredToken = 'expired-reset-token-with-valid-length';
    const user = await database.user.findUniqueOrThrow({ where: { email } });
    await database.consumerAccountToken.create({ data: { userId: user.id, purpose: 'PASSWORD_RESET',
      tokenHash: tokenHash(expiredToken), expiresAt: new Date(Date.now() - 1000) } });
    expect((await app.inject({ method: 'POST', url: '/auth/reset-password',
      payload: { token: expiredToken, password: 'expired-reset-password' } })).statusCode).toBe(400);
  });

  it('changes password, keeps the current session, and revokes other sessions', async () => {
    const email = `change-${Date.now()}@example.test`;
    await register(email, 'change-test-password');
    const current = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'change-test-password' } });
    const other = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'change-test-password' } });
    expect(current.statusCode).toBe(200);
    expect(other.statusCode).toBe(200);

    const bad = await app.inject({ method: 'POST', url: '/auth/change-password', headers: auth(current.json().token),
      payload: { currentPassword: 'wrong-password', newPassword: 'changed-password' } });
    expect(bad.statusCode).toBe(401);

    const changed = await app.inject({ method: 'POST', url: '/auth/change-password', headers: auth(current.json().token),
      payload: { currentPassword: 'change-test-password', newPassword: 'changed-password' } });
    expect(changed.statusCode).toBe(200);
    expect((await app.inject({ url: '/auth/me', headers: auth(current.json().token) })).statusCode).toBe(200);
    expect((await app.inject({ url: '/auth/me', headers: auth(other.json().token) })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'change-test-password' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'changed-password' } })).statusCode).toBe(200);
  });

  it('lists only own sessions, revokes other sessions, and supports logout all strategies', async () => {
    const owner = await register(`sessions-a-${Date.now()}@example.test`, 'sessions-test-password');
    const second = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: owner.user.email, password: 'sessions-test-password' } });
    const outsider = await register(`sessions-b-${Date.now()}@example.test`, 'sessions-test-password');
    const listed = await app.inject({ url: '/auth/sessions', headers: auth(owner.token) });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().sessions.length).toBeGreaterThanOrEqual(2);
    expect(listed.json().sessions.every((session: { id: string }) => typeof session.id === 'string')).toBe(true);
    const secondSessionId = second.json().sessionId as string;
    expect((await app.inject({ method: 'DELETE', url: `/auth/sessions/${secondSessionId}`, headers: auth(outsider.token) })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/auth/sessions/${secondSessionId}`, headers: auth(owner.token) })).statusCode).toBe(204);
    expect((await app.inject({ url: '/auth/me', headers: auth(second.json().token) })).statusCode).toBe(401);

    const third = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: owner.user.email, password: 'sessions-test-password' } });
    expect(third.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/auth/logout-all', headers: auth(owner.token),
      payload: { includeCurrent: false } })).statusCode).toBe(204);
    expect((await app.inject({ url: '/auth/me', headers: auth(owner.token) })).statusCode).toBe(200);
    expect((await app.inject({ url: '/auth/me', headers: auth(third.json().token) })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/auth/logout-all', headers: auth(owner.token),
      payload: { includeCurrent: true } })).statusCode).toBe(204);
    expect((await app.inject({ url: '/auth/me', headers: auth(owner.token) })).statusCode).toBe(401);
  });

  it('soft-deletes accounts with password and confirmation while retaining owned operational records', async () => {
    const email = `delete-${Date.now()}@example.test`;
    const account = await register(email, 'delete-test-password');
    const need = await app.inject({ method: 'POST', url: '/needs', headers: auth(account.token),
      payload: { name: 'Coffee', category: 'coffee' } });
    expect(need.statusCode).toBe(201);
    needIds.push(need.json().id);

    expect((await app.inject({ method: 'DELETE', url: '/account', headers: auth(account.token),
      payload: { currentPassword: 'wrong-password', confirmation: 'DELETE MY ACCOUNT' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'DELETE', url: '/account', headers: auth(account.token),
      payload: { currentPassword: 'delete-test-password', confirmation: 'delete my account' } })).statusCode).toBe(400);

    const deleted = await app.inject({ method: 'DELETE', url: '/account', headers: auth(account.token),
      payload: { currentPassword: 'delete-test-password', confirmation: 'DELETE MY ACCOUNT' } });
    expect(deleted.statusCode).toBe(204);
    expect((await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password: 'delete-test-password' } })).statusCode).toBe(401);
    expect((await app.inject({ url: '/auth/me', headers: auth(account.token) })).statusCode).toBe(401);
    const user = await database.user.findUniqueOrThrow({ where: { id: account.user.id } });
    expect(user.status).toBe('DISABLED');
    expect(user.deletedAt).toBeTruthy();
    expect(user.email).toBe(`deleted-${account.user.id}@deleted.local`);
    expect(await database.userNeed.findUnique({ where: { id: need.json().id } })).toBeTruthy();
  });

  it('isolates needs, deals, alerts and notifications across two consumers and preserves worker ownership', async () => {
    const userA = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: emails[0], password: 'auth-test-password' } });
    const userB = await register(emails[1]!);
    const tokenA = userA.json().token as string;
    const tokenB = userB.token;

    const needA = await app.inject({ method: 'POST', url: '/needs', headers: auth(tokenA), payload: {
      name: 'Dishwasher tablets', category: 'dishwasher-tablets', preferredBrands: ['Finish'], minimumCount: 40,
      allowAlternatives: false,
    } });
    expect(needA.statusCode).toBe(201);
    needIds.push(needA.json().id);
    const needB = await app.inject({ method: 'POST', url: '/needs', headers: auth(tokenB), payload: {
      name: 'Olive oil', category: 'olive-oil', preferredBrands: ['Komili'], minimumVolumeMl: 1000,
      allowAlternatives: true,
    } });
    expect(needB.statusCode).toBe(201);
    needIds.push(needB.json().id);

    const persistedNeedA = await database.userNeed.findUniqueOrThrow({ where: { id: needA.json().id },
      include: { category: { select: { slug: true, name: true } } } });
    const evaluatedA = await evaluateNeed(persistedNeedA);
    expect(evaluatedA.activeNeedsEvaluated).toBe(1);

    expect((await app.inject({ url: `/needs/${needA.json().id}`, headers: auth(tokenB) })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: `/needs/${needA.json().id}`, headers: auth(tokenB),
      payload: { minimumCount: 80 } })).statusCode).toBe(404);

    const dealsA = (await app.inject({ url: '/deals?all=true', headers: auth(tokenA) })).json().deals;
    expect(dealsA.length).toBeGreaterThan(0);
    expect(dealsA.every((deal: { needId: string }) => deal.needId === needA.json().id)).toBe(true);
    const dealA = dealsA[0];
    expect((await app.inject({ url: `/deals/${dealA.id}`, headers: auth(tokenB) })).statusCode).toBe(404);
    expect((await app.inject({ url: '/deals?all=true', headers: auth(tokenB) })).json().deals
      .every((deal: { needId: string }) => deal.needId !== needA.json().id)).toBe(true);

    const alertsA = (await app.inject({ url: '/alerts', headers: auth(tokenA) })).json().alerts;
    expect(alertsA.length).toBeGreaterThan(0);
    expect(alertsA.every((alert: { userId: string }) => alert.userId === userIds[0])).toBe(true);
    expect((await app.inject({ url: `/alerts/${alertsA[0].id}`, headers: auth(tokenB) })).statusCode).toBe(404);

    const notificationsA = (await app.inject({ url: '/notifications', headers: auth(tokenA) })).json().notifications;
    expect(notificationsA.length).toBeGreaterThan(0);
    expect(notificationsA.every((notification: { userId: string }) => notification.userId === userIds[0])).toBe(true);
    expect((await app.inject({ method: 'PATCH', url: `/notifications/${notificationsA[0].id}/read`,
      headers: auth(tokenB) })).statusCode).toBe(404);
  });

  it('keeps consumer and admin authentication separate', async () => {
    const consumer = await app.inject({ method: 'POST', url: '/auth/login',
      payload: { email: emails[0], password: 'auth-test-password' } });
    const dashboard = await app.inject({ url: '/admin/dashboard', headers: auth(consumer.json().token) });
    expect(dashboard.statusCode).toBe(401);
  });
});
