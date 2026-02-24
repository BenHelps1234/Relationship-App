ALTER TABLE "User" ADD COLUMN "reliability" REAL NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "likesCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "User"
SET "reliability" = CASE
  WHEN "impressionsCount" >= 50 THEN 1.0
  WHEN "impressionsCount" <= 0 THEN 0
  ELSE "impressionsCount" / 50.0
END;
