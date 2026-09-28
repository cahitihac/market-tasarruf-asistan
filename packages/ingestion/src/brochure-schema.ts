import { z } from 'zod';
import { priceMinor } from './record.js';

const nullableText = z.string().trim().transform(value => value || null).nullable().optional();
const nullableOptionalText = z.string().trim().transform(value => value || undefined).nullable().optional()
  .transform(value => value ?? undefined);
const money = z.union([z.string(), z.number()]).transform(value => String(value).trim().replace(',', '.'))
  .refine(value => /^\d+(?:\.\d{1,2})?$/.test(value), 'Use a nonnegative amount with at most two decimals');
const dateish = z.string().trim().refine(value => Number.isFinite(Date.parse(value)), 'Invalid date');

export const extractedBrochureOfferSchema = z.object({
  retailer: nullableOptionalText,
  productName: z.string().trim().min(1),
  brand: nullableText,
  ean: nullableText,
  category: nullableOptionalText,
  packageQuantity: z.coerce.number().int().positive().nullable().optional(),
  packageUnit: z.enum(['piece', 'ml', 'g']).nullable().optional(),
  packageCount: z.coerce.number().int().positive().default(1),
  currentPrice: money.nullable().optional(),
  regularPrice: money.nullable().optional(),
  promotionText: nullableText,
  loyaltyRequired: z.coerce.boolean().default(false),
  multiBuyText: nullableText,
  validFrom: dateish.nullable().optional(),
  validTo: dateish.nullable().optional(),
  pageNumber: z.coerce.number().int().positive().default(1),
  sourceLocation: nullableOptionalText,
  confidence: z.coerce.number().min(0).max(1),
}).superRefine((offer, context) => {
  if (Boolean(offer.validFrom) !== Boolean(offer.validTo)) context.addIssue({ code: 'custom', message: 'Offer validity requires both validFrom and validTo' });
  if (offer.validFrom && offer.validTo && Date.parse(offer.validFrom) > Date.parse(offer.validTo))
    context.addIssue({ code: 'custom', message: 'Invalid promotion validity window' });
  if (offer.currentPrice && offer.regularPrice && Number(offer.regularPrice) < Number(offer.currentPrice))
    context.addIssue({ code: 'custom', message: 'Regular price cannot be below current price' });
});

export const brochureExtractionSchema = z.object({
  retailer: z.string().trim().min(1),
  validFrom: dateish.nullable().optional(),
  validTo: dateish.nullable().optional(),
  offers: z.array(extractedBrochureOfferSchema).min(1),
}).superRefine((document, context) => {
  if (Boolean(document.validFrom) !== Boolean(document.validTo)) context.addIssue({ code: 'custom', message: 'Brochure validity requires both validFrom and validTo' });
  if (document.validFrom && document.validTo && Date.parse(document.validFrom) > Date.parse(document.validTo))
    context.addIssue({ code: 'custom', message: 'Invalid brochure validity window' });
});

export type ExtractedBrochure = z.infer<typeof brochureExtractionSchema>;
export type ExtractedBrochureOffer = z.infer<typeof extractedBrochureOfferSchema>;

export const brochureExtractionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['retailer', 'validFrom', 'validTo', 'offers'],
  properties: {
    retailer: { type: 'string' },
    validFrom: { type: ['string', 'null'] },
    validTo: { type: ['string', 'null'] },
    offers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['retailer', 'productName', 'brand', 'ean', 'category', 'packageQuantity', 'packageUnit', 'packageCount',
          'currentPrice', 'regularPrice', 'promotionText', 'loyaltyRequired', 'multiBuyText', 'validFrom', 'validTo',
          'pageNumber', 'sourceLocation', 'confidence'],
        properties: {
          retailer: { type: ['string', 'null'] },
          productName: { type: 'string' },
          brand: { type: ['string', 'null'] },
          ean: { type: ['string', 'null'] },
          category: { type: ['string', 'null'] },
          packageQuantity: { type: ['integer', 'null'] },
          packageUnit: { type: ['string', 'null'], enum: ['piece', 'ml', 'g', null] },
          packageCount: { type: 'integer' },
          currentPrice: { type: ['string', 'null'] },
          regularPrice: { type: ['string', 'null'] },
          promotionText: { type: ['string', 'null'] },
          loyaltyRequired: { type: 'boolean' },
          multiBuyText: { type: ['string', 'null'] },
          validFrom: { type: ['string', 'null'] },
          validTo: { type: ['string', 'null'] },
          pageNumber: { type: 'integer' },
          sourceLocation: { type: ['string', 'null'] },
          confidence: { type: 'number' },
        },
      },
    },
  },
} as const;

export function amountMinor(value: string | null | undefined): number | null {
  return value ? priceMinor(value) : null;
}

export function isoDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}
