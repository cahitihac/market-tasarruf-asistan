ALTER TABLE "ConsumerAccountToken" DROP CONSTRAINT "ConsumerAccountToken_userId_fkey";

ALTER TABLE "ConsumerAccountToken"
  ADD CONSTRAINT "ConsumerAccountToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
