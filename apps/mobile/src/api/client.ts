import {
  authResponseSchema, changePasswordInputSchema, createNeedSchema, dealResponseSchema, dealsResponseSchema, deleteAccountInputSchema,
  forgotPasswordInputSchema, genericMessageResponseSchema, healthSchema, loginInputSchema, meResponseSchema, needResponseSchema,
  needsResponseSchema, notificationPreferencesInputSchema, notificationPreferencesResponseSchema, notificationResponseSchema,
  notificationsResponseSchema, offersResponseSchema, priceHistoryResponseSchema, pushDeviceInputSchema, pushDeviceResponseSchema,
  pushDevicesResponseSchema, registerInputSchema, resetPasswordInputSchema, sessionsResponseSchema, updateNeedSchema,
  verifyEmailInputSchema, type ChangePasswordInput, type CreateNeedInput, type DeleteAccountInput, type ForgotPasswordInput,
  type LoginInput, type NotificationPreferencesInput, type PushDeviceInput, type RegisterInput, type ResetPasswordInput,
  type UpdateNeedInput, type VerifyEmailInput,
} from '@market/contracts';
import { z } from 'zod';
import { apiUrl } from './config';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = 'ApiError'; }
}

export function friendlyError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Şu anda bağlantı kuramıyoruz. İnternet bağlantını kontrol edip yeniden dene.';
}

let authTokenProvider: (() => string | null) | null = null;
export function setAuthTokenProvider(provider: () => string | null) {
  authTokenProvider = provider;
}

export async function request<T extends z.ZodTypeAny>(path: string, schema: T, options: RequestInit = {},
  baseUrl = apiUrl, fetchImpl: typeof fetch = fetch): Promise<z.infer<T>> {
  if (!baseUrl) throw new ApiError('Uygulama bağlantısı yapılandırılmamış.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const token = authTokenProvider?.();
    const headers = { ...(options.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    const response = await fetchImpl(`${baseUrl}${path}`, { ...options, signal: controller.signal,
      headers });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      throw new ApiError(body?.message ?? body?.error ?? `İstek tamamlanamadı (${response.status}).`, response.status);
    }
    if (response.status === 204) return undefined as z.infer<T>;
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApiError('Yanıt gecikti. Lütfen yeniden dene.');
    if (error instanceof Error && error.name === 'ZodError') throw new ApiError('Gelen bilgiler şu anda gösterilemiyor.');
    throw new ApiError('Şu anda bağlantı kuramıyoruz. İnternet bağlantını kontrol edip yeniden dene.');
  } finally { clearTimeout(timeout); }
}

export const api = {
  health: () => request('/health', healthSchema),
  register: (input: RegisterInput) => request('/auth/register', authResponseSchema,
    { method: 'POST', body: JSON.stringify(registerInputSchema.parse(input)) }),
  login: (input: LoginInput) => request('/auth/login', authResponseSchema,
    { method: 'POST', body: JSON.stringify(loginInputSchema.parse(input)) }),
  logout: () => request('/auth/logout', z.undefined(), { method: 'POST' }),
  me: () => request('/auth/me', meResponseSchema),
  verifyEmail: (input: VerifyEmailInput) => request('/auth/verify-email', genericMessageResponseSchema,
    { method: 'POST', body: JSON.stringify(verifyEmailInputSchema.parse(input)) }),
  resendVerification: () => request('/auth/resend-verification', genericMessageResponseSchema, { method: 'POST', body: JSON.stringify({}) }),
  forgotPassword: (input: ForgotPasswordInput) => request('/auth/forgot-password', genericMessageResponseSchema,
    { method: 'POST', body: JSON.stringify(forgotPasswordInputSchema.parse(input)) }),
  resetPassword: (input: ResetPasswordInput) => request('/auth/reset-password', genericMessageResponseSchema,
    { method: 'POST', body: JSON.stringify(resetPasswordInputSchema.parse(input)) }),
  changePassword: (input: ChangePasswordInput) => request('/auth/change-password', genericMessageResponseSchema,
    { method: 'POST', body: JSON.stringify(changePasswordInputSchema.parse(input)) }),
  sessions: () => request('/auth/sessions', sessionsResponseSchema),
  revokeSession: (id: string) => request(`/auth/sessions/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' }),
  logoutAll: (includeCurrent = true) => request('/auth/logout-all', z.undefined(),
    { method: 'POST', body: JSON.stringify({ includeCurrent }) }),
  deleteAccount: (input: DeleteAccountInput) => request('/account', z.undefined(),
    { method: 'DELETE', body: JSON.stringify(deleteAccountInputSchema.parse(input)) }),
  needs: () => request('/needs', needsResponseSchema),
  need: (id: string) => request(`/needs/${encodeURIComponent(id)}`, needResponseSchema),
  offers: (id: string) => request(`/needs/${encodeURIComponent(id)}/offers`, offersResponseSchema),
  createNeed: (input: CreateNeedInput) => request('/needs', needResponseSchema,
    { method: 'POST', body: JSON.stringify(createNeedSchema.parse(input)) }),
  updateNeed: (id: string, input: UpdateNeedInput) => request(`/needs/${encodeURIComponent(id)}`, needResponseSchema,
    { method: 'PATCH', body: JSON.stringify(updateNeedSchema.parse(input)) }),
  archiveNeed: (id: string) => request(`/needs/${encodeURIComponent(id)}`, needResponseSchema, { method: 'DELETE' }),
  deals: (all = false) => request(`/deals${all ? '?all=true' : ''}`, dealsResponseSchema),
  deal: (id: string) => request(`/deals/${encodeURIComponent(id)}`, dealResponseSchema),
  history: (id: string) => request(`/deals/${encodeURIComponent(id)}/history`, priceHistoryResponseSchema),
  notifications: () => request('/notifications', notificationsResponseSchema),
  readNotification: (id: string) => request(`/notifications/${encodeURIComponent(id)}/read`, notificationResponseSchema,
    { method: 'PATCH' }),
  pushDevices: () => request('/push/devices', pushDevicesResponseSchema),
  registerPushDevice: (input: PushDeviceInput) => request('/push/devices', pushDeviceResponseSchema,
    { method: 'POST', body: JSON.stringify(pushDeviceInputSchema.parse(input)) }),
  unregisterPushDevice: (id: string) => request(`/push/devices/${encodeURIComponent(id)}`, z.undefined(), { method: 'DELETE' }),
  notificationPreferences: () => request('/push/preferences', notificationPreferencesResponseSchema),
  updateNotificationPreferences: (input: NotificationPreferencesInput) => request('/push/preferences',
    notificationPreferencesResponseSchema, { method: 'PATCH', body: JSON.stringify(notificationPreferencesInputSchema.parse(input)) }),
};
