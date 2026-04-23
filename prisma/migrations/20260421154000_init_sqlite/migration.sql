-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "totpMethod" TEXT,
    "totpEncryptedSecret" TEXT,
    "totpEnrolledAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "factorMethod" TEXT,
    "pendingTotpSecret" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "collaborator" BOOLEAN NOT NULL DEFAULT false,
    "collaboratorName" TEXT NOT NULL DEFAULT '',
    "upc" TEXT NOT NULL DEFAULT '',
    "isrc" TEXT NOT NULL DEFAULT '',
    "coverArtId" TEXT,
    "coverArtFileName" TEXT,
    "coverArtUrl" TEXT,
    "coverArtMimeType" TEXT,
    "lyrics" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'nerdcore',
    "releaseDate" TEXT NOT NULL DEFAULT '',
    "conceptDetails" TEXT NOT NULL DEFAULT '',
    "conceptComplete" BOOLEAN NOT NULL DEFAULT false,
    "beatMade" BOOLEAN NOT NULL DEFAULT false,
    "lyricsFinished" BOOLEAN NOT NULL DEFAULT false,
    "recorded" BOOLEAN NOT NULL DEFAULT false,
    "mixMastered" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdOn" DATETIME NOT NULL,
    "updatedOn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReleaseTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseTask_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReleaseStreamingLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReleaseStreamingLink_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LyricProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "releaseId" TEXT,
    "audioJson" TEXT,
    "backgroundJson" TEXT NOT NULL,
    "lyricsJson" TEXT NOT NULL,
    "animationStyle" TEXT NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "lyricPlacementJson" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "transcriptionLanguage" TEXT NOT NULL,
    "workflowStep" TEXT NOT NULL,
    "transcriptionStatus" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LyricProject_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LyricLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LyricLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "LyricProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CopyEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT,
    "hook" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdOn" DATETIME NOT NULL,
    "updatedOn" DATETIME NOT NULL,
    CONSTRAINT "CopyEntry_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "AdminUser_username_idx" ON "AdminUser"("username");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "Release_pinned_updatedOn_idx" ON "Release"("pinned", "updatedOn");

-- CreateIndex
CREATE INDEX "ReleaseTask_releaseId_sortOrder_idx" ON "ReleaseTask"("releaseId", "sortOrder");

-- CreateIndex
CREATE INDEX "ReleaseStreamingLink_releaseId_idx" ON "ReleaseStreamingLink"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseStreamingLink_releaseId_platform_key" ON "ReleaseStreamingLink"("releaseId", "platform");

-- CreateIndex
CREATE INDEX "LyricProject_releaseId_idx" ON "LyricProject"("releaseId");

-- CreateIndex
CREATE INDEX "LyricProject_updatedAt_idx" ON "LyricProject"("updatedAt");

-- CreateIndex
CREATE INDEX "LyricLine_projectId_sortOrder_idx" ON "LyricLine"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "CopyEntry_releaseId_idx" ON "CopyEntry"("releaseId");

-- CreateIndex
CREATE INDEX "CopyEntry_updatedOn_idx" ON "CopyEntry"("updatedOn");
