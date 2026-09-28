-- CreateEnum
CREATE TYPE "PriceSourceType" AS ENUM ('DEMO_SEED', 'CSV', 'JSON');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DEMO', 'SUPPLIED_UNVERIFIED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "IngestionRowStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'DUPLICATE', 'FAILED');

-- AlterTable
ALTER TABLE "IngestionRun" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "createdProductsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duplicatesSkippedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "matchedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "observationsCreatedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionsCreatedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceIdentifier" TEXT,
ADD COLUMN     "sourceType" "PriceSourceType" NOT NULL DEFAULT 'JSON',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedProductsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PriceObservation" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "externalProductId" TEXT,
ADD COLUMN     "ingestionRunId" TEXT,
ADD COLUMN     "rawPayloadRef" TEXT,
ADD COLUMN     "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sourceIdentifier" TEXT,
ADD COLUMN     "sourceName" TEXT NOT NULL DEFAULT 'Demo seed',
ADD COLUMN     "sourceType" "PriceSourceType" NOT NULL DEFAULT 'DEMO_SEED',
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DEMO';

-- Existing observations came from the deterministic demo seed. The migration
-- records that known provenance without inventing an original retrieval time.
UPDATE "PriceObservation" SET "sourceIdentifier" = 'prisma/seed.ts',
  "rawPayloadRef" = "sourceKey", "confidence" = 1
WHERE "sourceKey" LIKE 'seed:%';

-- CreateTable
CREATE TABLE "IngestionRow" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "IngestionRowStatus" NOT NULL,
    "rawPayloadHash" TEXT NOT NULL,
    "rawPayload" JSONB,
    "reason" TEXT,
    "retailerProductId" TEXT,
    "observationId" TEXT,

    CONSTRAINT "IngestionRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestionRow_status_runId_idx" ON "IngestionRow"("status", "runId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionRow_runId_rowNumber_key" ON "IngestionRow"("runId", "rowNumber");

-- CreateIndex
CREATE INDEX "PriceObservation_ingestionRunId_idx" ON "PriceObservation"("ingestionRunId");

-- AddForeignKey
ALTER TABLE "PriceObservation" ADD CONSTRAINT "PriceObservation_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRow" ADD CONSTRAINT "IngestionRow_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRow" ADD CONSTRAINT "IngestionRow_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRow" ADD CONSTRAINT "IngestionRow_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "PriceObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
