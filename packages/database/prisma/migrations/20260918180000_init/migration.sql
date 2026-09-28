-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('UNMATCHED', 'AUTO_MATCHED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DealLabel" AS ENUM ('BAD_PRICE', 'NORMAL_PRICE', 'GOOD_PRICE', 'BUY', 'GREAT_DEAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreChain" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "StoreChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreBranch" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "StoreBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "ean" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "packageCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerProduct" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "ean" TEXT,
    "variantId" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'UNMATCHED',

    CONSTRAINT "RetailerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "branchId" TEXT,
    "promotionId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "regularPriceMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'TRY',

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "minPriceMinor" INTEGER NOT NULL,
    "maxPriceMinor" INTEGER NOT NULL,
    "sumPriceMinor" BIGINT NOT NULL,
    "observationCount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "retailerProductId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "loyaltyRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionCondition" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PromotionCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UserLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" TEXT,
    "constraints" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProductPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "needId" TEXT,
    "brandId" TEXT,
    "kind" TEXT NOT NULL,

    CONSTRAINT "UserProductPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "observationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "label" "DealLabel" NOT NULL,
    "reasons" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "needId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brochure" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "mediaType" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "extractionRaw" JSONB,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "Brochure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrochureOffer" (
    "id" TEXT NOT NULL,
    "brochureId" TEXT NOT NULL,
    "retailerProductId" TEXT,
    "rawExtraction" JSONB NOT NULL,
    "normalizedOutput" JSONB,
    "confidence" DOUBLE PRECISION,
    "reviewState" "ReviewState" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "BrochureOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StoreChain_slug_key" ON "StoreChain"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StoreBranch_chainId_externalId_key" ON "StoreBranch"("chainId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_ean_key" ON "Product"("ean");

-- CreateIndex
CREATE INDEX "Product_normalizedName_idx" ON "Product"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_quantity_unit_packageCount_key" ON "ProductVariant"("productId", "quantity", "unit", "packageCount");

-- CreateIndex
CREATE INDEX "RetailerProduct_variantId_idx" ON "RetailerProduct"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerProduct_chainId_externalId_key" ON "RetailerProduct"("chainId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceObservation_sourceKey_key" ON "PriceObservation"("sourceKey");

-- CreateIndex
CREATE INDEX "PriceObservation_retailerProductId_observedAt_idx" ON "PriceObservation"("retailerProductId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_branchId_observedAt_idx" ON "PriceObservation"("branchId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_retailerProductId_day_currency_key" ON "PriceHistory"("retailerProductId", "day", "currency");

-- CreateIndex
CREATE INDEX "UserNeed_userId_active_idx" ON "UserNeed"("userId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_observationId_key" ON "Deal"("observationId");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_dedupeKey_key" ON "Alert"("dedupeKey");

-- AddForeignKey
ALTER TABLE "StoreBranch" ADD CONSTRAINT "StoreBranch_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "StoreChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "StoreChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StoreBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "StoreChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionCondition" ADD CONSTRAINT "PromotionCondition_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocation" ADD CONSTRAINT "UserLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNeed" ADD CONSTRAINT "UserNeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNeed" ADD CONSTRAINT "UserNeed_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductPreference" ADD CONSTRAINT "UserProductPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductPreference" ADD CONSTRAINT "UserProductPreference_needId_fkey" FOREIGN KEY ("needId") REFERENCES "UserNeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProductPreference" ADD CONSTRAINT "UserProductPreference_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "PriceObservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_needId_fkey" FOREIGN KEY ("needId") REFERENCES "UserNeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_needId_fkey" FOREIGN KEY ("needId") REFERENCES "UserNeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brochure" ADD CONSTRAINT "Brochure_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "StoreChain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureOffer" ADD CONSTRAINT "BrochureOffer_brochureId_fkey" FOREIGN KEY ("brochureId") REFERENCES "Brochure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureOffer" ADD CONSTRAINT "BrochureOffer_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain integrity checks beyond Prisma's schema types.
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_price_nonnegative" CHECK ("priceMinor" >= 0 AND ("regularPriceMinor" IS NULL OR "regularPriceMinor" >= "priceMinor"));
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_aggregate_valid" CHECK ("minPriceMinor" >= 0 AND "maxPriceMinor" >= "minPriceMinor" AND "sumPriceMinor" >= 0 AND "observationCount" > 0);
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_score_range" CHECK ("score" BETWEEN 0 AND 100);
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_confidence_range" CHECK ("matchConfidence" IS NULL OR "matchConfidence" BETWEEN 0 AND 1);
ALTER TABLE "BrochureOffer" ADD CONSTRAINT "BrochureOffer_confidence_range" CHECK ("confidence" IS NULL OR "confidence" BETWEEN 0 AND 1);
