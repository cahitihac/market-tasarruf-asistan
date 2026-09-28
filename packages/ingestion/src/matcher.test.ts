import { describe, expect, it } from 'vitest';
import { matchCatalogProduct, type CatalogVariant } from './matcher.js';
import { priceRecordSchema } from './record.js';
import { CsvPriceConnector, JsonPriceConnector, MockPriceConnector, parseCsv, type SourceDescription } from './connector.js';

const variants: CatalogVariant[] = [
  { id: 'finish', productName: 'Finish Quantum 72 tablets', ean: '8690570568127', brandName: 'Finish',
    categorySlug: 'dishwasher-tablets', quantity: 72, unit: 'piece', packageCount: 1 },
  { id: 'fairy', productName: 'Fairy Platinum 60 tablets', ean: null, brandName: 'Fairy',
    categorySlug: 'dishwasher-tablets', quantity: 60, unit: 'piece', packageCount: 1 },
];
const base = { retailer: 'Migros', productName: 'Finish Quantum 72 tablets', brand: 'Finish',
  category: 'dishwasher-tablets', packageQuantity: 72, packageUnit: 'piece', packageCount: 1,
  currentPrice: '279.00', observedAt: '2026-09-18T12:00:00Z' };
const row = (changes: object = {}) => priceRecordSchema.parse({ ...base, ...changes });

describe('deterministic import matching', () => {
  it('prefers exact EAN over an existing external mapping', () => {
    expect(matchCatalogProduct(row({ ean: '8690570568127' }), variants, 'fairy')).toMatchObject({
      variant: { id: 'finish' }, confidence: 1, reason: 'EAN' });
  });
  it('uses a known external mapping before normalized attributes', () => {
    expect(matchCatalogProduct(row({ productName: 'Retailer special pack' }), variants, 'finish').reason).toBe('EXTERNAL_ID');
  });
  it('matches strong normalized text and rejects weak or ambiguous matches', () => {
    expect(matchCatalogProduct(row(), variants).reason).toBe('ATTRIBUTES');
    expect(matchCatalogProduct(row({ productName: 'Mystery tablets' }), variants).variant).toBeNull();
    expect(matchCatalogProduct(row(), [...variants, { ...variants[0]!, id: 'finish-copy', ean: null }]).reason).toBe('AMBIGUOUS');
  });
  it('refuses EAN package conflicts and invalid EANs', () => {
    expect(matchCatalogProduct(row({ ean: '8690570568127', packageQuantity: 60 }), variants).reason).toBe('EAN_PACKAGE_CONFLICT');
    expect(matchCatalogProduct(row({ ean: '8690570568128' }), variants).variant).toBeNull();
  });
});

describe('file record parsing', () => {
  it('parses quoted CSV and preserves commas', () => {
    expect(parseCsv('productName,currentPrice\n"Finish, Quantum 72",279.00\n')).toEqual([
      { productName: 'Finish, Quantum 72', currentPrice: '279.00' }]);
    expect(() => parseCsv('a,b\n"unterminated,2')).toThrow('Unterminated');
  });
  it('provides explicit mock, CSV and JSON connector implementations', async () => {
    const source = (type: 'CSV' | 'JSON'): SourceDescription => ({ type, name: 'test', identifier: 'memory',
      checksum: 'checksum', retrievedAt: new Date('2026-09-18T20:00:00Z') });
    expect(await new MockPriceConnector([base]).getPrices()).toEqual([base]);
    expect(await new CsvPriceConnector(source('CSV'), 'productName,currentPrice\nFinish,279.00\n').getPrices()).toEqual([
      { productName: 'Finish', currentPrice: '279.00' }]);
    expect(await new JsonPriceConnector(source('JSON'), JSON.stringify({ rows: [base] })).getPrices()).toEqual([base]);
  });
  it('rejects malformed prices and invalid promotion windows', () => {
    expect(priceRecordSchema.safeParse({ ...base, currentPrice: 'oops' }).success).toBe(false);
    expect(priceRecordSchema.safeParse({ ...base, promotionText: 'sale', validFrom: '2026-09-19T00:00:00Z',
      validTo: '2026-09-18T00:00:00Z' }).success).toBe(false);
  });
});
