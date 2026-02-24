ALTER TABLE "User" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "impressions_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "likes_received_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "User"
SET "impressions_count" = "impressionsCount",
    "likes_received_count" = "likesCount";
