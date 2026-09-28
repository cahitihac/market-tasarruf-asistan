CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "ConsumerSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),

  CONSTRAINT "ConsumerSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsumerSession_tokenHash_key" ON "ConsumerSession"("tokenHash");
CREATE INDEX "ConsumerSession_userId_expiresAt_idx" ON "ConsumerSession"("userId", "expiresAt");

ALTER TABLE "ConsumerSession"
  ADD CONSTRAINT "ConsumerSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
