CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'REVIEWER', 'VIEWER');

CREATE TABLE "AdminUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "role" "AdminRole" NOT NULL DEFAULT 'VIEWER',
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_userId_expiresAt_idx" ON "AdminSession"("userId", "expiresAt");

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeSnapshot" JSONB,
  "afterSnapshot" JSONB,
  "reason" TEXT,
  "requestId" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_entityType_entityId_createdAt_idx" ON "AdminAuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AdminAuditLog_actorId_createdAt_idx" ON "AdminAuditLog"("actorId", "createdAt");
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

CREATE TABLE "ReviewEvent" (
  "id" TEXT NOT NULL,
  "reviewItemId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "fromState" "MatchingReviewState",
  "toState" "MatchingReviewState",
  "note" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewEvent_reviewItemId_createdAt_idx" ON "ReviewEvent"("reviewItemId", "createdAt");
CREATE INDEX "ReviewEvent_actorId_createdAt_idx" ON "ReviewEvent"("actorId", "createdAt");

ALTER TABLE "Promotion"
  ADD COLUMN "rawText" TEXT,
  ADD COLUMN "promotionKind" TEXT NOT NULL DEFAULT 'SIMPLE_SALE',
  ADD COLUMN "percentDiscount" INTEGER,
  ADD COLUMN "multiBuyQuantity" INTEGER,
  ADD COLUMN "multiBuyPayQuantity" INTEGER,
  ADD COLUMN "thresholdQuantity" INTEGER,
  ADD COLUMN "thresholdUnit" TEXT;

UPDATE "Promotion" SET "rawText" = "title" WHERE "rawText" IS NULL;

ALTER TABLE "Brochure"
  ADD COLUMN "sourceOwner" TEXT,
  ADD COLUMN "allowedUsage" TEXT,
  ADD COLUMN "verificationPolicy" TEXT,
  ADD COLUMN "sourceNotes" TEXT,
  ADD COLUMN "sourceEffectiveFrom" TIMESTAMP(3),
  ADD COLUMN "sourceEffectiveTo" TIMESTAMP(3);

ALTER TABLE "BrochurePage"
  ADD COLUMN "previewFormat" TEXT,
  ADD COLUMN "previewWidth" INTEGER,
  ADD COLUMN "previewHeight" INTEGER,
  ADD COLUMN "previewGeneratedAt" TIMESTAMP(3);

ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_reviewItemId_fkey"
  FOREIGN KEY ("reviewItemId") REFERENCES "ReviewItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
