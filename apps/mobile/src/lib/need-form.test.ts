import { describe, expect, it } from 'vitest';
import { blankNeedForm, needToForm, needUpdateFromForm, validateNeedForm } from './need-form';

describe('need form mapping and validation', () => {
  it('maps a practical grocery need into the shared API contract', () => {
    const result = validateNeedForm({ ...blankNeedForm, name: 'Dishwasher tablets', category: 'dishwasher-tablets',
      preferredBrands: 'Finish, Fairy', minimumCount: '40', maximumUnitPriceTry: '4.50', allowAlternatives: true });
    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({ name: 'Dishwasher tablets', preferredBrands: ['Finish', 'Fairy'],
      minimumCount: 40, maximumUnitPriceMinor: 450, allowAlternatives: true });
  });
  it('rejects invalid quantities and prices before submitting', () => {
    const result = validateNeedForm({ ...blankNeedForm, name: 'X', minimumCount: '-2',
      minimumVolumeMl: '1.5', maximumUnitPriceTry: 'abc' });
    expect(result.data).toBeUndefined();
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });
  it('prefills edit fields from the API response', () => {
    const form = needToForm({ id: 'n1', name: 'Coffee', category: 'coffee', active: true, createdAt: '2026-09-18',
      preferredBrands: ['Lavazza'], minimumVolumeMl: 500, maximumUnitPriceMinor: 3599 });
    expect(form.preferredBrands).toBe('Lavazza');
    expect(form.minimumVolumeMl).toBe('500');
    expect(form.maximumUnitPriceTry).toBe('35.99');
  });
  it('clears optional constraints and brands when editing', () => {
    const existing = { id: 'n1', name: 'Coffee', category: 'coffee', active: true, createdAt: '2026-09-18',
      preferredBrands: ['Old'], minimumCount: 40, maximumUnitPriceMinor: 500 };
    const form = { ...needToForm(existing), preferredBrands: '', minimumCount: '', maximumUnitPriceTry: '' };
    const validated = validateNeedForm(form);
    expect(validated.data).toBeTruthy();
    expect(needUpdateFromForm(form, existing, validated.data!)).toMatchObject({
      preferredBrands: [], minimumCount: null, maximumUnitPriceMinor: null,
    });
  });
});
