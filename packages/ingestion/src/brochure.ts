import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { Database, database } from '@market/database';
import { normalizeName } from '@market/domain';
import { amountMinor, isoDate, type ExtractedBrochureOffer } from './brochure-schema.js';
import { configuredBrochureExtractionProvider, loadBrochureDocument, type BrochureExtractionProvider } from './brochure-provider.js';
import { ensureBrochurePagePreviews } from './brochure-preview.js';
import { matchCatalogProduct, type CatalogVariant } from './matcher.js';
import type { PriceRecord } from './record.js';

const hash = (value: unknown) => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const reasonFor = (error: unknown) => error instanceof Error ? error.message : String(error);

export interface BrochureImportOptions {
  source?: string;
  sourceIdentifier?: string;
  sourceUrl?: string;
  sourceAuthorizationStatus?: 'AUTHORIZED' | 'PUBLIC_DATA' | 'MANUAL_UPLOAD' | 'UNVERIFIED' | 'RESTRICTED';
  provider?: BrochureExtractionProvider;
  now?: Date;
}

export interface BrochureImportResult {
  brochureId: string;
  extractionRunId: string | null;
  duplicateBrochure: boolean;
  processed: number;
  accepted: number;
  reviewRequired: number;
  duplicateOffers: number;
  failures: number;
}

async function catalog(): Promise<CatalogVariant[]> {
  const variants = await database.productVariant.findMany({ include: { product: { include: { brand: true, category: true } } } });
  return variants.map(variant => ({ id: variant.id, productName: variant.product.name, ean: variant.product.ean,
    brandName: variant.product.brand?.name ?? null, categorySlug: variant.product.category.slug,
    quantity: variant.quantity, unit: variant.unit, packageCount: variant.packageCount }));
}

function sourceKey(fileHash: string, offer: ExtractedBrochureOffer): string {
  return `brochure:${hash([fileHash, normalizeName(offer.productName), normalizeName(offer.brand ?? ''),
    offer.ean ?? null, offer.packageQuantity ?? null, offer.packageUnit ?? null, offer.packageCount,
    offer.currentPrice ?? null, offer.validFrom ?? null, offer.validTo ?? null]).slice(0, 48)}`;
}

function categoryFor(offer: ExtractedBrochureOffer, variants: CatalogVariant[]): string {
  if (offer.category) return offer.category;
  const samePackage = variants.filter(variant => offer.packageQuantity === variant.quantity &&
    offer.packageUnit === variant.unit && offer.packageCount === variant.packageCount);
  const sameBrand = samePackage.filter(variant => offer.brand && variant.brandName &&
    normalizeName(offer.brand) === normalizeName(variant.brandName));
  return (sameBrand[0] ?? samePackage[0])?.categorySlug ?? 'unknown';
}

function priceRecord(offer: ExtractedBrochureOffer, retailer: string, variants: CatalogVariant[], observedAt: Date): PriceRecord | null {
  if (!offer.currentPrice || !offer.packageQuantity || !offer.packageUnit || !offer.brand) return null;
  return {
    retailer,
    productName: offer.productName,
    ean: offer.ean ?? undefined,
    brand: offer.brand,
    category: categoryFor(offer, variants),
    packageQuantity: offer.packageQuantity,
    packageUnit: offer.packageUnit,
    packageCount: offer.packageCount,
    currentPrice: offer.currentPrice,
    regularPrice: offer.regularPrice ?? undefined,
    promotionText: offer.promotionText ?? undefined,
    validFrom: offer.validFrom ?? undefined,
    validTo: offer.validTo ?? undefined,
    observedAt: observedAt.toISOString(),
  };
}

function candidateMatches(offer: ExtractedBrochureOffer, variants: CatalogVariant[]) {
  const offerTokens = new Set(normalizeName(offer.productName).split(' ').filter(Boolean));
  return variants.map(variant => {
    const candidateTokens = new Set(normalizeName(variant.productName).split(' ').filter(Boolean));
    const overlap = [...offerTokens].filter(token => candidateTokens.has(token)).length;
    const packageMatch = offer.packageQuantity === variant.quantity && offer.packageUnit === variant.unit &&
      offer.packageCount === variant.packageCount;
    const brandMatch = offer.brand && variant.brandName ? normalizeName(offer.brand) === normalizeName(variant.brandName) : false;
    return { variantId: variant.id, productName: variant.productName, brandName: variant.brandName,
      quantity: variant.quantity, unit: variant.unit, packageCount: variant.packageCount,
      ean: variant.ean, score: (overlap / Math.max(offerTokens.size, 1)) + (packageMatch ? 0.5 : 0) + (brandMatch ? 0.25 : 0) };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

function reviewReason(offer: ExtractedBrochureOffer, match: ReturnType<typeof matchCatalogProduct> | null, knownRetailer: boolean, now: Date): string | null {
  if (!knownRetailer) return 'UNKNOWN_RETAILER';
  if (offer.validTo && Date.parse(offer.validTo) < now.getTime()) return 'EXPIRED_BROCHURE';
  if (!offer.currentPrice) return 'MISSING_PRICE';
  if (!offer.packageQuantity || !offer.packageUnit) return 'MISSING_PACKAGE_SIZE';
  if (!offer.brand) return 'UNCERTAIN_BRAND';
  if (!match?.variant) return `MATCH_${match?.reason ?? 'NOT_ATTEMPTED'}`;
  if (offer.confidence < 0.85) return 'LOW_EXTRACTION_CONFIDENCE';
  if (match.reason === 'EAN' && match.confidence === 1) return null;
  if (match.reason === 'ATTRIBUTES' && match.confidence >= 0.9) return null;
  return `LOW_MATCH_CONFIDENCE_${match.reason}`;
}

async function upsertListing(chainId: string, variant: CatalogVariant, offer: ExtractedBrochureOffer, confidence: number) {
  const externalId = offer.ean ? `brochure:ean:${offer.ean}` :
    `brochure:normalized:${hash([chainId, variant.id, normalizeName(offer.productName), offer.packageQuantity, offer.packageUnit, offer.packageCount]).slice(0, 24)}`;
  const existingByEan = offer.ean ? await database.retailerProduct.findFirst({ where: { chainId, ean: offer.ean, variantId: variant.id },
    orderBy: { id: 'asc' } }) : null;
  if (existingByEan) return database.retailerProduct.update({ where: { id: existingByEan.id }, data: {
    rawName: offer.productName, normalizedName: normalizeName(offer.productName), matchConfidence: confidence, reviewState: 'APPROVED' } });
  return database.retailerProduct.upsert({ where: { chainId_externalId: { chainId, externalId } }, update: {
    rawName: offer.productName, normalizedName: normalizeName(offer.productName), ean: offer.ean ?? undefined,
    variantId: variant.id, matchConfidence: confidence, reviewState: 'APPROVED',
  }, create: { chainId, externalId, rawName: offer.productName, normalizedName: normalizeName(offer.productName),
    ean: offer.ean ?? undefined, variantId: variant.id, matchConfidence: confidence, reviewState: 'APPROVED' } });
}

async function persistApprovedOffer(offerId: string, variant: CatalogVariant, matchConfidence: number) {
  const offer = await database.brochureOffer.findUniqueOrThrow({ where: { id: offerId }, include: { brochure: { include: { chain: true } } } });
  if (!offer.currentPriceMinor) throw new Error('Cannot approve an offer without a current price');
  const extracted = offer.rawExtraction as Database.JsonObject;
  const listing = await upsertListing(offer.brochure.chainId, variant, {
    retailer: offer.brochure.chain.name, productName: offer.productName, brand: offer.brand ?? null, ean: offer.ean ?? null,
    category: typeof extracted.category === 'string' ? extracted.category : undefined,
    packageQuantity: offer.packageQuantity, packageUnit: offer.packageUnit as 'piece' | 'ml' | 'g' | null,
    packageCount: offer.packageCount, currentPrice: (offer.currentPriceMinor / 100).toFixed(2),
    regularPrice: offer.regularPriceMinor ? (offer.regularPriceMinor / 100).toFixed(2) : null,
    promotionText: offer.promotionText, loyaltyRequired: offer.loyaltyRequired, multiBuyText: offer.multiBuyText,
    validFrom: offer.validFrom?.toISOString() ?? null, validTo: offer.validTo?.toISOString() ?? null,
    pageNumber: 1, sourceLocation: offer.sourceLocation ?? undefined, confidence: offer.confidence ?? 0,
  }, matchConfidence);
  const observedAt = offer.brochure.importedAt;
  let promotionId: string | null = null;
  const promoStarts = offer.validFrom ?? offer.brochure.validFrom;
  const promoEnds = offer.validTo ?? offer.brochure.validTo;
  const modeledPromotion = modelPromotion(offer.promotionText, offer.multiBuyText, offer.loyaltyRequired);
  if ((offer.promotionText || offer.regularPriceMinor || offer.loyaltyRequired || offer.multiBuyText) && promoStarts && promoEnds) {
    promotionId = `brochure:${hash([offer.sourceKey, 'promotion']).slice(0, 32)}`;
    const promotion = await database.promotion.upsert({ where: { id: promotionId }, update: {
      retailerProductId: listing.id, brochureOfferId: offer.id, title: offer.promotionText ?? 'Brochure promotion',
      rawText: offer.promotionText ?? offer.multiBuyText, promotionKind: modeledPromotion.kind,
      percentDiscount: modeledPromotion.percentDiscount, multiBuyQuantity: modeledPromotion.multiBuyQuantity,
      multiBuyPayQuantity: modeledPromotion.multiBuyPayQuantity, thresholdQuantity: modeledPromotion.thresholdQuantity,
      thresholdUnit: modeledPromotion.thresholdUnit, startsAt: promoStarts, endsAt: promoEnds, loyaltyRequired: offer.loyaltyRequired,
    }, create: { id: promotionId, chainId: offer.brochure.chainId, retailerProductId: listing.id, brochureOfferId: offer.id,
      title: offer.promotionText ?? 'Brochure promotion', rawText: offer.promotionText ?? offer.multiBuyText,
      promotionKind: modeledPromotion.kind, percentDiscount: modeledPromotion.percentDiscount,
      multiBuyQuantity: modeledPromotion.multiBuyQuantity, multiBuyPayQuantity: modeledPromotion.multiBuyPayQuantity,
      thresholdQuantity: modeledPromotion.thresholdQuantity, thresholdUnit: modeledPromotion.thresholdUnit,
      startsAt: promoStarts, endsAt: promoEnds,
      loyaltyRequired: offer.loyaltyRequired } });
    await database.promotionCondition.deleteMany({ where: { promotionId: promotion.id } });
    if (offer.loyaltyRequired) await database.promotionCondition.create({ data: { promotionId: promotion.id,
      kind: 'LOYALTY_CARD', value: { required: true } } });
    if (offer.multiBuyText) await database.promotionCondition.create({ data: { promotionId: promotion.id,
      kind: 'MULTI_BUY_TEXT', value: { text: offer.multiBuyText } } });
    const percent = offer.promotionText?.match(/(\d+)\s*%/);
    if (percent) await database.promotionCondition.create({ data: { promotionId: promotion.id,
      kind: 'PERCENT_TEXT', value: { percent: Number(percent[1]), rawText: offer.promotionText } } });
  }
  const created = await database.priceObservation.createMany({ data: [{
    sourceKey: offer.sourceKey, retailerProductId: listing.id, promotionId, observedAt, priceMinor: offer.currentPriceMinor,
    regularPriceMinor: offer.regularPriceMinor, currency: 'TRY', sourceType: 'BROCHURE', sourceName: offer.brochure.source,
    sourceIdentifier: offer.brochure.sourceIdentifier, sourceUrl: offer.brochure.sourceUrl, retrievedAt: offer.brochure.importedAt,
    rawPayloadRef: `${offer.brochure.fileHash}:offer:${offer.id}`, confidence: Math.min(offer.confidence ?? 0, matchConfidence),
    verificationStatus: 'SUPPLIED_UNVERIFIED', brochureOfferId: offer.id,
  }], skipDuplicates: true });
  const observation = await database.priceObservation.findUniqueOrThrow({ where: { sourceKey: offer.sourceKey } });
  if (created.count) {
    const day = new Date(Date.UTC(observedAt.getUTCFullYear(), observedAt.getUTCMonth(), observedAt.getUTCDate()));
    const history = await database.priceHistory.findUnique({ where: { retailerProductId_day_currency: {
      retailerProductId: listing.id, day, currency: 'TRY' } } });
    if (history) await database.priceHistory.update({ where: { id: history.id }, data: {
      minPriceMinor: Math.min(history.minPriceMinor, offer.currentPriceMinor),
      maxPriceMinor: Math.max(history.maxPriceMinor, offer.currentPriceMinor),
      sumPriceMinor: history.sumPriceMinor + BigInt(offer.currentPriceMinor), observationCount: history.observationCount + 1 } });
    else await database.priceHistory.create({ data: { retailerProductId: listing.id, day, currency: 'TRY',
      minPriceMinor: offer.currentPriceMinor, maxPriceMinor: offer.currentPriceMinor,
      sumPriceMinor: BigInt(offer.currentPriceMinor), observationCount: 1 } });
  }
  await database.brochureOffer.update({ where: { id: offer.id }, data: { retailerProductId: listing.id,
    observationId: observation.id, promotionId, matchConfidence, reviewState: 'APPROVED', reviewReason: null } });
  return { observationId: observation.id, created: created.count === 1 };
}

function modelPromotion(promotionText?: string | null, multiBuyText?: string | null, loyaltyRequired = false) {
  const text = `${promotionText ?? ''} ${multiBuyText ?? ''}`.trim();
  const percent = text.match(/(\d{1,2})\s*%/);
  const multiBuy = text.match(/(?:buy|al)\s*(\d+)[^\d]+(?:pay|ode)\s*(\d+)/i);
  const threshold = text.match(/(\d+)\s*(piece|adet|ml|g|kg|l)\s*(?:and|ve)?\s*(?:above|uzeri|ustu)/i);
  return {
    kind: multiBuy ? 'MULTI_BUY' : percent ? 'PERCENT_DISCOUNT' : loyaltyRequired ? 'LOYALTY_CARD_PRICE' : 'SIMPLE_SALE',
    percentDiscount: percent ? Number(percent[1]) : null,
    multiBuyQuantity: multiBuy ? Number(multiBuy[1]) : null,
    multiBuyPayQuantity: multiBuy ? Number(multiBuy[2]) : null,
    thresholdQuantity: threshold ? Number(threshold[1]) : null,
    thresholdUnit: threshold ? threshold[2] : null,
  };
}

export async function importBrochure(filePath: string, options: BrochureImportOptions = {}): Promise<BrochureImportResult> {
  const inputPath = resolve(process.env.INIT_CWD ?? process.cwd(), filePath);
  const document = await loadBrochureDocument(inputPath);
  const fileHash = hash(document.bytes);
  const existing = await database.brochure.findUnique({ where: { fileHash }, select: { id: true } });
  if (existing) return { brochureId: existing.id, extractionRunId: null, duplicateBrochure: true,
    processed: 0, accepted: 0, reviewRequired: 0, duplicateOffers: 0, failures: 0 };
  const provider = options.provider ?? configuredBrochureExtractionProvider();
  const extracted = await provider.extract(document);
  const retailer = extracted.retailer;
  const chain = await database.storeChain.findFirst({ where: { OR: [
    { slug: normalizeName(retailer).replace(/\s+/g, '-') }, { name: { equals: retailer, mode: 'insensitive' } },
  ] } });
  if (!chain) throw new Error(`Unknown retailer: ${retailer}`);
  const brochure = await database.brochure.create({ data: { chainId: chain.id, source: options.source ?? 'manual-brochure',
    sourceIdentifier: options.sourceIdentifier ?? inputPath, sourceUrl: options.sourceUrl, fileHash,
    sourceAuthorizationStatus: options.sourceAuthorizationStatus ?? 'MANUAL_UPLOAD',
    mediaType: document.mediaType, originalFilename: document.filename, validFrom: isoDate(extracted.validFrom),
    validTo: isoDate(extracted.validTo), extractionRaw: extracted as unknown as Database.InputJsonValue, status: 'IMPORTED' } });
  const run = await database.extractionRun.create({ data: { brochureId: brochure.id, provider: provider.name,
    model: provider.model, configVersion: provider.configVersion, rawInputRef: inputPath,
    rawOutput: extracted as unknown as Database.InputJsonValue } });
  const variants = await catalog();
  const now = options.now ?? new Date();
  const counters = { processed: 0, accepted: 0, reviewRequired: 0, duplicateOffers: 0, failures: 0 };
  const errors: Array<{ offer: number; message: string }> = [];
  for (const [index, offer] of extracted.offers.entries()) {
    counters.processed++;
    try {
      const page = await database.brochurePage.upsert({ where: { brochureId_pageNumber: { brochureId: brochure.id,
        pageNumber: offer.pageNumber } }, update: {}, create: { brochureId: brochure.id, pageNumber: offer.pageNumber,
        contentHash: hash([fileHash, offer.pageNumber]), rawMetadata: { filename: document.filename } } });
      const key = sourceKey(fileHash, offer);
      if (await database.brochureOffer.findUnique({ where: { sourceKey: key } })) { counters.duplicateOffers++; continue; }
      const row = priceRecord(offer, retailer, variants, brochure.importedAt);
      const match = row ? matchCatalogProduct(row, variants) : null;
      const reason = reviewReason(offer, match, true, now);
      const createdOffer = await database.brochureOffer.create({ data: { brochureId: brochure.id, pageId: page.id,
        extractionRunId: run.id, sourceKey: key, sourceLocation: offer.sourceLocation ?? `page ${offer.pageNumber}`,
        productName: offer.productName, brand: offer.brand ?? undefined, ean: offer.ean ?? undefined,
        packageQuantity: offer.packageQuantity ?? undefined, packageUnit: offer.packageUnit ?? undefined,
        packageCount: offer.packageCount, currentPriceMinor: amountMinor(offer.currentPrice),
        regularPriceMinor: amountMinor(offer.regularPrice), promotionText: offer.promotionText ?? undefined,
        loyaltyRequired: offer.loyaltyRequired, multiBuyText: offer.multiBuyText ?? undefined,
        validFrom: isoDate(offer.validFrom ?? extracted.validFrom), validTo: isoDate(offer.validTo ?? extracted.validTo),
        rawExtraction: offer as unknown as Database.InputJsonValue,
        normalizedOutput: row as unknown as Database.InputJsonValue, confidence: offer.confidence,
        matchConfidence: match?.confidence, retailerProductId: undefined,
        reviewState: reason ? reason === 'EXPIRED_BROCHURE' ? 'REJECTED' : 'NEEDS_REVIEW' : 'AUTO_MATCHED',
        reviewReason: reason } });
      if (!reason && match?.variant) {
        await persistApprovedOffer(createdOffer.id, match.variant, match.confidence);
        counters.accepted++;
      } else {
        const reviewItem = await database.reviewItem.create({ data: { brochureOfferId: createdOffer.id, extractionRunId: run.id,
          state: reason === 'EXPIRED_BROCHURE' ? 'REJECTED' : 'PENDING',
          rawValues: offer as unknown as Database.InputJsonValue,
          normalizedValues: row as unknown as Database.InputJsonValue,
          candidateMatches: candidateMatches(offer, variants) as unknown as Database.InputJsonValue,
          confidence: offer.confidence, reason: reason ?? 'REVIEW_REQUIRED',
          sourceLocation: offer.sourceLocation ?? `page ${offer.pageNumber}`,
          selectedVariantId: match?.variant?.id } });
        if (reason === 'EXPIRED_BROCHURE') counters.failures++; else counters.reviewRequired++;
        await database.reviewEvent.create({ data: { reviewItemId: reviewItem.id,
        action: reason === 'EXPIRED_BROCHURE' ? 'REJECTED_DURING_IMPORT' : 'REVIEW_REQUIRED',
        toState: reason === 'EXPIRED_BROCHURE' ? 'REJECTED' : 'PENDING',
        note: reason ?? 'Review required', metadata: { sourceLocation: offer.sourceLocation ?? `page ${offer.pageNumber}` } } });
      }
    } catch (error) {
      counters.failures++;
      errors.push({ offer: index + 1, message: reasonFor(error) });
    }
  }
  await database.extractionRun.update({ where: { id: run.id }, data: { processedCount: counters.processed,
    successCount: counters.accepted, reviewCount: counters.reviewRequired, duplicateCount: counters.duplicateOffers,
    failureCount: counters.failures, errors, status: counters.failures === 0 && counters.reviewRequired === 0 ? 'SUCCEEDED' :
      counters.accepted === 0 && counters.reviewRequired === 0 ? 'FAILED' : 'PARTIAL', finishedAt: new Date() } });
  await database.brochure.update({ where: { id: brochure.id }, data: { status: counters.reviewRequired > 0 ? 'REVIEW_REQUIRED' :
    counters.failures > 0 && counters.accepted === 0 ? 'FAILED' : 'PROCESSED',
    reviewState: counters.reviewRequired > 0 ? 'NEEDS_REVIEW' : 'AUTO_MATCHED' } });
  await ensureBrochurePagePreviews(brochure.id);
  return { brochureId: brochure.id, extractionRunId: run.id, duplicateBrochure: false, ...counters };
}

export async function listPendingBrochureReviews() {
  return database.reviewItem.findMany({ where: { state: 'PENDING' }, include: { brochureOffer: { include: { brochure: { include: { chain: true } } } } },
    orderBy: { createdAt: 'asc' } });
}

export async function approveBrochureReview(reviewItemId: string, variantId?: string) {
  const review = await database.reviewItem.findUniqueOrThrow({ where: { id: reviewItemId }, include: { brochureOffer: true } });
  const selectedVariantId = variantId ?? review.selectedVariantId;
  if (!selectedVariantId) throw new Error('A canonical product variant is required to approve this review item');
  const variants = await catalog();
  const variant = variants.find(item => item.id === selectedVariantId);
  if (!variant) throw new Error(`Unknown canonical product variant: ${selectedVariantId}`);
  const result = await persistApprovedOffer(review.brochureOfferId, variant, review.confidence ?? 0.86);
  await database.reviewItem.update({ where: { id: reviewItemId }, data: { state: variantId ? 'MATCHED' : 'APPROVED',
    selectedVariantId, resolvedAt: new Date() } });
  return result;
}

export async function rejectBrochureReview(reviewItemId: string) {
  const review = await database.reviewItem.update({ where: { id: reviewItemId }, data: { state: 'REJECTED', resolvedAt: new Date() } });
  await database.brochureOffer.update({ where: { id: review.brochureOfferId }, data: { reviewState: 'REJECTED' } });
  return review;
}
