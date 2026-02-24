-- MPS spec counters + reliability normalization
ALTER TABLE "User" ADD COLUMN "impressionsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "likesReceivedCount" REAL NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "basePotentialScore" REAL NOT NULL DEFAULT 5.0;
ALTER TABLE "User" ADD COLUMN "ghostPenaltyAppliedAt" DATETIME;

UPDATE "User"
SET "reliabilityScore" = CASE
  WHEN "reliabilityScore" > 1 THEN "reliabilityScore" / 100.0
  WHEN "reliabilityScore" <= 0 THEN 0.05
  ELSE "reliabilityScore"
END;

UPDATE "User"
SET "mpsCurrent" = CASE
  WHEN "mpsCurrent" < 2 THEN 2
  WHEN "mpsCurrent" > 8 THEN 8
  ELSE "mpsCurrent"
END;
