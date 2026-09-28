import { createHash } from 'node:crypto';
import type { PriceSourceConnector, SourceDescription } from './connector.js';
import type { CatalogProductRecord, PriceRecord } from './record.js';

const DEFAULT_BASE_URL = 'https://prices.openfoodfacts.org';
const DEFAULT_USER_AGENT = 'market-tasarruf-asistani/0.1 (Open Prices POC)';

type Fetch = typeof fetch;
type PackageUnit = PriceRecord['packageUnit'];

interface OpenPricesItem {
  id: number;
  product_code?: string | null;
  price?: number | null;
  price_is_discounted?: boolean;
  price_without_discount?: number | null;
  currency?: string | null;
  date?: string | null;
  product?: {
    code?: string | null; product_name?: string | null; brands?: string | null;
    product_quantity?: number | null; product_quantity_unit?: string | null;
    categories_tags?: string[] | null;
  } | null;
  location?: {
    osm_brand?: string | null; osm_name?: string | null; osm_display_name?: string | null;
    osm_address_city?: string | null; osm_address_country_code?: string | null;
    osm_lat?: number | null; osm_lon?: number | null;
  } | null;
}

interface OpenPricesPage { items: OpenPricesItem[]; page: number; pages: number; total: number }

export class OpenPricesHttpError extends Error {
  constructor(readonly status: number, readonly url: string, message: string) {
    super(message);
    this.name = 'OpenPricesHttpError';
  }
}

export interface OpenPricesConnectorOptions {
  baseUrl?: string;
  userAgent?: string;
  maxRecords?: number;
  pageSize?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  fetch?: Fetch;
}

const categoryMappings: Array<{ tags: string[]; slug: string; name: string }> = [
  { tags: ['en:ice-creams', 'en:ice-creams-and-sorbets'], slug: 'ice-cream', name: 'Ice cream' },
  { tags: ['en:coffee-drinks', 'en:iced-coffees'], slug: 'coffee', name: 'Coffee' },
  { tags: ['en:yogurts', 'en:plain-yogurts'], slug: 'yogurt', name: 'Yogurt' },
  { tags: ['en:milks'], slug: 'milk', name: 'Milk' },
  { tags: ['en:waters', 'en:mineral-waters'], slug: 'water', name: 'Water' },
  { tags: ['en:pastas'], slug: 'pasta', name: 'Pasta' },
  { tags: ['en:rice'], slug: 'rice', name: 'Rice' },
];

const retailerAliases: Record<string, string> = {
  a101: 'a101', bim: 'bim', 'bi̇m': 'bim', migros: 'migros', 'migros jet': 'migros',
  'mm migros': 'migros', 'mmm migros': 'migros', şok: 'sok', sok: 'sok', carrefoursa: 'carrefoursa',
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function category(tags: string[] | null | undefined) {
  const values = new Set(tags ?? []);
  return categoryMappings.find(mapping => mapping.tags.some(tag => values.has(tag)));
}

function retailer(item: OpenPricesItem): string | undefined {
  const value = (item.location?.osm_brand ?? item.location?.osm_name ?? '').trim().toLocaleLowerCase('tr-TR');
  return retailerAliases[value];
}

function packageDetails(item: OpenPricesItem): { quantity: number; unit: PackageUnit } | undefined {
  const quantity = item.product?.product_quantity;
  const rawUnit = item.product?.product_quantity_unit?.trim().toLocaleLowerCase('en-US');
  if (quantity == null || !Number.isFinite(quantity) || quantity <= 0 || !rawUnit) return undefined;
  const conversions: Record<string, { factor: number; unit: PackageUnit }> = {
    g: { factor: 1, unit: 'g' }, kg: { factor: 1000, unit: 'g' },
    ml: { factor: 1, unit: 'ml' }, cl: { factor: 10, unit: 'ml' }, l: { factor: 1000, unit: 'ml' },
    piece: { factor: 1, unit: 'piece' }, pieces: { factor: 1, unit: 'piece' },
  };
  const conversion = conversions[rawUnit];
  if (!conversion) return undefined;
  const normalized = quantity * conversion.factor;
  return Number.isSafeInteger(normalized) && normalized > 0 ? { quantity: normalized, unit: conversion.unit } : undefined;
}

function mapItem(item: OpenPricesItem, baseUrl: string): { product: CatalogProductRecord; price: PriceRecord } | undefined {
  if (item.currency !== 'TRY' || item.location?.osm_address_country_code !== 'TR') return undefined;
  const chain = retailer(item);
  const mappedCategory = category(item.product?.categories_tags);
  const packageInfo = packageDetails(item);
  const ean = item.product_code ?? item.product?.code;
  const productName = item.product?.product_name?.trim();
  const brand = item.product?.brands?.split(',')[0]?.trim();
  if (!chain || !mappedCategory || !packageInfo || !ean || !/^\d{8}$|^\d{13}$/.test(ean) ||
      !productName || !brand || item.price == null || item.price < 0 || !item.date) return undefined;
  const regular = item.price_without_discount != null && item.price_without_discount >= item.price
    ? item.price_without_discount.toFixed(2) : undefined;
  const product: CatalogProductRecord = { ean, productName, brand, category: mappedCategory.slug,
    categoryName: mappedCategory.name, packageQuantity: packageInfo.quantity, packageUnit: packageInfo.unit,
    packageCount: 1 };
  const price: PriceRecord = { retailer: chain, branch: item.location?.osm_display_name ?? item.location?.osm_name ?? undefined,
    branchCity: item.location?.osm_address_city ?? undefined,
    branchLatitude: item.location?.osm_lat ?? undefined, branchLongitude: item.location?.osm_lon ?? undefined,
    externalProductId: ean, productName, ean, brand, category: mappedCategory.slug,
    packageQuantity: packageInfo.quantity, packageUnit: packageInfo.unit, packageCount: 1,
    currentPrice: item.price.toFixed(2), regularPrice: regular,
    observedAt: `${item.date}T12:00:00.000Z`, sourceRecordUrl: `${baseUrl}/api/v1/prices/${item.id}` };
  return { product, price };
}

async function requestPage(url: URL, options: Required<Pick<OpenPricesConnectorOptions,
  'timeoutMs' | 'maxAttempts'>> & { fetch: Fetch; userAgent: string }): Promise<OpenPricesPage> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await options.fetch(url, { signal: controller.signal, headers: { Accept: 'application/json',
        'User-Agent': options.userAgent } });
      if (response.ok) return await response.json() as OpenPricesPage;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!retryable || attempt === options.maxAttempts) throw new OpenPricesHttpError(response.status, url.toString(),
        `Open Prices returned HTTP ${response.status}`);
      const retryAfter = Number(response.headers.get('retry-after'));
      await wait(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5000) : 250 * 2 ** (attempt - 1));
    } catch (error) {
      if (error instanceof OpenPricesHttpError) throw error;
      lastError = error;
      if (attempt === options.maxAttempts) break;
      await wait(250 * 2 ** (attempt - 1));
    } finally { clearTimeout(timeout); }
  }
  throw new Error(`Open Prices request failed after ${options.maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

class OpenPricesConnector implements PriceSourceConnector {
  readonly capabilities = { products: true, prices: true, promotions: true, branches: true } as const;
  constructor(readonly source: SourceDescription, private readonly products: CatalogProductRecord[],
    private readonly prices: unknown[]) {}
  async getProducts(): Promise<unknown[]> { return this.products; }
  async getPrices(): Promise<unknown[]> { return this.prices; }
}

export async function createOpenPricesConnector(options: OpenPricesConnectorOptions = {}): Promise<PriceSourceConnector> {
  const baseUrl = (options.baseUrl ?? process.env.OPEN_PRICES_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const maxRecords = Math.max(1, Math.min(options.maxRecords ?? 25, 500));
  const pageSize = Math.max(1, Math.min(options.pageSize ?? 100, 100));
  const requestOptions = { fetch: options.fetch ?? fetch, userAgent: options.userAgent ??
    process.env.OPEN_PRICES_USER_AGENT ?? DEFAULT_USER_AGENT, timeoutMs: options.timeoutMs ?? 10_000,
  maxAttempts: options.maxAttempts ?? 3 };
  const rawItems: OpenPricesItem[] = [];
  for (let page = 1; rawItems.length < maxRecords; page++) {
    const url = new URL('/api/v1/prices', baseUrl);
    url.searchParams.set('currency', 'TRY'); url.searchParams.set('order_by', '-date');
    url.searchParams.set('page', String(page)); url.searchParams.set('size', String(Math.min(pageSize, maxRecords - rawItems.length)));
    const payload = await requestPage(url, requestOptions);
    rawItems.push(...payload.items);
    if (page >= payload.pages || payload.items.length === 0) break;
  }
  const mappedByItem = rawItems.map(item => ({ item, mapped: mapItem(item, baseUrl) }));
  const mapped = mappedByItem.map(value => value.mapped).filter((value): value is NonNullable<typeof value> => Boolean(value));
  const products = [...new Map(mapped.map(value => [value.product.ean, value.product])).values()];
  const retrievedAt = new Date();
  const source: SourceDescription = { type: 'OPEN_PRICES', name: 'Open Prices', identifier: 'open-prices:TRY',
    url: `${baseUrl}/api/v1/prices?currency=TRY`, checksum: sha256(JSON.stringify(rawItems)), retrievedAt };
  const prices = mappedByItem.map(({ item, mapped: value }) => value?.price ?? {
    sourceItemId: item.id, sourceRecordUrl: `${baseUrl}/api/v1/prices/${item.id}`,
    mappingError: 'Record lacks a supported Turkish retailer, category, EAN, product identity, package, price, or date',
  });
  return new OpenPricesConnector(source, products, prices);
}
