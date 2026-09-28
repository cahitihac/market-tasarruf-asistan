import { describe, expect, it } from 'vitest';
import { brochureExtractionSchema, extractedBrochureOfferSchema } from './brochure-schema.js';
import { loadBrochureDocument, MockBrochureExtractionProvider } from './brochure-provider.js';

describe('brochure structured extraction validation', () => {
  it('validates promotion details and normalizes Turkish decimal commas', () => {
    const offer = extractedBrochureOfferSchema.parse({ productName: 'Coffee 100 g', brand: 'Demo', ean: null,
      packageQuantity: 100, packageUnit: 'g', packageCount: 1, currentPrice: '79,90',
      regularPrice: '99,90', promotionText: '2 al 1 ode', loyaltyRequired: true,
      multiBuyText: 'Buy 2 pay 1', validFrom: '2026-09-20T00:00:00.000Z',
      validTo: '2026-09-27T23:59:59.000Z', pageNumber: 2, sourceLocation: 'page 2', confidence: 0.91 });
    expect(offer).toMatchObject({ currentPrice: '79.90', regularPrice: '99.90', loyaltyRequired: true,
      multiBuyText: 'Buy 2 pay 1' });
  });

  it('rejects malformed AI responses and invalid promotion dates', () => {
    expect(brochureExtractionSchema.safeParse({ retailer: 'Migros', offers: [] }).success).toBe(false);
    expect(extractedBrochureOfferSchema.safeParse({ productName: 'Bad dates', brand: 'Demo',
      packageQuantity: 1, packageUnit: 'piece', currentPrice: '10.00', validFrom: '2026-09-28T00:00:00.000Z',
      validTo: '2026-09-20T00:00:00.000Z', confidence: 0.8 }).success).toBe(false);
  });

  it('provides deterministic mock extraction when no AI key is configured', async () => {
    const document = await loadBrochureDocument(new URL('../../../fixtures/carrefour-example.pdf', import.meta.url).pathname);
    const extracted = await new MockBrochureExtractionProvider().extract(document);
    expect(extracted.offers.map(offer => offer.productName)).toEqual(expect.arrayContaining([
      'Finish Quantum 72 tablets',
      'Komili Extra Virgin Olive Oil 1 L',
      'Mehmet Efendi Turkish Coffee 100 g',
    ]));
    expect(extracted.offers.some(offer => offer.loyaltyRequired)).toBe(true);
    expect(extracted.offers.some(offer => offer.multiBuyText)).toBe(true);
  });
});
