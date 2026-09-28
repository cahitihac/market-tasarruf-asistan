CREATE TYPE "ConsumerAccountTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "ConsumerSession"
  ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "clientLabel" TEXT,
  ADD COLUMN "ipAddress" TEXT;

CREATE TABLE "ConsumerAccountToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "ConsumerAccountTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),

  CONSTRAINT "ConsumerAccountToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsumerAccountToken_tokenHash_key" ON "ConsumerAccountToken"("tokenHash");
CREATE INDEX "ConsumerAccountToken_userId_purpose_expiresAt_idx" ON "ConsumerAccountToken"("userId", "purpose", "expiresAt");

ALTER TABLE "ConsumerAccountToken"
  ADD CONSTRAINT "ConsumerAccountToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
