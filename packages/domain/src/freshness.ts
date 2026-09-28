export type PriceFreshness = 'CURRENT' | 'STALE' | 'FUTURE';
export type PromotionFreshness = 'NONE' | 'UPCOMING' | 'ACTIVE' | 'EXPIRED';

export function priceFreshness(observedAt: Date, now: Date, maximumAgeHours: number): PriceFreshness {
  const age = now.getTime() - observedAt.getTime();
  if (!Number.isFinite(age) || !Number.isFinite(maximumAgeHours) || maximumAgeHours <= 0 || age < 0) return 'FUTURE';
  return age <= maximumAgeHours * 60 * 60 * 1000 ? 'CURRENT' : 'STALE';
}

export function isCurrentPrice(observedAt: Date, now: Date, maximumAgeHours: number): boolean {
  return priceFreshness(observedAt, now, maximumAgeHours) === 'CURRENT';
}

export function promotionFreshness(promotion: { startsAt: Date; endsAt: Date } | null, now: Date): PromotionFreshness {
  if (!promotion) return 'NONE';
  if (now.getTime() < promotion.startsAt.getTime()) return 'UPCOMING';
  if (now.getTime() > promotion.endsAt.getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

export function isPromotionActive(promotion: { startsAt: Date; endsAt: Date } | null, now: Date): boolean {
  return promotionFreshness(promotion, now) === 'ACTIVE';
}
