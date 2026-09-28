import { normalizeName } from './normalization.js';

export interface NeedCriteria {
  name: string;
  categorySlug?: string | null;
  preferredBrands?: string[];
  alternativeBrands?: string[];
  excludedBrands?: string[];
  minimumQuantity?: { amount: number; unit: 'piece' | 'ml' | 'g' };
  minimumCount?: number;
  minimumVolumeMl?: number;
  minimumWeightGrams?: number;
  maximumUnitPriceMinor?: number;
  allowAlternatives?: boolean;
  maximumStoreDistanceKm?: number;
}

export interface OfferCandidate {
  productName: string;
  categorySlug: string;
  brandName: string | null;
  quantity: number;
  unit: string;
  packageCount: number;
  priceMinor: number;
  distanceKm?: number | null;
}

export interface NeedMatch {
  matchScore: number;
  matchReason: string[];
  brandTier: 'PREFERRED' | 'ALTERNATIVE' | 'OTHER';
  unitPriceMinor: number;
  unitBasis: 'piece' | 'L' | 'kg';
}

export function unitPrice(candidate: Pick<OfferCandidate, 'priceMinor' | 'quantity' | 'unit' | 'packageCount'>): { amountMinor: number; basis: 'piece' | 'L' | 'kg'; exactMinor: number } | null {
  if (!Number.isInteger(candidate.priceMinor) || candidate.priceMinor < 0 || !Number.isInteger(candidate.quantity) || candidate.quantity <= 0 || !Number.isInteger(candidate.packageCount) || candidate.packageCount <= 0) return null;
  const total = candidate.quantity * candidate.packageCount;
  if (candidate.unit === 'piece') return { amountMinor: Math.round(candidate.priceMinor / total), exactMinor: candidate.priceMinor / total, basis: 'piece' };
  if (candidate.unit === 'ml') return { amountMinor: Math.round(candidate.priceMinor * 1000 / total), exactMinor: candidate.priceMinor * 1000 / total, basis: 'L' };
  if (candidate.unit === 'g') return { amountMinor: Math.round(candidate.priceMinor * 1000 / total), exactMinor: candidate.priceMinor * 1000 / total, basis: 'kg' };
  return null;
}

function hasBrand(brands: string[] | undefined, brandName: string | null): boolean {
  return !!brandName && !!brands?.some(brand => normalizeName(brand) === normalizeName(brandName));
}

export function matchNeed(need: NeedCriteria, candidate: OfferCandidate): NeedMatch | null {
  const categoryKey = normalizeName(candidate.categorySlug);
  const exactCategory = !!need.categorySlug && normalizeName(need.categorySlug) === categoryKey;
  const inferredCategory = !need.categorySlug && normalizeName(need.name) === categoryKey;
  const nameMatch = !need.categorySlug && normalizeName(candidate.productName).includes(normalizeName(need.name));
  if (!exactCategory && !inferredCategory && !nameMatch) return null;
  if (hasBrand(need.excludedBrands, candidate.brandName)) return null;

  const preferred = hasBrand(need.preferredBrands, candidate.brandName);
  const alternative = hasBrand(need.alternativeBrands, candidate.brandName);
  const hasPreferred = !!need.preferredBrands?.length;
  const hasAlternative = !!need.alternativeBrands?.length;
  if (need.allowAlternatives === false && (hasPreferred || hasAlternative) && !preferred && !alternative) return null;
  if (need.allowAlternatives === false && hasPreferred && !preferred) return null;

  const total = candidate.quantity * candidate.packageCount;
  if (need.minimumCount !== undefined && (candidate.unit !== 'piece' || total < need.minimumCount)) return null;
  if (need.minimumVolumeMl !== undefined && (candidate.unit !== 'ml' || total < need.minimumVolumeMl)) return null;
  if (need.minimumWeightGrams !== undefined && (candidate.unit !== 'g' || total < need.minimumWeightGrams)) return null;
  if (need.minimumQuantity && (candidate.unit !== need.minimumQuantity.unit || total < need.minimumQuantity.amount)) return null;
  if (need.maximumStoreDistanceKm !== undefined && (candidate.distanceKm == null || candidate.distanceKm > need.maximumStoreDistanceKm)) return null;

  const price = unitPrice(candidate);
  if (!price || (need.maximumUnitPriceMinor !== undefined && price.exactMinor > need.maximumUnitPriceMinor)) return null;

  const brandTier = preferred ? 'PREFERRED' : alternative ? 'ALTERNATIVE' : 'OTHER';
  const categoryScore = exactCategory ? 50 : inferredCategory ? 45 : 35;
  const brandScore = preferred ? 45 : alternative ? 30 : hasPreferred || hasAlternative ? 15 : 35;
  const matchScore = Math.min(100, categoryScore + brandScore + 5);
  const matchReason = [exactCategory ? 'Exact category match' : inferredCategory ? 'Category inferred from need name' : 'Product name match',
    preferred ? 'Preferred brand' : alternative ? 'Alternative brand' : 'Other acceptable brand'];
  if (need.minimumCount !== undefined || need.minimumVolumeMl !== undefined || need.minimumWeightGrams !== undefined || need.minimumQuantity) matchReason.push('Package size meets minimum');
  if (need.maximumUnitPriceMinor !== undefined) matchReason.push('Unit price within limit');
  return { matchScore, matchReason, brandTier, unitPriceMinor: price.amountMinor, unitBasis: price.basis };
}

export function rankOffer(matchScore: number, dealScore: number): number {
  return Math.round(matchScore * 0.6 + dealScore * 0.4);
}

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const arc = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}
