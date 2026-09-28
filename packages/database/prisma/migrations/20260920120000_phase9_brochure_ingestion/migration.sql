ALTER TYPE "PriceSourceType" ADD VALUE 'BROCHURE';

CREATE TYPE "BrochureStatus" AS ENUM ('IMPORTED', 'EXTRACTED', 'REVIEW_REQUIRED', 'PROCESSED', 'DUPLICATE', 'FAILED');
CREATE TYPE "MatchingReviewState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MATCHED');

ALTER TABLE "Brochure"
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceIdentifier" TEXT,
  ADD COLUMN "fileHash" TEXT,
  ADD COLUMN "originalFilename" TEXT,
  ADD COLUMN "validFrom" TIMESTAMP(3),
  ADD COLUMN "validTo" TIMESTAMP(3),
  ADD COLUMN "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "status" "BrochureStatus" NOT NULL DEFAULT 'IMPORTED';

UPDATE "Brochure"
SET "source" = 'manual',
    "sourceIdentifier" = COALESCE("sourceUrl", "id"),
    "fileHash" = "id",
    "validFrom" = "startsAt",
    "validTo" = "endsAt"
WHERE "source" IS NULL;

ALTER TABLE "Brochure"
  ALTER COLUMN "source" SET NOT NULL,
  ALTER COLUMN "sourceIdentifier" SET NOT NULL,
  ALTER COLUMN "fileHash" SET NOT NULL,
  DROP COLUMN "startsAt",
  DROP COLUMN "endsAt";

CREATE UNIQUE INDEX "Brochure_fileHash_key" ON "Brochure"("fileHash");
CREATE INDEX "Brochure_chainId_importedAt_idx" ON "Brochure"("chainId", "importedAt");

CREATE TABLE "BrochurePage" (
  "id" TEXT NOT NULL,
  "brochureId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "contentHash" TEXT,
  "textContent" TEXT,
  "imageRef" TEXT,
  "rawMetadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "BrochurePage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrochurePage_brochureId_pageNumber_key" ON "BrochurePage"("brochureId", "pageNumber");

CREATE TABLE "ExtractionRun" (
  "id" TEXT NOT NULL,
  "brochureId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT,
  "configVersion" TEXT,
  "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "rawInputRef" TEXT,
  "rawOutput" JSONB,
  "errors" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "ExtractionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExtractionRun_brochureId_startedAt_idx" ON "ExtractionRun"("brochureId", "startedAt");

ALTER TABLE "BrochureOffer"
  ADD COLUMN "pageId" TEXT,
  ADD COLUMN "extractionRunId" TEXT,
  ADD COLUMN "observationId" TEXT,
  ADD COLUMN "promotionId" TEXT,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "sourceLocation" TEXT,
  ADD COLUMN "productName" TEXT,
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "ean" TEXT,
  ADD COLUMN "packageQuantity" INTEGER,
  ADD COLUMN "packageUnit" TEXT,
  ADD COLUMN "packageCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "currentPriceMinor" INTEGER,
  ADD COLUMN "regularPriceMinor" INTEGER,
  ADD COLUMN "promotionText" TEXT,
  ADD COLUMN "loyaltyRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "multiBuyText" TEXT,
  ADD COLUMN "validFrom" TIMESTAMP(3),
  ADD COLUMN "validTo" TIMESTAMP(3),
  ADD COLUMN "matchConfidence" DOUBLE PRECISION,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "BrochureOffer"
SET "sourceKey" = "id",
    "productName" = COALESCE(("rawExtraction" ->> 'productName'), 'Unknown brochure offer')
WHERE "sourceKey" IS NULL;

ALTER TABLE "BrochureOffer"
  ALTER COLUMN "sourceKey" SET NOT NULL,
  ALTER COLUMN "productName" SET NOT NULL;

CREATE UNIQUE INDEX "BrochureOffer_sourceKey_key" ON "BrochureOffer"("sourceKey");
CREATE INDEX "BrochureOffer_brochureId_reviewState_idx" ON "BrochureOffer"("brochureId", "reviewState");
CREATE INDEX "BrochureOffer_retailerProductId_idx" ON "BrochureOffer"("retailerProductId");

ALTER TABLE "PriceObservation" ADD COLUMN "brochureOfferId" TEXT;
CREATE UNIQUE INDEX "PriceObservation_brochureOfferId_key" ON "PriceObservation"("brochureOfferId");

ALTER TABLE "Promotion" ADD COLUMN "brochureOfferId" TEXT;
CREATE UNIQUE INDEX "Promotion_brochureOfferId_key" ON "Promotion"("brochureOfferId");

CREATE TABLE "ReviewItem" (
  "id" TEXT NOT NULL,
  "brochureOfferId" TEXT NOT NULL,
  "extractionRunId" TEXT,
  "state" "MatchingReviewState" NOT NULL DEFAULT 'PENDING',
  "rawValues" JSONB NOT NULL,
  "normalizedValues" JSONB,
  "candidateMatches" JSONB NOT NULL DEFAULT '[]',
  "confidence" DOUBLE PRECISION,
  "reason" TEXT NOT NULL,
  "sourceLocation" TEXT,
  "selectedVariantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ReviewItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewItem_state_createdAt_idx" ON "ReviewItem"("state", "createdAt");

ALTER TABLE "BrochurePage" ADD CONSTRAINT "BrochurePage_brochureId_fkey"
  FOREIGN KEY ("brochureId") REFERENCES "Brochure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExtractionRun" ADD CONSTRAINT "ExtractionRun_brochureId_fkey"
  FOREIGN KEY ("brochureId") REFERENCES "Brochure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BrochureOffer" ADD CONSTRAINT "BrochureOffer_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "BrochurePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BrochureOffer" ADD CONSTRAINT "BrochureOffer_extractionRunId_fkey"
  FOREIGN KEY ("extractionRunId") REFERENCES "ExtractionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_brochureOfferId_fkey"
  FOREIGN KEY ("brochureOfferId") REFERENCES "BrochureOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewItem" ADD CONSTRAINT "ReviewItem_extractionRunId_fkey"
  FOREIGN KEY ("extractionRunId") REFERENCES "ExtractionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_brochureOfferId_fkey"
  FOREIGN KEY ("brochureOfferId") REFERENCES "BrochureOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_brochureOfferId_fkey"
  FOREIGN KEY ("brochureOfferId") REFERENCES "BrochureOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
