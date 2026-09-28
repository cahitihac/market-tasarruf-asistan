import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@market/database';
import { emailProvider } from './email-provider.js';

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
const verificationDurationMs = 24 * 60 * 60 * 1000;
const passwordResetDurationMs = 15 * 60 * 1000;

export type ConsumerPrincipal = { id: string; email: string; displayName: string | null; emailVerifiedAt: Date | null };
export type ConsumerRequest = FastifyRequest & { consumerUser?: ConsumerPrincipal; consumerSessionId?: string };

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(left: Buffer, right: Buffer) {
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$16384$8$1$${salt}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  if (!encoded) return false;
  const [scheme, n, r, p, salt, hash] = encoded.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;
  if (Number(n) !== 16384 || Number(r) !== 8 || Number(p) !== 1) return false;
  const key = await scrypt(password, salt, Buffer.from(hash, 'base64url').length) as Buffer;
  return safeEqual(key, Buffer.from(hash, 'base64url'));
}

function safeUser(user: ConsumerPrincipal) {
  return { id: user.id, email: user.email, displayName: user.displayName, emailVerifiedAt: user.emailVerifiedAt };
}

function normalizedEmail(email: string) {
  return email.toLocaleLowerCase('en-US');
}

function sessionMetadata(request?: FastifyRequest) {
  const userAgent = request?.headers['user-agent'];
  return {
    clientLabel: typeof userAgent === 'string' && userAgent.trim() ? userAgent.slice(0, 160) : 'Development client',
    ipAddress: request?.ip ?? null,
  };
}

function baseUrl(request?: FastifyRequest) {
  const origin = request?.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('http')) return origin;
  return 'http://127.0.0.1:3001';
}

async function createAccountToken(userId: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET', durationMs: number) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await prisma.consumerAccountToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: now } });
  const record = await prisma.consumerAccountToken.create({ data: {
    userId, purpose, tokenHash: tokenHash(token), expiresAt: new Date(now.getTime() + durationMs),
  } });
  return { token, expiresAt: record.expiresAt };
}

export async function sendVerificationEmail(user: ConsumerPrincipal, request?: FastifyRequest) {
  const issued = await createAccountToken(user.id, 'EMAIL_VERIFICATION', verificationDurationMs);
  await emailProvider.sendVerificationEmail({
    email: user.email,
    expiresAt: issued.expiresAt,
    url: `${baseUrl(request)}/auth/verify-email?token=${encodeURIComponent(issued.token)}`,
  });
  return issued;
}

export async function sendVerificationEmailForAddress(email: string, request?: FastifyRequest) {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(email) },
    select: { id: true, email: true, displayName: true, emailVerifiedAt: true, status: true, deletedAt: true } });
  if (!user || user.status !== 'ACTIVE' || user.deletedAt || user.emailVerifiedAt) return;
  await sendVerificationEmail(user, request);
}

export async function sendPasswordResetEmail(email: string, request?: FastifyRequest) {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(email) } });
  if (!user || user.status !== 'ACTIVE' || user.deletedAt) return;
  const issued = await createAccountToken(user.id, 'PASSWORD_RESET', passwordResetDurationMs);
  await emailProvider.sendPasswordResetEmail({
    email: user.email,
    expiresAt: issued.expiresAt,
    url: `${baseUrl(request)}/auth/reset-password?token=${encodeURIComponent(issued.token)}`,
  });
}

export async function registerConsumer(input: { email: string; password: string; displayName?: string }, request?: FastifyRequest) {
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({ data: { email: normalizedEmail(input.email),
    passwordHash, displayName: input.displayName || null },
  select: { id: true, email: true, displayName: true, emailVerifiedAt: true } });
  const session = await createConsumerSession(user.id, request);
  await sendVerificationEmail(user, request);
  return { ...session, user: safeUser(user) };
}

export async function signInConsumer(email: string, password: string, request?: FastifyRequest) {
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail(email) } });
  if (!user || user.status !== 'ACTIVE' || user.deletedAt || !(await verifyPassword(password, user.passwordHash))) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const session = await createConsumerSession(user.id, request);
  return { ...session, user: safeUser(user) };
}

export async function createConsumerSession(userId: string, request?: FastifyRequest) {
  const token = randomBytes(32).toString('base64url');
  const session = await prisma.consumerSession.create({ data: { userId, tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + sessionDurationMs), ...sessionMetadata(request) } });
  return { token, sessionId: session.id, expiresAt: session.expiresAt };
}

export async function authenticateConsumer(request: FastifyRequest) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) return null;
  const session = await prisma.consumerSession.findUnique({ where: { tokenHash: tokenHash(token) },
    include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== 'ACTIVE' || session.user.deletedAt) return null;
  await prisma.consumerSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  return { sessionId: session.id, user: { id: session.user.id, email: session.user.email,
    displayName: session.user.displayName, emailVerifiedAt: session.user.emailVerifiedAt } satisfies ConsumerPrincipal };
}

export async function revokeConsumerSession(sessionId: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.consumerSession.update({ where: { id: sessionId }, data: { revokedAt: now } }),
    prisma.pushDevice.updateMany({ where: { sessionId, disabledAt: null }, data: { disabledAt: now } }),
    prisma.notificationDelivery.updateMany({ where: { status: 'PENDING', pushDevice: { sessionId } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Session revoked before push delivery.' } }),
  ]);
}

export async function verifyEmailToken(token: string) {
  const now = new Date();
  const record = await prisma.consumerAccountToken.findUnique({ where: { tokenHash: tokenHash(token) },
    include: { user: true } });
  if (!record || record.purpose !== 'EMAIL_VERIFICATION' || record.usedAt || record.expiresAt <= now ||
    record.user.status !== 'ACTIVE' || record.user.deletedAt) return false;
  await prisma.$transaction([
    prisma.consumerAccountToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: now } }),
  ]);
  return true;
}

export async function resetPasswordWithToken(token: string, password: string) {
  const now = new Date();
  const record = await prisma.consumerAccountToken.findUnique({ where: { tokenHash: tokenHash(token) },
    include: { user: true } });
  if (!record || record.purpose !== 'PASSWORD_RESET' || record.usedAt || record.expiresAt <= now ||
    record.user.status !== 'ACTIVE' || record.user.deletedAt) return false;
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.consumerAccountToken.update({ where: { id: record.id }, data: { usedAt: now } }),
    prisma.consumerAccountToken.updateMany({ where: { userId: record.userId, purpose: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: now } }),
    prisma.consumerSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.pushDevice.updateMany({ where: { userId: record.userId, disabledAt: null }, data: { disabledAt: now } }),
    prisma.notificationDelivery.updateMany({ where: { status: 'PENDING', notification: { userId: record.userId } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Sessions revoked before push delivery.' } }),
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
  ]);
  return true;
}

export async function changeConsumerPassword(userId: string, currentSessionId: string | undefined, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  const now = new Date();
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.consumerSession.updateMany({ where: { userId, revokedAt: null, id: currentSessionId ? { not: currentSessionId } : undefined },
      data: { revokedAt: now } }),
    prisma.pushDevice.updateMany({ where: { userId, disabledAt: null, sessionId: currentSessionId ? { not: currentSessionId } : undefined },
      data: { disabledAt: now } }),
    prisma.notificationDelivery.updateMany({ where: { status: 'PENDING', notification: { userId },
      pushDevice: { sessionId: currentSessionId ? { not: currentSessionId } : undefined } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Session revoked before push delivery.' } }),
  ]);
  return true;
}

export async function consumerSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.consumerSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return sessions.map(session => ({
    id: session.id,
    current: session.id === currentSessionId,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    clientLabel: session.clientLabel,
    ipAddress: session.ipAddress,
  }));
}

export async function revokeConsumerSessionForUser(userId: string, sessionId: string) {
  const now = new Date();
  const result = await prisma.$transaction(async tx => {
    const revoked = await tx.consumerSession.updateMany({ where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: now } });
    if (revoked.count === 0) return revoked;
    await tx.pushDevice.updateMany({ where: { userId, sessionId, disabledAt: null }, data: { disabledAt: now } });
    await tx.notificationDelivery.updateMany({ where: { status: 'PENDING', notification: { userId }, pushDevice: { sessionId } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Session revoked before push delivery.' } });
    return revoked;
  });
  return result.count > 0;
}

export async function revokeConsumerSessions(userId: string, currentSessionId: string | undefined, includeCurrent: boolean) {
  const now = new Date();
  const idFilter = includeCurrent || !currentSessionId ? undefined : { not: currentSessionId };
  await prisma.$transaction([
    prisma.consumerSession.updateMany({ where: { userId, revokedAt: null, id: idFilter }, data: { revokedAt: now } }),
    prisma.pushDevice.updateMany({ where: { userId, disabledAt: null, sessionId: idFilter }, data: { disabledAt: now } }),
    prisma.notificationDelivery.updateMany({ where: { status: 'PENDING', notification: { userId }, pushDevice: { sessionId: idFilter } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Session revoked before push delivery.' } }),
  ]);
}

export async function deleteConsumerAccount(userId: string, currentPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return false;
  const now = new Date();
  await prisma.$transaction([
    prisma.consumerSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.consumerAccountToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } }),
    prisma.pushDevice.updateMany({ where: { userId, disabledAt: null }, data: { disabledAt: now } }),
    prisma.notificationDelivery.updateMany({ where: { status: 'PENDING', notification: { userId } },
      data: { status: 'SKIPPED', failedAt: now, lastError: 'Account disabled before push delivery.' } }),
    prisma.user.update({ where: { id: userId }, data: {
      email: `deleted-${userId}@deleted.local`,
      displayName: null,
      passwordHash: null,
      emailVerifiedAt: null,
      status: 'DISABLED',
      deletedAt: now,
    } }),
  ]);
  return true;
}

export async function requireConsumer(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as ConsumerRequest).consumerUser;
  if (!user) {
    reply.code(401).send({ error: 'AUTH_REQUIRED' });
    return null;
  }
  return user;
}
