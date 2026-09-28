CREATE TYPE "SourceAuthorizationStatus" AS ENUM ('AUTHORIZED', 'PUBLIC_DATA', 'MANUAL_UPLOAD', 'UNVERIFIED', 'RESTRICTED');

ALTER TABLE "Brochure"
  ADD COLUMN "sourceAuthorizationStatus" "SourceAuthorizationStatus" NOT NULL DEFAULT 'MANUAL_UPLOAD';
