import { describe, expect, it, vi } from 'vitest';
import { createOpenPricesConnector, OpenPricesHttpError } from './open-prices.js';

const item = (changes: Record<string, unknown> = {}) => ({
  id: 325734, product_code: '8683130038161', price: 75, price_is_discounted: false,
  price_without_discount: null, currency: 'TRY', date: '2026-09-05',
  product: { code: '8683130038161', product_name: 'Algida Cornetto Oreo', brands: 'Algida',
    product_quantity: 130, product_quantity_unit: 'ml', categories_tags: ['en:ice-creams'] },
  location: { osm_brand: 'Migros', osm_name: 'Migros', osm_display_name: 'Migros, Güngören, İstanbul, Türkiye',
    osm_address_city: 'Güngören', osm_address_country_code: 'TR', osm_lat: 41.006, osm_lon: 28.893 },
  ...changes,
});

describe('Open Prices connector', () => {
  it('maps documented product, price, discount, branch and provenance fields', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items: [item({ price: 49.9,
      price_is_discounted: true, price_without_discount: 64.5 })], page: 1, pages: 1, total: 1 }), { status: 200 }));
    const connector = await createOpenPricesConnector({ fetch: fetchMock, maxRecords: 1,
      baseUrl: 'https://prices.example.test' });
    expect(connector.source).toMatchObject({ type: 'OPEN_PRICES', identifier: 'open-prices:TRY' });
    expect(await connector.getProducts?.()).toEqual([expect.objectContaining({ ean: '8683130038161',
      category: 'ice-cream', packageQuantity: 130, packageUnit: 'ml' })]);
    expect(await connector.getPrices()).toEqual([expect.objectContaining({ retailer: 'migros',
      branchCity: 'Güngören', currentPrice: '49.90', regularPrice: '64.50',
      sourceRecordUrl: 'https://prices.example.test/api/v1/prices/325734' })]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('paginates, filters non-Turkish and unsupported records, and bounds requested rows', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const page = Number(new URL(String(input)).searchParams.get('page'));
      const items = page === 1 ? [item()] : [item({ id: 2, location: { ...item().location,
        osm_address_country_code: 'DE' } })];
      return new Response(JSON.stringify({ items, page, pages: 2, total: 2 }), { status: 200 });
    });
    const connector = await createOpenPricesConnector({ fetch: fetchMock, maxRecords: 2, pageSize: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await connector.getPrices()).toEqual([expect.objectContaining({ retailer: 'migros' }),
      expect.objectContaining({ sourceItemId: 2, mappingError: expect.any(String) })]);
  });

  it('retries retryable responses and exposes non-retryable HTTP errors', async () => {
    const retrying = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [item()], page: 1, pages: 1, total: 1 }), { status: 200 }));
    expect((await (await createOpenPricesConnector({ fetch: retrying, maxRecords: 1 })).getPrices())).toHaveLength(1);
    expect(retrying).toHaveBeenCalledTimes(2);
    await expect(createOpenPricesConnector({ fetch: vi.fn(async () => new Response('', { status: 403 })),
      maxRecords: 1 })).rejects.toBeInstanceOf(OpenPricesHttpError);
  });
});
