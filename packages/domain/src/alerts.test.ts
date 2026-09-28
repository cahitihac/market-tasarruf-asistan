import { describe, expect, it } from 'vitest';
import { shouldAlert, type AlertOpportunity, type PreviousAlert } from './alerts.js';

const time = new Date('2026-09-18T12:00:00Z');
const current: AlertOpportunity = { observationId: 'today', priceMinor: 31900, label: 'GREAT_DEAL', observedAt: time };
const previous: PreviousAlert = { observationId: 'yesterday', priceMinor: 31900, label: 'GREAT_DEAL',
  observedAt: new Date(time.getTime() - 3600000), createdAt: new Date(time.getTime() - 3600000) };

describe('deterministic alert policy', () => {
  it('alerts on first BUY and GREAT_DEAL opportunities', () => {
    expect(shouldAlert({ ...current, label: 'BUY' }, null, false)).toBe(true);
    expect(shouldAlert(current, null, false)).toBe(true);
  });
  it('never alerts for normal or weaker prices', () => {
    for (const label of ['NORMAL_PRICE', 'GOOD_PRICE', 'BAD_PRICE'] as const) {
      expect(shouldAlert({ ...current, label }, null, false)).toBe(false);
    }
  });
  it('deduplicates the same observation and an unchanged opportunity', () => {
    expect(shouldAlert(current, { ...previous, observationId: 'today' }, true)).toBe(false);
    expect(shouldAlert(current, previous, true)).toBe(false);
  });
  it('alerts after material improvement or recommendation upgrade', () => {
    expect(shouldAlert({ ...current, priceMinor: 28900 }, previous, true)).toBe(true);
    expect(shouldAlert(current, { ...previous, label: 'BUY' }, true)).toBe(true);
  });
  it('allows a returned opportunity after a 24 hour gap', () => {
    const old = { ...previous, createdAt: new Date(time.getTime() - 25 * 3600000) };
    expect(shouldAlert(current, old, false)).toBe(true);
    expect(shouldAlert(current, previous, false)).toBe(false);
  });
});
