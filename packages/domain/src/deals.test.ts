import { describe, expect, it } from 'vitest';
import type { PriceStatistics } from './prices.js';
import { scoreDeal } from './deals.js';

function statistics(overrides: Partial<PriceStatistics> = {}): PriceStatistics {
  return {
    currentPriceMinor: 10_000,
    average7d: null,
    average30d: null,
    average90d: null,
    historicalMin: null,
    historicalMax: null,
    percentile: null,
    differenceFrom30dPercent: 0,
    differenceFrom90dPercent: 0,
    sampleCount: 60,
    ...overrides,
  };
}

describe('DealScore v2', () => {
  it.each([
    { name: 'normal price', d30: 0, d90: 0, promotion: 0, score: 50, label: 'NORMAL_PRICE', action: 'WAIT' },
    { name: 'good deal', d30: 8, d90: 8, promotion: 0, score: 60, label: 'GOOD_PRICE', action: 'WAIT' },
    { name: 'BUY', d30: 15, d90: 15, promotion: 10, score: 70, label: 'BUY', action: 'BUY' },
  ] as const)('classifies a $name deterministically', ({ d30, d90, promotion, score, label, action }) => {
    const result = scoreDeal({ statistics: statistics({ differenceFrom30dPercent: d30, differenceFrom90dPercent: d90 }),
      promotionDiscountPercent: promotion });
    expect(result).toMatchObject({ score, label, action });
  });

  it('scores the 319 TL offer as a differentiated GREAT_DEAL', () => {
    const result = scoreDeal({ statistics: statistics({ currentPriceMinor: 31_900, historicalMin: 29_900,
      differenceFrom30dPercent: 21.5, differenceFrom90dPercent: 22 }), promotionDiscountPercent: 22.2 });
    expect(result).toMatchObject({ score: 84, label: 'GREAT_DEAL', action: 'BUY' });
    expect(result.reasons).toContain('7% above historical minimum');
  });

  it('reserves the upper range for a supported exceptional historical low', () => {
    const result = scoreDeal({ statistics: statistics({ currentPriceMinor: 27_900, historicalMin: 29_900,
      differenceFrom30dPercent: 34, differenceFrom90dPercent: 34, sampleCount: 60 }), promotionDiscountPercent: 32 });
    expect(result).toMatchObject({ score: 96, label: 'GREAT_DEAL', action: 'BUY' });
    expect(result.reasons).toContain('Exceptional historical low');
  });

  it('gives materially different GREAT_DEAL prices different internal scores', () => {
    const regularGreat = scoreDeal({ statistics: statistics({ currentPriceMinor: 31_900, historicalMin: 29_900,
      differenceFrom30dPercent: 21.5, differenceFrom90dPercent: 22 }), promotionDiscountPercent: 22.2 });
    const exceptionalGreat = scoreDeal({ statistics: statistics({ currentPriceMinor: 27_900, historicalMin: 29_900,
      differenceFrom30dPercent: 34, differenceFrom90dPercent: 34 }), promotionDiscountPercent: 32 });
    expect(exceptionalGreat.score).toBeGreaterThan(regularGreat.score);
    expect([regularGreat.label, exceptionalGreat.label]).toEqual(['GREAT_DEAL', 'GREAT_DEAL']);
  });

  it('requires enough history before applying the exceptional-low bonus', () => {
    const sparse = scoreDeal({ statistics: statistics({ currentPriceMinor: 27_900, historicalMin: 29_900,
      differenceFrom30dPercent: 34, differenceFrom90dPercent: 34, sampleCount: 29 }), promotionDiscountPercent: 32 });
    expect(sparse.score).toBe(91);
    expect(sparse.reasons).not.toContain('Exceptional historical low');
  });

  it('keeps a high price in BAD_PRICE', () => {
    const result = scoreDeal({ statistics: statistics({ currentPriceMinor: 13_100, historicalMin: 10_000,
      differenceFrom30dPercent: -25, differenceFrom90dPercent: -25 }), unitPriceAdvantagePercent: -10 });
    expect(result).toMatchObject({ score: 12, label: 'BAD_PRICE', action: 'WAIT' });
  });
});
