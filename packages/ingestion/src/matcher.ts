import { deterministicMatcher, normalizeName, validEan, type ProductIdentity } from '@market/domain';
import type { PriceRecord } from './record.js';

export interface CatalogVariant {
  id: string;
  productName: string;
  ean: string | null;
  brandName: string | null;
  categorySlug: string;
  quantity: number;
  unit: string;
  packageCount: number;
}

export type CatalogMatch = { variant: CatalogVariant; confidence: number; reason: 'EAN' | 'EXTERNAL_ID' | 'ATTRIBUTES' } |
  { variant: null; confidence: number; reason: 'NONE' | 'AMBIGUOUS' | 'LOW_CONFIDENCE' | 'EAN_PACKAGE_CONFLICT' | 'MAPPING_PACKAGE_CONFLICT' };

function samePackage(record: PriceRecord, variant: CatalogVariant): boolean {
  return record.packageQuantity === variant.quantity && record.packageUnit === variant.unit && record.packageCount === variant.packageCount;
}

export function matchCatalogProduct(record: PriceRecord, variants: CatalogVariant[], mappedVariantId?: string | null): CatalogMatch {
  if (record.ean) {
    if (!validEan(record.ean)) return { variant: null, confidence: 0, reason: 'NONE' };
    const eanMatches = variants.filter(variant => variant.ean === record.ean);
    if (eanMatches.length) {
      const exact = eanMatches.filter(variant => samePackage(record, variant));
      return exact.length === 1 ? { variant: exact[0]!, confidence: 1, reason: 'EAN' } :
        { variant: null, confidence: 0, reason: 'EAN_PACKAGE_CONFLICT' };
    }
  }
  if (mappedVariantId) {
    const mapped = variants.find(variant => variant.id === mappedVariantId);
    if (mapped) return samePackage(record, mapped) ? { variant: mapped, confidence: 0.99, reason: 'EXTERNAL_ID' } :
      { variant: null, confidence: 0, reason: 'MAPPING_PACKAGE_CONFLICT' };
  }
  const candidates: ProductIdentity[] = variants.map(variant => ({ ean: variant.ean, name: variant.productName,
    brand: variant.brandName, category: variant.categorySlug, quantity: variant.quantity,
    unit: variant.unit, packageCount: variant.packageCount }));
  const suggestion = deterministicMatcher.suggest({ ean: record.ean, name: record.productName,
    brand: record.brand, category: record.category, quantity: record.packageQuantity,
    unit: record.packageUnit, packageCount: record.packageCount }, candidates);
  if (!suggestion.match) return { variant: null, confidence: suggestion.confidence,
    reason: suggestion.reason === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NONE' };
  if (suggestion.confidence < 0.85) return { variant: null, confidence: suggestion.confidence, reason: 'LOW_CONFIDENCE' };
  const index = candidates.indexOf(suggestion.match);
  const variant = variants[index];
  if (!variant || normalizeName(variant.brandName ?? '') !== normalizeName(record.brand))
    return { variant: null, confidence: suggestion.confidence, reason: 'NONE' };
  return { variant, confidence: suggestion.confidence, reason: 'ATTRIBUTES' };
}
