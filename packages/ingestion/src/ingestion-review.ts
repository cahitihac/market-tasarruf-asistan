import { createHash } from 'node:crypto';
import { Prisma, prisma } from '@market/database';
import { normalizeName } from '@market/domain';
import { priceConnectorCapabilities, type PriceSourceConnector } from './connector.js';
import { ingestPrices } from './ingest.js';
import { priceRecordSchema, type PriceRecord } from './record.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function externalId(sourceName: string, row: PriceRecord) {
  return row.externalProductId ? `feed:${sourceName}:${row.externalProductId}` :
    `feed:${sourceName}:${hash([normalizeName(row.productName), normalizeName(row.brand), row.packageQuantity,
      row.packageUnit, row.packageCount]).slice(0, 24)}`;
}

export async function approveIngestionReview(input: {
  reviewItemId: string;
  actorId?: string | null;
  correctedValues?: Record<string, unknown>;
  variantId?: string;
  note?: string;
}) {
  const before = await prisma.ingestionReviewItem.findUniqueOrThrow({ where: { id: input.reviewItemId },
    include: { ingestionRow: { include: { run: { include: { dataSource: true } } } } } });
  const merged = { ...object(before.rawValues), ...object(before.proposedValues), ...input.correctedValues };
  const parsed = priceRecordSchema.parse(merged);
  const source = before.ingestionRow.run.dataSource;
  const chain = await prisma.storeChain.findFirstOrThrow({ where: { OR: [
    { slug: { equals: parsed.retailer, mode: 'insensitive' } },
    { name: { equals: parsed.retailer, mode: 'insensitive' } },
  ] } });
  if (input.variantId) {
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: input.variantId },
      include: { product: true } });
    await prisma.retailerProduct.upsert({ where: { chainId_externalId: {
      chainId: chain.id, externalId: externalId(before.ingestionRow.run.source, parsed) } },
    update: { variantId: variant.id, ean: parsed.ean ?? variant.product.ean,
      rawName: parsed.productName, normalizedName: normalizeName(parsed.productName),
      matchConfidence: 1, reviewState: 'APPROVED' },
    create: { chainId: chain.id, externalId: externalId(before.ingestionRow.run.source, parsed),
      rawName: parsed.productName, normalizedName: normalizeName(parsed.productName),
      ean: parsed.ean ?? variant.product.ean, variantId: variant.id, matchConfidence: 1,
      reviewState: 'APPROVED' } });
  }
  const connector: PriceSourceConnector = {
    capabilities: priceConnectorCapabilities,
    source: { type: before.ingestionRow.run.sourceType, name: before.ingestionRow.run.source,
      identifier: `${before.ingestionRow.run.sourceIdentifier ?? before.ingestionRow.run.id}:review:${before.id}`,
      url: before.ingestionRow.run.sourceUrl ?? undefined,
      checksum: hash({ reviewItemId: before.id, corrected: parsed }), retrievedAt: new Date() },
    getPrices: async () => [parsed],
  };
  const run = await ingestPrices(connector, { dataSourceId: source?.id, trigger: 'REVIEW_APPROVAL',
    verificationStatus: source?.fictional ? 'DEMO' :
      source?.authorizationStatus === 'AUTHORIZED' ? 'VERIFIED' : 'SUPPLIED_UNVERIFIED' });
  if (run.observationsCreatedCount === 0 && run.duplicatesSkippedCount === 0) {
    throw new Error(`Corrected record did not create or match an observation; review run ${run.id} status ${run.status}`);
  }
  const after = await prisma.ingestionReviewItem.update({ where: { id: before.id },
    data: { state: 'MATCHED', resolvedAt: new Date(), proposedValues: json(parsed),
      selectedVariantId: input.variantId ?? before.selectedVariantId } });
  await prisma.ingestionReviewEvent.create({ data: { ingestionReviewItemId: before.id,
    actorId: input.actorId ?? undefined, action: 'APPROVED_CORRECTED_RECORD',
    fromState: before.state, toState: after.state, note: input.note,
    metadata: { reviewRunId: run.id, correctedValues: parsed } } });
  return { reviewItem: after, run };
}

export async function rejectIngestionReview(input: {
  reviewItemId: string;
  actorId?: string | null;
  reason: string;
}) {
  const before = await prisma.ingestionReviewItem.findUniqueOrThrow({ where: { id: input.reviewItemId } });
  const after = await prisma.ingestionReviewItem.update({ where: { id: before.id },
    data: { state: 'REJECTED', resolvedAt: new Date() } });
  await prisma.ingestionReviewEvent.create({ data: { ingestionReviewItemId: before.id,
    actorId: input.actorId ?? undefined, action: 'REJECTED', fromState: before.state,
    toState: after.state, note: input.reason } });
  return after;
}
