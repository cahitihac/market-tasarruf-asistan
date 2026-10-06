import { createHash } from 'node:crypto';
import { Database, database } from '@market/database';
import { normalizeName } from '@market/domain';
import type { PriceSourceConnector } from './connector.js';
import { createIngestionReviewForRow } from './ingestion-review-queue.js';
import { matchCatalogProduct, type CatalogVariant } from './matcher.js';
import { catalogProductRecordSchema, priceMinor, priceRecordSchema, type PriceRecord } from './record.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const reasonFor = (error: unknown) => error instanceof Error ? error.message : String(error);

function observationKey(sourceName: string, sourceType: string, chainId: string, row: PriceRecord): string {
  return `ingest:${hash([sourceType, sourceName, chainId, row.ean ?? row.externalProductId ??
    [normalizeName(row.productName), row.packageQuantity, row.packageUnit, row.packageCount],
  normalizeName(row.branch ?? 'online'), row.observedAt, row.currentPrice, row.regularPrice ?? null]).slice(0, 48)}`;
}

async function catalog(): Promise<CatalogVariant[]> {
  const variants = await database.productVariant.findMany({ include: { product: { include: { brand: true, category: true } } } });
  return variants.map(variant => ({ id: variant.id, productName: variant.product.name, ean: variant.product.ean,
    brandName: variant.product.brand?.name ?? null, categorySlug: variant.product.category.slug,
    quantity: variant.quantity, unit: variant.unit, packageCount: variant.packageCount }));
}

type Counters = { processedCount: number; successCount: number; matchedCount: number; unmatchedCount: number;
  failureCount: number; createdProductsCount: number; updatedProductsCount: number;
  observationsCreatedCount: number; duplicatesSkippedCount: number; promotionsCreatedCount: number };

function slug(value: string): string {
  return normalizeName(value).replace(/\s+/g, '-');
}

async function syncProducts(connector: PriceSourceConnector, counters: Counters): Promise<void> {
  if (!connector.capabilities.products || !connector.getProducts) return;
  const records = await connector.getProducts();
  for (const raw of records) {
    const row = catalogProductRecordSchema.parse(raw);
    const category = await database.category.upsert({ where: { slug: row.category },
      update: { name: row.categoryName }, create: { slug: row.category, name: row.categoryName } });
    const brandSlug = slug(row.brand);
    const brand = await database.brand.upsert({ where: { slug: brandSlug }, update: { name: row.brand },
      create: { slug: brandSlug, name: row.brand } });
    const existing = await database.product.findUnique({ where: { ean: row.ean } });
    const product = existing ? await database.product.update({ where: { id: existing.id }, data: {
      name: row.productName, normalizedName: normalizeName(row.productName), categoryId: category.id, brandId: brand.id,
    } }) : await database.product.create({ data: { name: row.productName, normalizedName: normalizeName(row.productName),
      ean: row.ean, categoryId: category.id, brandId: brand.id } });
    await database.productVariant.upsert({ where: { productId_quantity_unit_packageCount: { productId: product.id,
      quantity: row.packageQuantity, unit: row.packageUnit, packageCount: row.packageCount } }, update: {},
    create: { productId: product.id, label: `${row.packageQuantity} ${row.packageUnit}`,
      quantity: row.packageQuantity, unit: row.packageUnit, packageCount: row.packageCount } });
    if (existing) counters.updatedProductsCount++; else counters.createdProductsCount++;
  }
}

export interface IngestRunOptions {
  dataSourceId?: string;
  trigger?: string;
  jobId?: string;
  attempt?: number;
  verificationStatus?: 'DEMO' | 'SUPPLIED_UNVERIFIED' | 'VERIFIED';
}

export async function ingestPrices(connector: PriceSourceConnector, options: IngestRunOptions = {}) {
  if (!connector.capabilities.prices) throw new Error('Connector does not support prices');
  const { source } = connector;
  const run = await database.ingestionRun.create({ data: { source: source.name, sourceType: source.type,
    sourceIdentifier: source.identifier, sourceUrl: source.url, checksum: source.checksum,
    dataSourceId: options.dataSourceId, trigger: options.trigger ?? 'MANUAL',
    jobId: options.jobId, attempt: options.attempt ?? 1 } });
  const counters: Counters = { processedCount: 0, successCount: 0, matchedCount: 0, unmatchedCount: 0,
    failureCount: 0, createdProductsCount: 0, updatedProductsCount: 0,
    observationsCreatedCount: 0, duplicatesSkippedCount: 0, promotionsCreatedCount: 0 };
  const errors: Array<{ rowNumber: number; message: string }> = [];
  try {
    const rows = await connector.getPrices();
    await syncProducts(connector, counters);
    const variants = await catalog();
    const chains = await database.storeChain.findMany();
    for (const [index, raw] of rows.entries()) {
      const rowNumber = index + 1;
      const rawPayloadHash = hash(raw);
      counters.processedCount++;
      try {
        if (raw && typeof raw === 'object' && 'mappingError' in raw && typeof raw.mappingError === 'string')
          throw new Error(raw.mappingError);
        const row = priceRecordSchema.parse(raw);
        if (row.ean && !/^\d{8}$|^\d{13}$/.test(row.ean)) throw new Error('EAN must be 8 or 13 digits');
        const observedAt = new Date(row.observedAt);
        if (observedAt.getTime() > source.retrievedAt.getTime()) throw new Error('Observation cannot be in the future');
        const chain = chains.find(item => normalizeName(item.slug) === normalizeName(row.retailer) ||
          normalizeName(item.name) === normalizeName(row.retailer));
        if (!chain) throw new Error(`Unknown retailer: ${row.retailer}`);
        const externalId = row.externalProductId ? `feed:${source.name}:${row.externalProductId}` :
          `feed:${source.name}:${hash([normalizeName(row.productName), normalizeName(row.brand), row.packageQuantity, row.packageUnit, row.packageCount]).slice(0, 24)}`;
        const mapped = await database.retailerProduct.findUnique({ where: { chainId_externalId: { chainId: chain.id, externalId } } });
        const match = matchCatalogProduct(row, variants, mapped?.variantId);
        if (!match.variant) {
          counters.unmatchedCount++;
          const ingestionRow = await database.ingestionRow.create({ data: { runId: run.id, rowNumber, status: 'UNMATCHED', rawPayloadHash,
            rawPayload: raw as Database.InputJsonValue, reason: match.reason } });
          await createIngestionReviewForRow(ingestionRow.id);
          continue;
        }
        counters.matchedCount++;
        const sourceKey = observationKey(source.name, source.type, chain.id, row);
        const duplicate = await database.priceObservation.findUnique({ where: { sourceKey } });
        if (duplicate) {
          counters.successCount++; counters.duplicatesSkippedCount++;
          await database.ingestionRow.create({ data: { runId: run.id, rowNumber, status: 'DUPLICATE', rawPayloadHash,
            retailerProductId: duplicate.retailerProductId, observationId: duplicate.id } });
          continue;
        }
        const result = await database.$transaction(async tx => {
          const existingByEan = row.ean ? await tx.retailerProduct.findFirst({ where: {
            chainId: chain.id, ean: row.ean, variantId: match.variant.id }, orderBy: { id: 'asc' } }) : null;
          const existing = existingByEan ?? mapped;
          const listing = existing ? await tx.retailerProduct.update({ where: { id: existing.id }, data: {
            rawName: row.productName, normalizedName: normalizeName(row.productName),
            ean: row.ean ?? existing.ean, variantId: match.variant.id,
            matchConfidence: match.confidence, reviewState: 'APPROVED' } }) :
            await tx.retailerProduct.create({ data: { chainId: chain.id, externalId, rawName: row.productName,
              normalizedName: normalizeName(row.productName), ean: row.ean, variantId: match.variant.id,
              matchConfidence: match.confidence, reviewState: 'APPROVED' } });
          let branchId: string | null = null;
          if (row.branch) {
            const existingBranch = await tx.storeBranch.findFirst({ where: { chainId: chain.id,
              name: { equals: row.branch, mode: 'insensitive' } } });
            const branch = existingBranch ? await tx.storeBranch.update({ where: { id: existingBranch.id }, data: {
              city: row.branchCity ?? existingBranch.city, latitude: row.branchLatitude ?? existingBranch.latitude,
              longitude: row.branchLongitude ?? existingBranch.longitude,
            } }) : await tx.storeBranch.upsert({ where: { chainId_externalId: {
              chainId: chain.id, externalId: `feed:${source.name}:branch:${hash(normalizeName(row.branch)).slice(0, 16)}` } },
            update: { city: row.branchCity, latitude: row.branchLatitude, longitude: row.branchLongitude },
            create: { chainId: chain.id, externalId: `feed:${source.name}:branch:${hash(normalizeName(row.branch)).slice(0, 16)}`,
              name: row.branch, city: row.branchCity, latitude: row.branchLatitude, longitude: row.branchLongitude } });
            branchId = branch.id;
          }
          let promotionId: string | null = null;
          let promotionCreated = 0;
          if (row.validFrom && row.validTo) {
            promotionId = `ingest:${hash([source.name, chain.id, listing.id, row.promotionText ?? '', row.validFrom, row.validTo]).slice(0, 32)}`;
            const existingPromotion = await tx.promotion.findUnique({ where: { id: promotionId } });
            if (!existingPromotion) {
              await tx.promotion.create({ data: { id: promotionId, chainId: chain.id, retailerProductId: listing.id,
                title: row.promotionText ?? 'Supplied price promotion', startsAt: new Date(row.validFrom), endsAt: new Date(row.validTo) } });
              promotionCreated = 1;
            }
          }
          const currentPriceMinor = priceMinor(row.currentPrice);
          const regularPriceMinor = row.regularPrice ? priceMinor(row.regularPrice) : null;
          const created = await tx.priceObservation.createMany({ data: [{ sourceKey, retailerProductId: listing.id,
            branchId, promotionId, observedAt, priceMinor: currentPriceMinor, regularPriceMinor,
            currency: 'TRY', sourceType: source.type, sourceName: source.name, sourceIdentifier: source.identifier,
            sourceUrl: row.sourceRecordUrl ?? source.url, externalProductId: row.externalProductId, retrievedAt: source.retrievedAt,
            rawPayloadRef: `${source.checksum}:row:${rowNumber}`, ingestionRunId: run.id,
            confidence: match.confidence, verificationStatus: options.verificationStatus ?? 'SUPPLIED_UNVERIFIED' }], skipDuplicates: true });
          const observation = await tx.priceObservation.findUniqueOrThrow({ where: { sourceKey } });
          if (created.count) {
            const day = new Date(Date.UTC(observedAt.getUTCFullYear(), observedAt.getUTCMonth(), observedAt.getUTCDate()));
            const history = await tx.priceHistory.findUnique({ where: { retailerProductId_day_currency: {
              retailerProductId: listing.id, day, currency: 'TRY' } } });
            if (history) await tx.priceHistory.update({ where: { id: history.id }, data: {
              minPriceMinor: Math.min(history.minPriceMinor, currentPriceMinor), maxPriceMinor: Math.max(history.maxPriceMinor, currentPriceMinor),
              sumPriceMinor: history.sumPriceMinor + BigInt(currentPriceMinor), observationCount: history.observationCount + 1 } });
            else await tx.priceHistory.create({ data: { retailerProductId: listing.id, day, currency: 'TRY',
              minPriceMinor: currentPriceMinor, maxPriceMinor: currentPriceMinor, sumPriceMinor: BigInt(currentPriceMinor), observationCount: 1 } });
          }
          await tx.ingestionRow.create({ data: { runId: run.id, rowNumber, status: created.count ? 'MATCHED' : 'DUPLICATE',
            rawPayloadHash, retailerProductId: listing.id, observationId: observation.id } });
          return { created: created.count, listingCreated: !existing, promotionCreated };
        });
        counters.successCount++;
        if (result.created) {
          counters.observationsCreatedCount++;
          counters.promotionsCreatedCount += result.promotionCreated;
        } else counters.duplicatesSkippedCount++;
      } catch (error) {
        const message = reasonFor(error);
        counters.failureCount++;
        if (errors.length < 100) errors.push({ rowNumber, message });
        const ingestionRow = await database.ingestionRow.create({ data: { runId: run.id, rowNumber, status: 'FAILED', rawPayloadHash,
          rawPayload: raw as Database.InputJsonValue, reason: message } });
        await createIngestionReviewForRow(ingestionRow.id);
      }
    }
    return database.ingestionRun.update({ where: { id: run.id }, data: { ...counters, rowCount: rows.length,
      errors, status: counters.failureCount === 0 && counters.unmatchedCount === 0 ? 'SUCCEEDED' :
        counters.successCount === 0 && counters.failureCount > 0 ? 'FAILED' : 'PARTIAL', finishedAt: new Date() } });
  } catch (error) {
    const message = reasonFor(error);
    return database.ingestionRun.update({ where: { id: run.id }, data: { ...counters, rowCount: counters.processedCount,
      failureCount: counters.failureCount + 1, errors: [...errors, { rowNumber: 0, message }], status: 'FAILED', finishedAt: new Date() } });
  }
}
