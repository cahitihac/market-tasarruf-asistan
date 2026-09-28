import { describe, expect, it } from 'vitest';
import { matchNeed, rankOffer, unitPrice, type NeedCriteria, type OfferCandidate } from './needs.js';

const need: NeedCriteria = {
  name: 'Dishwasher tablets', categorySlug: 'dishwasher-tablets', preferredBrands: ['Finish'],
  alternativeBrands: ['Fairy'], minimumCount: 40, allowAlternatives: true,
};
const finish: OfferCandidate = {
  productName: 'Finish Quantum 72 tablets', categorySlug: 'dishwasher-tablets', brandName: 'Finish',
  quantity: 72, unit: 'piece', packageCount: 1, priceMinor: 31900, distanceKm: 2,
};
const fairy: OfferCandidate = { ...finish, productName: 'Fairy Platinum 60 tablets', brandName: 'Fairy', quantity: 60, priceMinor: 28900 };

describe('need matching', () => {
  it('requires an exact supplied category', () => {
    expect(matchNeed(need, finish)?.matchReason).toContain('Exact category match');
    expect(matchNeed({ ...need, categorySlug: 'coffee' }, finish)).toBeNull();
  });
  it('infers common categories from a generic need name', () => {
    expect(matchNeed({ name: 'Olive oil' }, { ...finish, categorySlug: 'olive-oil', productName: 'Komili Olive Oil' })).not.toBeNull();
  });
  it('ranks preferred brands above alternatives at equal deal quality', () => {
    const preferred = matchNeed(need, finish);
    const alternative = matchNeed(need, fairy);
    expect(preferred?.brandTier).toBe('PREFERRED');
    expect(alternative?.brandTier).toBe('ALTERNATIVE');
    expect(preferred!.matchScore).toBeGreaterThan(alternative!.matchScore);
    expect(rankOffer(preferred!.matchScore, 70)).toBeGreaterThan(rankOffer(alternative!.matchScore, 70));
  });
  it('allows a substantially better alternative deal to outrank a preferred brand', () => {
    const preferred = matchNeed(need, finish)!;
    const alternative = matchNeed(need, fairy)!;
    expect(rankOffer(alternative.matchScore, 100)).toBeGreaterThan(rankOffer(preferred.matchScore, 50));
  });
  it('excludes rejected brands and respects allowAlternatives', () => {
    expect(matchNeed({ ...need, excludedBrands: ['Fairy'] }, fairy)).toBeNull();
    expect(matchNeed({ ...need, allowAlternatives: false }, fairy)).toBeNull();
  });
  it('enforces minimum package count and generic quantity', () => {
    expect(matchNeed({ ...need, minimumCount: 80 }, finish)).toBeNull();
    expect(matchNeed({ ...need, minimumQuantity: { amount: 72, unit: 'piece' } }, finish)).not.toBeNull();
    expect(matchNeed({ ...need, minimumQuantity: { amount: 73, unit: 'piece' } }, finish)).toBeNull();
  });
  it('enforces volume, unit price and distance', () => {
    const oil: OfferCandidate = { ...finish, categorySlug: 'olive-oil', productName: 'Olive oil 1 L', quantity: 1000, unit: 'ml', priceMinor: 39900 };
    expect(matchNeed({ name: 'Olive oil', minimumVolumeMl: 1000, maximumUnitPriceMinor: 40000 }, oil)).not.toBeNull();
    expect(matchNeed({ name: 'Olive oil', minimumVolumeMl: 1500 }, oil)).toBeNull();
    expect(matchNeed({ name: 'Olive oil', maximumUnitPriceMinor: 39800 }, oil)).toBeNull();
    expect(matchNeed({ ...need, maximumStoreDistanceKm: 1 }, finish)).toBeNull();
    expect(unitPrice(finish)).toEqual({ amountMinor: 443, exactMinor: 31900 / 72, basis: 'piece' });
  });
  it('returns no matches for unrelated categories and multiple matches for eligible offers', () => {
    const candidates = [finish, fairy, { ...finish, categorySlug: 'coffee', productName: 'Coffee' }];
    expect(candidates.map(candidate => matchNeed(need, candidate)).filter(Boolean)).toHaveLength(2);
    expect(candidates.map(candidate => matchNeed({ ...need, categorySlug: 'eggs' }, candidate)).filter(Boolean)).toHaveLength(0);
  });
});
