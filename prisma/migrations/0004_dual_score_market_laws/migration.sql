-- Dual-score behavioral meritocracy fields
ALTER TABLE "User" ADD COLUMN "mps" REAL NOT NULL DEFAULT 5.0;
ALTER TABLE "User" ADD COLUMN "basePotential" REAL NOT NULL DEFAULT 5.0;
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "mps" = CASE WHEN "mpsCurrent" < 2 THEN 2 WHEN "mpsCurrent" > 8 THEN 8 ELSE "mpsCurrent" END,
    "basePotential" = "basePotentialScore";

CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "prompts" TEXT,
    "photoMainUrl" TEXT NOT NULL,
    "photoCapturedAt" DATETIME NOT NULL,
    "incomeSelfReported" INTEGER NOT NULL DEFAULT 0,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "preloadedContact" TEXT,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Profile" (
  "id","userId","bio","prompts","photoMainUrl","photoCapturedAt","incomeSelfReported","heightCm","weightKg","profileCompletion","verificationStatus","preloadedContact"
)
SELECT
  "id","userId","bio","prompts","photoMainUrl","photoCapturedAt","incomeSelfReported","heightCm","weightKg","profileCompletion","verificationStatus","preloadedContact"
FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

ALTER TABLE "Like" ADD COLUMN "viewedAt" DATETIME;
