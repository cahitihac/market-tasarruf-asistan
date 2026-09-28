CREATE TYPE "DataSourceOperationalStatus" AS ENUM ('IDLE', 'RUNNING', 'PAUSED', 'DISABLED', 'STALE', 'FAILING');
CREATE TYPE "OperationalAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "OperationalAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

ALTER TABLE "IngestionRun"
  ADD COLUMN "dataSourceId" TEXT,
  ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "DataSource" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "owner" TEXT,
  "connectorType" "PriceSourceType" NOT NULL,
  "authorizationStatus" "SourceAuthorizationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "scheduleEveryMs" INTEGER,
  "freshnessHours" INTEGER NOT NULL DEFAULT 72,
  "rateLimitPerMinute" INTEGER,
  "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "config" JSONB NOT NULL DEFAULT '{}',
  "fictional" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "operationalStatus" "DataSourceOperationalStatus" NOT NULL DEFAULT 'DISABLED',
  "lastRunAt" TIMESTAMP(3),
  "lastSuccessfulRunAt" TIMESTAMP(3),
  "lastRunStatus" "RunStatus",
  "lastRunId" TEXT,
  "lastRecordCount" INTEGER,
  "lastFailureMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalAlert" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "dataSourceId" TEXT,
  "severity" "OperationalAlertSeverity" NOT NULL DEFAULT 'WARNING',
  "status" "OperationalAlertStatus" NOT NULL DEFAULT 'OPEN',
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataSource_slug_key" ON "DataSource"("slug");
CREATE INDEX "DataSource_enabled_authorizationStatus_idx" ON "DataSource"("enabled", "authorizationStatus");
CREATE INDEX "DataSource_operationalStatus_updatedAt_idx" ON "DataSource"("operationalStatus", "updatedAt");
CREATE UNIQUE INDEX "OperationalAlert_dedupeKey_key" ON "OperationalAlert"("dedupeKey");
CREATE INDEX "OperationalAlert_status_severity_lastSeenAt_idx" ON "OperationalAlert"("status", "severity", "lastSeenAt");
CREATE INDEX "OperationalAlert_dataSourceId_status_idx" ON "OperationalAlert"("dataSourceId", "status");
CREATE INDEX "IngestionRun_dataSourceId_startedAt_idx" ON "IngestionRun"("dataSourceId", "startedAt");
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

ALTER TABLE "IngestionRun"
  ADD CONSTRAINT "IngestionRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OperationalAlert"
  ADD CONSTRAINT "OperationalAlert_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
