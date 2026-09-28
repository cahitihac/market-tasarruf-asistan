import { z } from 'zod';

const optionalText = z.string().trim().transform(value => value || undefined).optional();
const positiveInteger = z.coerce.number().int().positive();
const amount = z.union([z.string(), z.number()]).transform(value => String(value)).refine(value => /^\d+(?:\.\d{1,2})?$/.test(value),
  'Use a nonnegative amount with at most two decimals');

export const priceRecordSchema = z.object({
  retailer: z.string().trim().min(1), branch: optionalText, branchCity: optionalText,
  branchLatitude: z.coerce.number().min(-90).max(90).optional(),
  branchLongitude: z.coerce.number().min(-180).max(180).optional(), externalProductId: optionalText,
  productName: z.string().trim().min(1), ean: optionalText, brand: z.string().trim().min(1),
  category: z.string().trim().min(1), packageQuantity: positiveInteger,
  packageUnit: z.enum(['piece', 'ml', 'g']), packageCount: positiveInteger.default(1),
  currentPrice: amount, regularPrice: amount.optional().or(z.literal('').transform(() => undefined)),
  promotionText: optionalText, validFrom: optionalText, validTo: optionalText,
  observedAt: z.string().datetime({ offset: true }), sourceRecordUrl: z.string().url().optional(),
}).superRefine((record, context) => {
  if (Boolean(record.validFrom) !== Boolean(record.validTo)) context.addIssue({ code: 'custom', message: 'Promotion requires both validFrom and validTo' });
  if (record.validFrom && record.validTo &&
    (!Number.isFinite(Date.parse(record.validFrom)) || !Number.isFinite(Date.parse(record.validTo)) ||
      Date.parse(record.validFrom) > Date.parse(record.validTo))) context.addIssue({ code: 'custom', message: 'Invalid promotion validity window' });
  if (record.promotionText && !record.validFrom) context.addIssue({ code: 'custom', message: 'Promotion text requires validity dates' });
  if (record.regularPrice && Number(record.regularPrice) < Number(record.currentPrice)) context.addIssue({ code: 'custom', message: 'Regular price cannot be below current price' });
});

export type PriceRecord = z.infer<typeof priceRecordSchema>;

export const catalogProductRecordSchema = z.object({
  ean: z.string().regex(/^\d{8}$|^\d{13}$/), productName: z.string().trim().min(1),
  brand: z.string().trim().min(1), category: z.string().trim().min(1),
  categoryName: z.string().trim().min(1), packageQuantity: positiveInteger,
  packageUnit: z.enum(['piece', 'ml', 'g']), packageCount: positiveInteger.default(1),
});

export type CatalogProductRecord = z.infer<typeof catalogProductRecordSchema>;

export function priceMinor(amount: string): number {
  const [whole, fraction = ''] = amount.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('Price exceeds the supported range');
  return result;
}
