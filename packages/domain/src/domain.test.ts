import { describe, expect, it } from 'vitest';
import { deterministicMatcher, normalizeName } from './normalization.js';
import { calculatePriceStatistics, promotionDiscountPercent } from './prices.js';
import { scoreDeal } from './deals.js';

describe('normalization', () => {
  it('normalizes Turkish retailer titles', () => {
    expect(normalizeName("FINISH Quantum 72'li")).toBe('finish quantum 72');
    const canonical = { name: 'Finish Quantum 72 tablet', brand: 'Finish', category: 'dishwasher tablets', quantity: 72, unit: 'piece' };
    expect(deterministicMatcher.suggest({ ...canonical, name: "Finish Quantum 72'li" }, [canonical]).reason).toBe('ATTRIBUTES');
  });
  it('rejects ambiguous attribute matches', () => {
    const raw = { name: 'Coffee 250 g', category: 'coffee', quantity: 250, unit: 'g' };
    expect(deterministicMatcher.suggest(raw, [raw, { ...raw }]).reason).toBe('AMBIGUOUS');
  });
});

describe('prices and deals', () => {
  const current = { priceMinor: 31900, observedAt: new Date('2026-09-18T00:00:00Z') };
  const history = Array.from({ length: 60 }, (_, index) => ({ priceMinor: index === 0 ? 29900 : 41000, observedAt: new Date(current.observedAt.getTime() - (index + 1) * 86_400_000) }));
  it('calculates history without including current or future prices', () => {
    const stats = calculatePriceStatistics(current, [...history, current, { priceMinor: 1, observedAt: new Date('2026-09-19T00:00:00Z') }]);
    expect(stats.sampleCount).toBe(60);
    expect(stats.historicalMin).toBe(29900);
    expect(stats.average90d).toBeCloseTo(40815);
    expect(stats.differenceFrom90dPercent).toBeGreaterThan(21);
  });
  it('scores the seeded Finish offer as a great deal', () => {
    const statistics = calculatePriceStatistics(current, history);
    expect(scoreDeal({ statistics, promotionDiscountPercent: promotionDiscountPercent(31900, 41000) })).toMatchObject({ score: 84, label: 'GREAT_DEAL' });
  });
  it('treats sparse history conservatively', () => {
    const statistics = calculatePriceStatistics(current, []);
    expect(scoreDeal({ statistics }).action).toBe('WAIT');
  });
  it('rejects invalid promotions', () => {
    expect(promotionDiscountPercent(500, 400)).toBeNull();
  });
});
