import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, prisma } from '@market/database';

export type AdminPrincipal = { id: string; email: string; role: 'ADMIN' | 'REVIEWER' | 'VIEWER'; displayName: string | null };
export type AdminRequest = FastifyRequest & { adminUser?: AdminPrincipal };

const roleRank: Record<AdminPrincipal['role'], number> = { VIEWER: 1, REVIEWER: 2, ADMIN: 3 };

export function passwordHash(password: string) {
  return createHash('sha256').update(`market-admin:${password}`).digest('hex');
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function signInAdmin(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user || !user.active || !safeEqual(user.passwordHash, passwordHash(password))) return null;
  const token = randomBytes(32).toString('base64url');
  const session = await prisma.adminSession.create({ data: { userId: user.id, tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) } });
  return { token, sessionId: session.id, user: { id: user.id, email: user.email, role: user.role,
    displayName: user.displayName } satisfies AdminPrincipal };
}

export async function authenticateAdmin(request: FastifyRequest) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : request.headers['x-admin-session'];
  if (!token || Array.isArray(token)) return null;
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: tokenHash(token) },
    include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) return null;
  return { id: session.user.id, email: session.user.email, role: session.user.role,
    displayName: session.user.displayName } satisfies AdminPrincipal;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply, minimumRole: AdminPrincipal['role']) {
  const user = (request as AdminRequest).adminUser;
  if (!user) {
    reply.code(401).send({ error: 'ADMIN_AUTH_REQUIRED' });
    return null;
  }
  if (roleRank[user.role] < roleRank[minimumRole]) {
    reply.code(403).send({ error: 'ADMIN_FORBIDDEN', requiredRole: minimumRole, role: user.role });
    return null;
  }
  return user;
}

export function snapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export async function auditLog(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  requestId?: string;
  metadata?: unknown;
}) {
  return prisma.adminAuditLog.create({ data: { actorId: input.actorId ?? undefined, action: input.action,
    entityType: input.entityType, entityId: input.entityId,
    beforeSnapshot: input.before === undefined ? undefined : snapshot(input.before),
    afterSnapshot: input.after === undefined ? undefined : snapshot(input.after),
    reason: input.reason ?? undefined, requestId: input.requestId,
    metadata: input.metadata === undefined ? Prisma.JsonNull : snapshot(input.metadata) } });
}
