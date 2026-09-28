import type { PriceStatistics } from './prices.js';

export type DealLabel = 'BAD_PRICE' | 'NORMAL_PRICE' | 'GOOD_PRICE' | 'BUY' | 'GREAT_DEAL';
export interface DealThresholds { badMax: number; normalMax: number; goodMax: number; buyMax: number }
export const DEAL_SCORE_VERSION = 2;
export const defaultThresholds: DealThresholds = { badMax: 30, normalMax: 50, goodMax: 65, buyMax: 82 };
export interface DealInput {
  statistics: PriceStatistics;
  promotionDiscountPercent?: number | null;
  unitPriceAdvantagePercent?: number | null;
}
export interface DealResult { score: number; label: DealLabel; action: 'BUY' | 'WAIT'; reasons: string[] }

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

export function scoreDeal(input: DealInput, thresholds = defaultThresholds): DealResult {
  const { statistics: stats } = input;
  if (!(thresholds.badMax < thresholds.normalMax && thresholds.normalMax < thresholds.goodMax && thresholds.goodMax < thresholds.buyMax && thresholds.buyMax < 100)) throw new Error('Invalid thresholds');
  let score = 50;
  const reasons: string[] = [];
  if (stats.differenceFrom30dPercent !== null) score += clamp(stats.differenceFrom30dPercent * 0.4, -8, 8);
  if (stats.differenceFrom90dPercent !== null) {
    score += clamp(stats.differenceFrom90dPercent * 0.8, -20, 20);
    reasons.push(`${Math.round(Math.abs(stats.differenceFrom90dPercent))}% ${stats.differenceFrom90dPercent >= 0 ? 'below' : 'above'} 90-day average`);
  }
  if (stats.historicalMin !== null && stats.historicalMin > 0) {
    const aboveMin = (stats.currentPriceMinor - stats.historicalMin) / stats.historicalMin * 100;
    if (aboveMin <= 0) { score += 8; reasons.push('At historical minimum'); }
    else if (aboveMin <= 5) { score += 6; reasons.push(`${Math.round(aboveMin)}% above historical minimum`); }
    else if (aboveMin <= 10) { score += 4; reasons.push(`${Math.round(aboveMin)}% above historical minimum`); }
    else if (aboveMin > 30) score -= 8;
  }
  if (input.promotionDiscountPercent != null && input.promotionDiscountPercent > 0) {
    score += Math.min(5, input.promotionDiscountPercent * 0.2);
    reasons.push(`${Math.round(input.promotionDiscountPercent)}% promotion discount`);
  }
  if (input.unitPriceAdvantagePercent != null) {
    score += clamp(input.unitPriceAdvantagePercent * 0.25, -5, 5);
    if (input.unitPriceAdvantagePercent > 0) reasons.push(`${Math.round(input.unitPriceAdvantagePercent)}% unit price advantage`);
  }
  const exceptionalLow = stats.historicalMin !== null && stats.currentPriceMinor <= stats.historicalMin &&
    stats.differenceFrom90dPercent !== null && stats.differenceFrom90dPercent >= 30 && stats.sampleCount >= 30;
  if (exceptionalLow) { score += 5; reasons.push('Exceptional historical low'); }
  score = Math.round(clamp(score, 0, 100));
  const label: DealLabel = score <= thresholds.badMax ? 'BAD_PRICE' : score <= thresholds.normalMax ? 'NORMAL_PRICE' :
    score <= thresholds.goodMax ? 'GOOD_PRICE' : score <= thresholds.buyMax ? 'BUY' : 'GREAT_DEAL';
  return { score, label, action: score > thresholds.goodMax ? 'BUY' : 'WAIT', reasons: reasons.length ? reasons : ['Insufficient price history for a strong recommendation'] };
}
