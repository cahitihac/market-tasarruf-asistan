import { describe, expect, it } from 'vitest';
import { isCurrentPrice, isPromotionActive, priceFreshness, promotionFreshness } from './freshness.js';

describe('price freshness', () => {
  const now = new Date('2026-09-18T20:00:00Z');
  it('rejects stale and future observations at a configurable threshold', () => {
    expect(isCurrentPrice(new Date('2026-09-15T20:00:00Z'), now, 72)).toBe(true);
    expect(isCurrentPrice(new Date('2026-09-15T19:59:59Z'), now, 72)).toBe(false);
    expect(isCurrentPrice(new Date('2026-09-18T20:00:01Z'), now, 72)).toBe(false);
    expect(isCurrentPrice(new Date('2026-09-15T19:59:59Z'), now, 96)).toBe(true);
    expect(priceFreshness(new Date('2026-09-15T19:59:59Z'), now, 72)).toBe('STALE');
    expect(priceFreshness(new Date('2026-09-18T20:00:01Z'), now, 72)).toBe('FUTURE');
  });
  it('only counts a promotion inside its validity window', () => {
    const promotion = { startsAt: new Date('2026-09-18T00:00:00Z'), endsAt: new Date('2026-09-19T00:00:00Z') };
    expect(isPromotionActive(promotion, now)).toBe(true);
    expect(isPromotionActive(promotion, new Date('2026-09-20T00:00:00Z'))).toBe(false);
    expect(isPromotionActive(null, now)).toBe(false);
    expect(promotionFreshness(promotion, new Date('2026-09-17T00:00:00Z'))).toBe('UPCOMING');
    expect(promotionFreshness(promotion, now)).toBe('ACTIVE');
    expect(promotionFreshness(promotion, new Date('2026-09-20T00:00:00Z'))).toBe('EXPIRED');
    expect(promotionFreshness(null, now)).toBe('NONE');
  });
});
