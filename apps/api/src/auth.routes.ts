import type { FastifyInstance, FastifyReply } from 'fastify';
import { Database } from '@market/database';
import { z } from 'zod';
import {
  authenticateConsumer, changeConsumerPassword, consumerSessions, deleteConsumerAccount, registerConsumer, requireConsumer,
  resetPasswordWithToken, revokeConsumerSession, revokeConsumerSessionForUser, revokeConsumerSessions, sendPasswordResetEmail,
  sendVerificationEmail, sendVerificationEmailForAddress, signInConsumer, verifyEmailToken,
  type ConsumerRequest,
} from './consumer-auth.js';
import { developmentEmailMessages } from './email-provider.js';

const credentialsSchema = z.object({ email: z.string().email().transform(value => value.toLocaleLowerCase('en-US')),
  password: z.string().min(8).max(256) });
const registerSchema = credentialsSchema.extend({ displayName: z.string().trim().min(1).max(80).optional() });
const tokenSchema = z.object({ token: z.string().min(32).max(512) });
const optionalEmailSchema = z.object({ email: z.string().email().transform(value => value.toLocaleLowerCase('en-US')).optional() }).optional();
const forgotPasswordSchema = z.object({ email: z.string().email().transform(value => value.toLocaleLowerCase('en-US')) });
const resetPasswordSchema = tokenSchema.extend({ password: z.string().min(8).max(256) });
const changePasswordSchema = z.object({ currentPassword: z.string().min(8).max(256), newPassword: z.string().min(8).max(256) });
const logoutAllSchema = z.object({ includeCurrent: z.boolean().optional() }).optional();
const deleteAccountSchema = z.object({ currentPassword: z.string().min(8).max(256), confirmation: z.literal('DELETE MY ACCOUNT') });

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({ error: 'VALIDATION_ERROR', issues: error.issues.map(issue => ({
    path: issue.path.join('.'), message: issue.message,
  })) });
}

function authResponse(result: Awaited<ReturnType<typeof registerConsumer>>) {
  return { token: result.token, sessionId: result.sessionId, expiresAt: result.expiresAt, user: result.user };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.addHook('onRequest', async request => {
    if (request.method === 'OPTIONS' || request.url.startsWith('/admin')) return;
    const result = await authenticateConsumer(request);
    if (!result) return;
    (request as ConsumerRequest).consumerUser = result.user;
    (request as ConsumerRequest).consumerSessionId = result.sessionId;
  });

  app.post('/auth/register', { config: { rateLimit: { max: 50, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    try {
      const result = await registerConsumer(parsed.data, request);
      return reply.code(201).send(authResponse(result));
    } catch (error) {
      if (error instanceof Database.RequestError && error.code === 'P2002') {
        return reply.code(409).send({ error: 'EMAIL_ALREADY_REGISTERED', message: 'Bu e-posta adresi zaten kayıtlı.' });
      }
      throw error;
    }
  });

  app.post('/auth/login', { config: { rateLimit: { max: 50, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const result = await signInConsumer(parsed.data.email, parsed.data.password, request);
    if (!result) return reply.code(401).send({ error: 'INVALID_CREDENTIALS', message: 'E-posta veya şifre hatalı.' });
    return authResponse(result);
  });

  app.post('/auth/verify-email', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = tokenSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    if (!(await verifyEmailToken(parsed.data.token))) {
      return reply.code(400).send({ error: 'INVALID_OR_EXPIRED_TOKEN', message: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.' });
    }
    return { ok: true };
  });

  app.post('/auth/resend-verification', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = optionalEmailSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const user = (request as ConsumerRequest).consumerUser;
    if (user) {
      if (!user.emailVerifiedAt) await sendVerificationEmail(user, request);
      return { ok: true, message: 'E-posta adresi kayıtlıysa doğrulama bağlantısı gönderildi.' };
    }
    if (parsed.data?.email) await sendVerificationEmailForAddress(parsed.data.email, request);
    return { ok: true, message: 'E-posta adresi kayıtlıysa doğrulama bağlantısı gönderildi.' };
  });

  app.post('/auth/forgot-password', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    await sendPasswordResetEmail(parsed.data.email, request);
    return { ok: true, message: 'E-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.' };
  });

  app.post('/auth/reset-password', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    if (!(await resetPasswordWithToken(parsed.data.token, parsed.data.password))) {
      return reply.code(400).send({ error: 'INVALID_OR_EXPIRED_TOKEN', message: 'Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.' });
    }
    return { ok: true };
  });

  app.post('/auth/change-password', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    const changed = await changeConsumerPassword(user.id, (request as ConsumerRequest).consumerSessionId,
      parsed.data.currentPassword, parsed.data.newPassword);
    if (!changed) return reply.code(401).send({ error: 'INVALID_CURRENT_PASSWORD', message: 'Mevcut şifre hatalı.' });
    return { ok: true, message: 'Şifren güncellendi. Diğer oturumların kapatıldı.' };
  });

  app.post('/auth/logout', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const sessionId = (request as ConsumerRequest).consumerSessionId;
    if (sessionId) await revokeConsumerSession(sessionId);
    return reply.code(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    return user ? { user } : undefined;
  });

  app.get('/auth/sessions', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const sessions = await consumerSessions(user.id, (request as ConsumerRequest).consumerSessionId);
    return { sessions };
  });

  app.delete<{ Params: { id: string } }>('/auth/sessions/:id', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    if (!(await revokeConsumerSessionForUser(user.id, request.params.id))) return reply.code(404).send({ error: 'NOT_FOUND' });
    return reply.code(204).send();
  });

  app.post('/auth/logout-all', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const parsed = logoutAllSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    await revokeConsumerSessions(user.id, (request as ConsumerRequest).consumerSessionId, parsed.data?.includeCurrent ?? true);
    return reply.code(204).send();
  });

  app.delete('/account', async (request, reply) => {
    const user = await requireConsumer(request, reply);
    if (!user) return;
    const parsed = deleteAccountSchema.safeParse(request.body);
    if (!parsed.success) return validationError(reply, parsed.error);
    if (!(await deleteConsumerAccount(user.id, parsed.data.currentPassword))) {
      return reply.code(401).send({ error: 'INVALID_CURRENT_PASSWORD', message: 'Mevcut şifre hatalı.' });
    }
    return reply.code(204).send();
  });

  app.get('/auth/dev-email-links', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') return reply.code(404).send({ error: 'NOT_FOUND' });
    return { messages: developmentEmailMessages() };
  });
}
