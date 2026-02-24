-- Add ADMIN role, reliability score, and preloaded contact
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "preferredAgeMin" INTEGER,
    "preferredAgeMax" INTEGER,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "zip" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "partnerId" TEXT,
    "accountStatus" TEXT NOT NULL DEFAULT 'active',
    "riskFingerprintHash" TEXT,
    "lastActiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mpsCurrent" REAL NOT NULL DEFAULT 1.0,
    "scorePhysicality" REAL NOT NULL DEFAULT 1.0,
    "scoreResources" REAL NOT NULL DEFAULT 1.0,
    "scoreReliability" REAL NOT NULL DEFAULT 1.0,
    "reliabilityScore" REAL NOT NULL DEFAULT 0,
    "scoreSafety" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "peerReviewBypassUntil" DATETIME,
    CONSTRAINT "User_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" (
  "id","email","passwordHash","gender","age","preferredAgeMin","preferredAgeMax","contactEmail","contactPhone","zip","cityId","isFrozen","partnerId","accountStatus","riskFingerprintHash","lastActiveAt","mpsCurrent","scorePhysicality","scoreResources","scoreReliability","scoreSafety","createdAt","updatedAt","peerReviewBypassUntil"
)
SELECT
  "id","email","passwordHash","gender","age","preferredAgeMin","preferredAgeMax","contactEmail","contactPhone","zip","cityId","isFrozen","partnerId","accountStatus","riskFingerprintHash","lastActiveAt","mpsCurrent","scorePhysicality","scoreResources","scoreReliability","scoreSafety","createdAt","updatedAt","peerReviewBypassUntil"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

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
    "preloadedContact" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Profile" (
  "id","userId","bio","prompts","photoMainUrl","photoCapturedAt","incomeSelfReported","heightCm","weightKg","profileCompletion","verificationStatus"
)
SELECT
  "id","userId","bio","prompts","photoMainUrl","photoCapturedAt","incomeSelfReported","heightCm","weightKg","profileCompletion","verificationStatus"
FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
