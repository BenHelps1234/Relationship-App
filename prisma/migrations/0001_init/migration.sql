-- Initial MVP schema
CREATE TABLE "City" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "zipPrefix" TEXT NOT NULL UNIQUE,
  "threshold" INTEGER NOT NULL DEFAULT 1000
);
CREATE TABLE "CityStatus" (
  "cityId" TEXT NOT NULL PRIMARY KEY,
  "totalUsersActive" INTEGER NOT NULL DEFAULT 0,
  "threshold" INTEGER NOT NULL DEFAULT 1000,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "gender" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "preferredAgeMin" INTEGER,
  "preferredAgeMax" INTEGER,
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
  "scoreSafety" REAL NOT NULL DEFAULT 1.0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "peerReviewBypassUntil" DATETIME,
  FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("partnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "Profile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "bio" TEXT,
  "prompts" TEXT,
  "photoMainUrl" TEXT NOT NULL,
  "photoCapturedAt" DATETIME NOT NULL,
  "incomeSelfReported" INTEGER NOT NULL DEFAULT 0,
  "heightCm" INTEGER,
  "weightKg" INTEGER,
  "profileCompletion" INTEGER NOT NULL DEFAULT 0,
  "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Like" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "type" TEXT NOT NULL DEFAULT 'direct',
  FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "pairKey" TEXT NOT NULL,
  "participantAId" TEXT NOT NULL,
  "participantBId" TEXT NOT NULL,
  "messageCountTotal" INTEGER NOT NULL DEFAULT 0,
  "state" TEXT NOT NULL DEFAULT 'active',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  FOREIGN KEY ("participantAId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("participantBId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Like_fromUserId_toUserId_key" ON "Like"("fromUserId", "toUserId");
CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");
CREATE TABLE "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "PeerReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "raterUserId" TEXT NOT NULL,
  "ratedUserId" TEXT NOT NULL,
  "vote" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("raterUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("ratedUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PeerReview_raterUserId_ratedUserId_key" ON "PeerReview"("raterUserId", "ratedUserId");
CREATE TABLE "MpsHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mpsValue" REAL NOT NULL,
  "componentSnapshot" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "DailyQuota" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "likesRemaining" INTEGER NOT NULL DEFAULT 5,
  "profilesShownToday" INTEGER NOT NULL DEFAULT 0,
  "shownUserIdsJson" TEXT NOT NULL DEFAULT '[]',
  "peerReviewsCompleted" INTEGER NOT NULL DEFAULT 0,
  "resetAt" DATETIME NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "ProfileDailyStat" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "profileUserId" TEXT NOT NULL,
  "statDate" TEXT NOT NULL,
  "likesReceived" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("profileUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "HiddenProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "hiddenUserId" TEXT NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("hiddenUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProfileDailyStat_profileUserId_statDate_key" ON "ProfileDailyStat"("profileUserId", "statDate");
CREATE UNIQUE INDEX "HiddenProfile_userId_hiddenUserId_key" ON "HiddenProfile"("userId", "hiddenUserId");
CREATE TABLE "WaitlistState" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "cityId" TEXT NOT NULL,
  "priorityScore" INTEGER NOT NULL DEFAULT 0,
  "priorityUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewsCompletedSinceLastGate" INTEGER NOT NULL DEFAULT 0,
  "nextEligibleAt" DATETIME,
  "totalReviewsCompletedLifetime" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("cityId") REFERENCES "City" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
