-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED');

-- DropIndex
DROP INDEX "Deal_observationId_key";

-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "calculatedAt",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "canonicalProductId" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TRY',
ADD COLUMN     "currentPriceMinor" INTEGER NOT NULL,
ADD COLUMN     "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "matchReasons" JSONB NOT NULL,
ADD COLUMN     "matchScore" INTEGER NOT NULL,
ADD COLUMN     "needId" TEXT NOT NULL,
ADD COLUMN     "observedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "priceStatistics" JSONB NOT NULL,
ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "retailerName" TEXT NOT NULL,
ADD COLUMN     "retailerProductId" TEXT NOT NULL,
ADD COLUMN     "snapshotKey" TEXT NOT NULL,
ADD COLUMN     "status" "DealStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "unitBasis" TEXT NOT NULL,
ADD COLUMN     "unitPriceMinor" INTEGER NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'DEAL_ALERT';

-- CreateTable
CREATE TABLE "EvaluationRun" (
    "id" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "activeNeedsEvaluated" INTEGER NOT NULL DEFAULT 0,
    "matchingProductsFound" INTEGER NOT NULL DEFAULT 0,
    "dealsCreated" INTEGER NOT NULL DEFAULT 0,
    "dealsUpdated" INTEGER NOT NULL DEFAULT 0,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "notificationsCreated" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "EvaluationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_userId_createdAt_idx" ON "Alert"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_snapshotKey_key" ON "Deal"("snapshotKey");

-- CreateIndex
CREATE INDEX "Deal_userId_status_evaluatedAt_idx" ON "Deal"("userId", "status", "evaluatedAt");

-- CreateIndex
CREATE INDEX "Deal_needId_retailerProductId_branchId_status_idx" ON "Deal"("needId", "retailerProductId", "branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_alertId_key" ON "Notification"("alertId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_needId_fkey" FOREIGN KEY ("needId") REFERENCES "UserNeed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "StoreBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
