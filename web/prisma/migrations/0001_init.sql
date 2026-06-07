-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "rulesMarkdown" TEXT NOT NULL,
    "submissionStartAt" DATETIME NOT NULL,
    "submissionDeadlineAt" DATETIME NOT NULL,
    "judgingDeadlineAt" DATETIME NOT NULL,
    "expectedResultAnnouncementAt" DATETIME NOT NULL,
    "perParticipantSubmissionLimit" INTEGER NOT NULL,
    "maxImagesPerSubmission" INTEGER NOT NULL,
    "reviewRequired" BOOLEAN NOT NULL,
    "anonymousJudging" BOOLEAN NOT NULL,
    "paymentRequired" BOOLEAN NOT NULL,
    "paymentInstructions" TEXT,
    "paymentChargingMode" TEXT NOT NULL,
    "driveFolderId" TEXT,
    "resultsPublishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ActivityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "ActivityGroup_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradingCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL,
    CONSTRAINT "GradingCriterion_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeInvitation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JudgeMembership_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantSubmissionNumber" INTEGER,
    "groupId" TEXT,
    "cardName" TEXT NOT NULL,
    "gameOrSeries" TEXT,
    "characterOrType" TEXT,
    "description" TEXT,
    "authorDisplayName" TEXT,
    "reviewStatus" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Submission_activityId_groupId_fkey" FOREIGN KEY ("activityId", "groupId") REFERENCES "ActivityGroup" ("activityId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubmissionImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageFileId" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionImage_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "submissionId" TEXT,
    "participantId" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL,
    "storageFileId" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentProof_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentProof_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentProof_activityId_participantId_submissionId_fkey" FOREIGN KEY ("activityId", "participantId", "submissionId") REFERENCES "Submission" ("activityId", "participantId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReviewDecision_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "judgeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Score_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_activityId_submissionId_fkey" FOREIGN KEY ("activityId", "submissionId") REFERENCES "Submission" ("activityId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Score_activityId_criterionId_fkey" FOREIGN KEY ("activityId", "criterionId") REFERENCES "GradingCriterion" ("activityId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JudgeComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "judgeId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JudgeComment_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JudgeComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResultSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "finalScore" REAL NOT NULL,
    "rawAverage" REAL NOT NULL,
    "rank" INTEGER,
    "criterionAveragesJson" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResultSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroup_activityId_name_key" ON "ActivityGroup"("activityId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityGroup_activityId_id_key" ON "ActivityGroup"("activityId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "GradingCriterion_activityId_id_key" ON "GradingCriterion"("activityId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeInvitation_tokenHash_key" ON "JudgeInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeMembership_activityId_userId_key" ON "JudgeMembership"("activityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_activityId_id_key" ON "Submission"("activityId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_activityId_participantId_id_key" ON "Submission"("activityId", "participantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_activityId_participantId_participantSubmissionNumber_key" ON "Submission"("activityId", "participantId", "participantSubmissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Score_judgeId_submissionId_criterionId_key" ON "Score"("judgeId", "submissionId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "JudgeComment_judgeId_submissionId_key" ON "JudgeComment"("judgeId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSnapshot_submissionId_key" ON "ResultSnapshot"("submissionId");

