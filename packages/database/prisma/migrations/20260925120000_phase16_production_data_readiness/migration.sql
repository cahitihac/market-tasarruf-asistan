CREATE TYPE "DataSourceOnboardingStatus" AS ENUM ('PROPOSED', 'DOCUMENTATION_PENDING', 'AUTHORIZATION_PENDING', 'TECHNICAL_REVIEW', 'READY_FOR_TEST', 'APPROVED', 'REJECTED', 'SUSPENDED');

ALTER TABLE "DataSource"
  ADD COLUMN "ownerContact" TEXT,
  ADD COLUMN "permittedCommercialUse" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowedDataRetentionDays" INTEGER,
  ADD COLUMN "geographicCoverage" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "credentialRequirements" TEXT,
  ADD COLUMN "feedSpecificationUrl" TEXT,
  ADD COLUMN "feedSpecification" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "onboardingStatus" "DataSourceOnboardingStatus" NOT NULL DEFAULT 'PROPOSED';

ALTER TABLE "OperationalAlert"
  ADD COLUMN "lastExternalSentAt" TIMESTAMP(3),
  ADD COLUMN "externalSendCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "externalLastError" TEXT;

CREATE TABLE "DataSourceApprovalEvent" (
  "id" TEXT NOT NULL,
  "dataSourceId" TEXT NOT NULL,
  "actorId" TEXT,
  "fromStatus" "DataSourceOnboardingStatus",
  "toStatus" "DataSourceOnboardingStatus" NOT NULL,
  "authorizationStatus" "SourceAuthorizationStatus",
  "note" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataSourceApprovalEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionReviewItem" (
  "id" TEXT NOT NULL,
  "ingestionRowId" TEXT NOT NULL,
  "state" "MatchingReviewState" NOT NULL DEFAULT 'PENDING',
  "rawValues" JSONB NOT NULL,
  "proposedValues" JSONB,
  "candidateMatches" JSONB NOT NULL DEFAULT '[]',
  "reason" TEXT NOT NULL,
  "selectedVariantId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "IngestionReviewItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionReviewEvent" (
  "id" TEXT NOT NULL,
  "ingestionReviewItemId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "fromState" "MatchingReviewState",
  "toState" "MatchingReviewState",
  "note" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngestionReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataSource_onboardingStatus_authorizationStatus_idx" ON "DataSource"("onboardingStatus", "authorizationStatus");
CREATE INDEX "DataSourceApprovalEvent_dataSourceId_createdAt_idx" ON "DataSourceApprovalEvent"("dataSourceId", "createdAt");
CREATE INDEX "DataSourceApprovalEvent_actorId_createdAt_idx" ON "DataSourceApprovalEvent"("actorId", "createdAt");
CREATE UNIQUE INDEX "IngestionReviewItem_ingestionRowId_key" ON "IngestionReviewItem"("ingestionRowId");
CREATE INDEX "IngestionReviewItem_state_createdAt_idx" ON "IngestionReviewItem"("state", "createdAt");
CREATE INDEX "IngestionReviewEvent_ingestionReviewItemId_createdAt_idx" ON "IngestionReviewEvent"("ingestionReviewItemId", "createdAt");
CREATE INDEX "IngestionReviewEvent_actorId_createdAt_idx" ON "IngestionReviewEvent"("actorId", "createdAt");

ALTER TABLE "DataSourceApprovalEvent"
  ADD CONSTRAINT "DataSourceApprovalEvent_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DataSourceApprovalEvent"
  ADD CONSTRAINT "DataSourceApprovalEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IngestionReviewItem"
  ADD CONSTRAINT "IngestionReviewItem_ingestionRowId_fkey" FOREIGN KEY ("ingestionRowId") REFERENCES "IngestionRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IngestionReviewEvent"
  ADD CONSTRAINT "IngestionReviewEvent_ingestionReviewItemId_fkey" FOREIGN KEY ("ingestionReviewItemId") REFERENCES "IngestionReviewItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "IngestionReviewEvent"
  ADD CONSTRAINT "IngestionReviewEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
