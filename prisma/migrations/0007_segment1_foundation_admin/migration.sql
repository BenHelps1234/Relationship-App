ALTER TABLE "User" ADD COLUMN "subscriptionActive" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "likesReceivedCount" = CAST("likesReceivedCount" AS INTEGER)
WHERE "likesReceivedCount" IS NOT NULL;
