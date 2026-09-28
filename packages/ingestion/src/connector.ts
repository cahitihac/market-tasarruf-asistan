import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
export type PriceSourceType = 'DEMO_SEED' | 'CSV' | 'JSON' | 'OPEN_PRICES' | 'BROCHURE';

export interface SourceDescription {
  type: PriceSourceType;
  name: string;
  identifier: string;
  url?: string;
  checksum: string;
  retrievedAt: Date;
}

export interface PriceSourceConnector {
  source: SourceDescription;
  capabilities: { products: boolean; prices: boolean; promotions: boolean; branches: boolean };
  getProducts?(): Promise<unknown[]>;
  getPrices(): Promise<unknown[]>;
  getPromotions?(): Promise<unknown[]>;
  getBranches?(): Promise<unknown[]>;
}

export const priceConnectorCapabilities = { products: false, prices: true, promotions: false, branches: false } as const;

function checksum(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export class MockPriceConnector implements PriceSourceConnector {
  readonly capabilities = priceConnectorCapabilities;
  readonly source: SourceDescription;

  constructor(private readonly rows: unknown[], options: { sourceName?: string; identifier?: string; retrievedAt?: Date } = {}) {
    this.source = { type: 'DEMO_SEED', name: options.sourceName ?? 'Mock price connector',
      identifier: options.identifier ?? 'mock://prices', checksum: checksum(JSON.stringify(rows)),
      retrievedAt: options.retrievedAt ?? new Date() };
  }

  async getPrices(): Promise<unknown[]> { return this.rows; }
}

export class CsvPriceConnector implements PriceSourceConnector {
  readonly capabilities = priceConnectorCapabilities;
  constructor(readonly source: SourceDescription, private readonly content: string) {}
  async getPrices(): Promise<unknown[]> { return parseCsv(this.content); }
}

export class JsonPriceConnector implements PriceSourceConnector {
  readonly capabilities = priceConnectorCapabilities;
  constructor(readonly source: SourceDescription, private readonly content: string) {}
  async getPrices(): Promise<unknown[]> {
    const parsed: unknown = JSON.parse(this.content);
    const rows = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && 'rows' in parsed ? parsed.rows : undefined;
    if (!Array.isArray(rows)) throw new Error('JSON price file must be an array or an object with a rows array');
    return rows;
  }
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index++; }
      else if (!quoted && value !== '') throw new Error('Unexpected CSV quote');
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++;
      row.push(value); value = '';
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  if (quoted) throw new Error('Unterminated CSV quote');
  if (value || row.length) { row.push(value); if (row.some(cell => cell.trim())) rows.push(row); }
  const [headers, ...body] = rows;
  if (!headers?.length || new Set(headers).size !== headers.length || headers.some(header => !header.trim())) throw new Error('CSV headers are missing or duplicated');
  return body.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`CSV row ${index + 2} has ${cells.length} columns; expected ${headers.length}`);
    return Object.fromEntries(headers.map((header, position) => [header.trim(), cells[position]!.trim()]));
  });
}

export async function fileConnector(filePath: string, options: { sourceName?: string; sourceUrl?: string } = {}): Promise<PriceSourceConnector> {
  const absolutePath = resolve(filePath);
  const data = await readFile(absolutePath);
  const extension = extname(absolutePath).toLowerCase();
  if (extension !== '.json' && extension !== '.csv') throw new Error('Only .json and .csv price files are supported');
  const source: SourceDescription = {
    type: extension === '.json' ? 'JSON' : 'CSV', name: options.sourceName ?? basename(absolutePath),
    identifier: absolutePath, url: options.sourceUrl, checksum: checksum(data), retrievedAt: new Date(),
  };
  const content = data.toString('utf8');
  return extension === '.csv' ? new CsvPriceConnector(source, content) : new JsonPriceConnector(source, content);
}
