import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { brochureExtractionJsonSchema, brochureExtractionSchema, type ExtractedBrochure } from './brochure-schema.js';

export interface BrochureDocumentContent {
  path: string;
  filename: string;
  mediaType: string;
  bytes: Buffer;
}

export interface BrochureExtractionProvider {
  readonly name: string;
  readonly model?: string;
  readonly configVersion?: string;
  extract(input: BrochureDocumentContent): Promise<ExtractedBrochure>;
}

const mediaTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
]);

export async function loadBrochureDocument(path: string): Promise<BrochureDocumentContent> {
  const extension = extname(path).toLowerCase();
  const mediaType = mediaTypes.get(extension);
  if (!mediaType) throw new Error(`Unsupported brochure file type: ${extension || 'unknown'}`);
  return { path, filename: basename(path), mediaType, bytes: await readFile(path) };
}

export class MockBrochureExtractionProvider implements BrochureExtractionProvider {
  readonly name = 'mock';
  readonly model = 'deterministic-fixture';
  readonly configVersion = 'phase9-mock-v1';

  async extract(input: BrochureDocumentContent): Promise<ExtractedBrochure> {
    const text = input.bytes.toString('utf8');
    const embedded = text.match(/BROCHURE_EXTRACTION_FIXTURE\s*=\s*(\{[\s\S]*\})/);
    if (embedded) return brochureExtractionSchema.parse(JSON.parse(embedded[1]!));
    return brochureExtractionSchema.parse({
      retailer: input.filename.toLowerCase().includes('carrefour') ? 'CarrefourSA' : 'Migros',
      validFrom: '2026-09-20T00:00:00.000Z',
      validTo: '2026-09-27T23:59:59.000Z',
      offers: [
        { retailer: 'CarrefourSA', productName: 'Finish Quantum 72 tablets', brand: 'Finish', ean: '8690570568127',
          category: 'dishwasher-tablets', packageQuantity: 72, packageUnit: 'piece', packageCount: 1,
          currentPrice: '319.00', regularPrice: '410.00', promotionText: 'Simple discount', loyaltyRequired: false,
          multiBuyText: null, validFrom: '2026-09-20T00:00:00.000Z', validTo: '2026-09-27T23:59:59.000Z',
          pageNumber: 1, sourceLocation: 'page 1 / tile A1', confidence: 0.98 },
        { retailer: 'CarrefourSA', productName: 'Komili Extra Virgin Olive Oil 1 L', brand: 'Komili', ean: null,
          category: 'olive-oil', packageQuantity: 1000, packageUnit: 'ml', packageCount: 1,
          currentPrice: '399.00', regularPrice: '449.00', promotionText: 'Club card price', loyaltyRequired: true,
          multiBuyText: null, validFrom: '2026-09-20T00:00:00.000Z', validTo: '2026-09-27T23:59:59.000Z',
          pageNumber: 1, sourceLocation: 'page 1 / tile B2', confidence: 0.92 },
        { retailer: 'CarrefourSA', productName: 'Mehmet Efendi Turkish Coffee 100 g', brand: 'Mehmet Efendi', ean: null,
          category: 'coffee', packageQuantity: 100, packageUnit: 'g', packageCount: 1,
          currentPrice: '79.00', regularPrice: '99.00', promotionText: '2 al 1 ode equivalent text', loyaltyRequired: false,
          multiBuyText: 'Buy 2, pay 1 style brochure copy', validFrom: '2026-09-20T00:00:00.000Z',
          validTo: '2026-09-27T23:59:59.000Z', pageNumber: 2, sourceLocation: 'page 2 / tile C1', confidence: 0.9 },
        { retailer: 'CarrefourSA', productName: 'Premium olive oil bottle', brand: null, ean: null,
          category: 'olive-oil', packageQuantity: null, packageUnit: null, packageCount: 1,
          currentPrice: '349.00', regularPrice: null, promotionText: 'Ambiguous brand/package', loyaltyRequired: false,
          multiBuyText: null, validFrom: '2026-09-20T00:00:00.000Z', validTo: '2026-09-27T23:59:59.000Z',
          pageNumber: 2, sourceLocation: 'page 2 / tile D1', confidence: 0.42 },
        { retailer: 'CarrefourSA', productName: 'Coffee', brand: null, ean: null,
          category: 'coffee', packageQuantity: null, packageUnit: null, packageCount: 1,
          currentPrice: null, regularPrice: null, promotionText: 'Unreadable price', loyaltyRequired: false,
          multiBuyText: null, validFrom: '2026-09-20T00:00:00.000Z', validTo: '2026-09-27T23:59:59.000Z',
          pageNumber: 3, sourceLocation: 'page 3 / damaged crop', confidence: 0.18 },
        { retailer: 'CarrefourSA', productName: 'Finish Quantum 72 tablets', brand: 'Finish', ean: '8690570568127',
          category: 'dishwasher-tablets', packageQuantity: 72, packageUnit: 'piece', packageCount: 1,
          currentPrice: '319.00', regularPrice: '410.00', promotionText: 'Simple discount', loyaltyRequired: false,
          multiBuyText: null, validFrom: '2026-09-20T00:00:00.000Z', validTo: '2026-09-27T23:59:59.000Z',
          pageNumber: 1, sourceLocation: 'page 1 / duplicate tile', confidence: 0.98 },
      ],
    });
  }
}

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

function outputText(response: OpenAIResponse): string {
  if (response.output_text) return response.output_text;
  const text = response.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text' && item.text)?.text;
  if (!text) throw new Error('OpenAI response did not include structured output text');
  return text;
}

export class OpenAIBrochureExtractionProvider implements BrochureExtractionProvider {
  readonly name = 'openai';
  readonly model: string;
  readonly configVersion = 'responses-structured-output-v1';
  private readonly apiKey: string;

  constructor(options: { apiKey: string; model: string }) {
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async extract(input: BrochureDocumentContent): Promise<ExtractedBrochure> {
    const dataUrl = `data:${input.mediaType};base64,${input.bytes.toString('base64')}`;
    const content = input.mediaType === 'application/pdf'
      ? [{ type: 'input_text', text: 'Extract grocery brochure offers. Return only the requested structured data.' },
        { type: 'input_file', filename: input.filename, file_data: dataUrl }]
      : [{ type: 'input_text', text: 'Extract grocery brochure offers. Return only the requested structured data.' },
        { type: 'input_image', image_url: dataUrl }];
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        input: [{ role: 'user', content }],
        text: { format: { type: 'json_schema', name: 'brochure_extraction', strict: true,
          schema: brochureExtractionJsonSchema } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI extraction failed: ${response.status} ${await response.text()}`);
    return brochureExtractionSchema.parse(JSON.parse(outputText(await response.json() as OpenAIResponse)));
  }
}

export function configuredBrochureExtractionProvider(env: NodeJS.ProcessEnv = process.env): BrochureExtractionProvider {
  const provider = env.BROCHURE_EXTRACTION_PROVIDER ?? (env.OPENAI_API_KEY ? 'openai' : 'mock');
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required when BROCHURE_EXTRACTION_PROVIDER=openai');
    return new OpenAIBrochureExtractionProvider({ apiKey: env.OPENAI_API_KEY,
      model: env.BROCHURE_EXTRACTION_MODEL ?? 'gpt-5' });
  }
  if (provider !== 'mock') throw new Error(`Unsupported brochure extraction provider: ${provider}`);
  return new MockBrochureExtractionProvider();
}
