import { z } from 'zod';
export * from './recommendations.js';

export const moneySchema = z.object({ amountMinor: z.number().int().nonnegative(), currency: z.string().length(3) });
export const healthSchema = z.object({ status: z.enum(['ok', 'unavailable']) });
export type Money = z.infer<typeof moneySchema>;

const brandList = z.array(z.string().trim().min(1).max(80)).max(20);
const quantityConstraint = z.object({ amount: z.number().int().positive(), unit: z.enum(['piece', 'ml', 'g']) }).strict();

export const needFieldsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(80).optional(),
  preferredBrands: brandList.optional(),
  alternativeBrands: brandList.optional(),
  excludedBrands: brandList.optional(),
  minimumQuantity: quantityConstraint.optional(),
  minimumCount: z.number().int().positive().optional(),
  minimumVolumeMl: z.number().int().positive().optional(),
  minimumWeightGrams: z.number().int().positive().optional(),
  maximumUnitPriceMinor: z.number().int().positive().optional(),
  allowAlternatives: z.boolean().optional(),
  maximumStoreDistanceKm: z.number().positive().max(500).optional(),
}).strict();

export const createNeedSchema = needFieldsSchema;
export const updateNeedSchema = needFieldsSchema.partial().extend({
  category: needFieldsSchema.shape.category.unwrap().nullable().optional(),
  minimumCount: needFieldsSchema.shape.minimumCount.unwrap().nullable().optional(),
  minimumVolumeMl: needFieldsSchema.shape.minimumVolumeMl.unwrap().nullable().optional(),
  minimumWeightGrams: needFieldsSchema.shape.minimumWeightGrams.unwrap().nullable().optional(),
  maximumUnitPriceMinor: needFieldsSchema.shape.maximumUnitPriceMinor.unwrap().nullable().optional(),
  maximumStoreDistanceKm: needFieldsSchema.shape.maximumStoreDistanceKm.unwrap().nullable().optional(),
  minimumQuantity: quantityConstraint.nullable().optional(),
}).refine(value => Object.keys(value).length > 0, 'At least one field is required');
export const needConstraintsSchema = needFieldsSchema.omit({ name: true, category: true });
export type CreateNeedInput = z.infer<typeof createNeedSchema>;
export type UpdateNeedInput = z.infer<typeof updateNeedSchema>;
export type NeedConstraints = z.infer<typeof needConstraintsSchema>;
export * from './mobile.js';
