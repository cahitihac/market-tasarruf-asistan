import { z } from 'zod';
import { recommendationSchema } from './recommendations.js';

export const safeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  emailVerifiedAt: z.string().nullable(),
});
export const authResponseSchema = z.object({
  token: z.string().min(1),
  sessionId: z.string().min(1),
  expiresAt: z.string(),
  user: safeUserSchema,
});
export const meResponseSchema = z.object({ user: safeUserSchema });
export const registerInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(256),
  displayName: z.string().trim().min(1).max(80).optional(),
});
export const loginInputSchema = registerInputSchema.pick({ email: true, password: true });
export const genericMessageResponseSchema = z.object({ ok: z.literal(true), message: z.string().optional() });
export const verifyEmailInputSchema = z.object({ token: z.string().min(32).max(512) });
export const resendVerificationInputSchema = z.object({ email: z.string().email().optional() }).optional();
export const forgotPasswordInputSchema = z.object({ email: z.string().email() });
export const resetPasswordInputSchema = z.object({ token: z.string().min(32).max(512), password: z.string().min(8).max(256) });
export const changePasswordInputSchema = z.object({ currentPassword: z.string().min(8).max(256), newPassword: z.string().min(8).max(256) });
export const deleteAccountInputSchema = z.object({
  currentPassword: z.string().min(8).max(256),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});
export const sessionResponseSchema = z.object({
  id: z.string(),
  current: z.boolean(),
  createdAt: z.string(),
  lastUsedAt: z.string(),
  expiresAt: z.string(),
  revokedAt: z.string().nullable(),
  clientLabel: z.string().nullable(),
  ipAddress: z.string().nullable(),
});
export const sessionsResponseSchema = z.object({ sessions: z.array(sessionResponseSchema) });

export const pushPlatformSchema = z.enum(['IOS', 'ANDROID', 'WEB', 'UNKNOWN']);
export const pushDeviceInputSchema = z.object({
  expoPushToken: z.string().min(16).max(256),
  platform: pushPlatformSchema.default('UNKNOWN'),
  deviceName: z.string().trim().min(1).max(120).optional(),
  appVersion: z.string().trim().min(1).max(40).optional(),
});
export const pushDeviceResponseSchema = z.object({
  id: z.string(),
  expoPushToken: z.string(),
  platform: pushPlatformSchema,
  deviceName: z.string().nullable(),
  appVersion: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastSeenAt: z.string(),
  disabledAt: z.string().nullable(),
  lastDeliveryAt: z.string().nullable(),
});
export const pushDevicesResponseSchema = z.object({ devices: z.array(pushDeviceResponseSchema) });
export const notificationPreferencesInputSchema = z.object({
  dealAlertsEnabled: z.boolean().optional(),
  greatDealEnabled: z.boolean().optional(),
  buyEnabled: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one preference is required');
export const notificationPreferencesResponseSchema = z.object({
  dealAlertsEnabled: z.boolean(),
  greatDealEnabled: z.boolean(),
  buyEnabled: z.boolean(),
  updatedAt: z.string().nullable(),
});

const nullableNumber = z.number().nullable();
const brandList = z.array(z.string());
export const needResponseSchema = z.object({
  id: z.string(), name: z.string(), category: z.string().nullable(), active: z.boolean(), createdAt: z.string(),
  preferredBrands: brandList.optional(), alternativeBrands: brandList.optional(), excludedBrands: brandList.optional(),
  minimumCount: z.number().optional(), minimumVolumeMl: z.number().optional(), minimumWeightGrams: z.number().optional(),
  maximumUnitPriceMinor: z.number().optional(), maximumStoreDistanceKm: z.number().optional(),
  allowAlternatives: z.boolean().optional(),
});
export const needsResponseSchema = z.object({ needs: z.array(needResponseSchema) });

export const priceStatisticsResponseSchema = z.object({
  average7d: nullableNumber, average30d: nullableNumber, average90d: nullableNumber,
  historicalMin: nullableNumber, historicalMax: nullableNumber,
  differenceFrom90dPercent: nullableNumber, sampleCount: z.number(),
});
export const offerResponseSchema = z.object({
  observationId: z.string(),
  canonicalProduct: z.object({ id: z.string(), name: z.string(), brand: z.string().nullable(), category: z.string() }),
  retailerProduct: z.object({ id: z.string(), name: z.string() }),
  retailer: z.object({ id: z.string(), name: z.string(), branch: z.object({ id: z.string(), name: z.string() }).nullable() }),
  currentPrice: z.object({ amountMinor: z.number(), currency: z.string(), observedAt: z.string() }),
  unitPrice: z.object({ amountMinor: z.number(), currency: z.string(), basis: z.string() }),
  priceStatistics: priceStatisticsResponseSchema,
  dealScore: z.number(), recommendation: recommendationSchema,
  explanationReasons: z.array(z.string()), matchScore: z.number(), matchReason: z.array(z.string()),
});
export const offersResponseSchema = z.object({ needId: z.string(), count: z.number(), offers: z.array(offerResponseSchema) });

export const dealResponseSchema = z.object({
  id: z.string(), needId: z.string(), canonicalProductId: z.string(), retailerProductId: z.string(),
  productName: z.string(), retailerName: z.string(), branchName: z.string().nullable(),
  currentPriceMinor: z.number(), unitPriceMinor: z.number(), unitBasis: z.string(), currency: z.string(),
  matchScore: z.number(), score: z.number(), label: recommendationSchema, action: z.string(),
  reasons: z.array(z.string()), matchReasons: z.array(z.string()), priceStatistics: priceStatisticsResponseSchema,
  observedAt: z.string(), evaluatedAt: z.string(), status: z.enum(['ACTIVE', 'EXPIRED', 'SUPERSEDED']),
  canonicalProduct: z.object({ name: z.string(), brand: z.object({ name: z.string() }).nullable(),
    category: z.object({ name: z.string() }) }).optional(),
  need: z.object({ id: z.string(), title: z.string() }).optional(),
});
export const dealsResponseSchema = z.object({ deals: z.array(dealResponseSchema) });
export const notificationResponseSchema = z.object({
  id: z.string(), type: z.string(), title: z.string(), body: z.string(), readAt: z.string().nullable(),
  createdAt: z.string(), alertId: z.string(),
  alert: z.object({ id: z.string(), needId: z.string(), dealId: z.string(), deal: dealResponseSchema }),
});
export const notificationsResponseSchema = z.object({ notifications: z.array(notificationResponseSchema) });
export const priceHistoryResponseSchema = z.object({
  dealId: z.string(), currency: z.string(), points: z.array(z.object({ observedAt: z.string(), priceMinor: z.number() })),
});

export type NeedResponse = z.infer<typeof needResponseSchema>;
export type OfferResponse = z.infer<typeof offerResponseSchema>;
export type DealResponse = z.infer<typeof dealResponseSchema>;
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type PriceHistoryResponse = z.infer<typeof priceHistoryResponseSchema>;
export type SafeUser = z.infer<typeof safeUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type PushDeviceInput = z.infer<typeof pushDeviceInputSchema>;
export type PushDeviceResponse = z.infer<typeof pushDeviceResponseSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesInputSchema>;
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesResponseSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
