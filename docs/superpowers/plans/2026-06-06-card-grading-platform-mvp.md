# Card Grading Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first MVP website for hand-drawn game card grading and competition activities.

**Architecture:** Create a `web/` Next.js App Router application with focused domain modules, a Prisma database layer, role-based access control, adapter-based file storage/email services, and mobile-first route groups for public, participant, judge, and admin workflows. The MVP uses SQLite for local development speed while keeping domain boundaries portable to PostgreSQL-backed deployment.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Prisma, SQLite for local MVP, Zod, React Hook Form, Vitest, Testing Library, Playwright, Google Drive API adapter, Nodemailer-compatible email adapter.

---

## Scope Check

The approved spec spans several subsystems. This plan implements them as one staged MVP because each stage produces a working checkpoint inside the same application:

1. App scaffold and test tooling.
2. Domain logic for scoring, ranking, eligibility, and publish gating.
3. Database schema and seed data.
4. Auth and role-based access.
5. Mobile-first design primitives.
6. Activity management and public pages.
7. Participant submission and image upload.
8. Review and payment proof workflows.
9. Judge invitation and scoring.
10. Result calculation, publishing, and exports.
11. Email and Google Drive adapters.
12. Mobile verification and final hardening.

## File Structure

Create the application under `web/` so the repository can keep Superpowers docs at the root.

```text
web/
+-- prisma/
|   +-- schema.prisma
|   +-- seed.ts
+-- src/
|   +-- app/
|   |   +-- (public)/
|   |   +-- admin/
|   |   +-- judge/
|   |   +-- account/
|   |   +-- api/
|   |   +-- layout.tsx
|   |   +-- globals.css
|   +-- components/
|   |   +-- ui/
|   |   +-- mobile/
|   |   +-- forms/
|   +-- lib/
|   |   +-- auth/
|   |   +-- db/
|   |   +-- domain/
|   |   +-- email/
|   |   +-- files/
|   |   +-- validation/
|   +-- tests/
|       +-- factories/
|       +-- setup.ts
+-- e2e/
+-- package.json
+-- vitest.config.ts
+-- playwright.config.ts
```

Boundary rules:

- `src/lib/domain/*` contains pure business logic and has no database, HTTP, or React imports.
- `src/lib/db/*` contains Prisma client setup and repository functions.
- `src/lib/auth/*` owns password hashing, session cookies, and role checks.
- `src/lib/files/*` owns local and Google Drive storage adapters behind one interface.
- `src/lib/email/*` owns console and SMTP email adapters behind one interface.
- `src/components/*` owns reusable UI only; route-specific data loading stays in `src/app/*`.
- Route handlers call repositories and adapters. They do not contain scoring or ranking algorithms.

## Commit Rhythm

Commit after every task when tests for that task pass. Use the commit messages listed in each task.

---

### Task 1: Scaffold Next.js App And Tooling

**Files:**
- Create: `web/`
- Create: `web/vitest.config.ts`
- Create: `web/src/tests/setup.ts`
- Create: `web/playwright.config.ts`
- Modify: `web/package.json`

- [ ] **Step 1: Scaffold the app**

Run:

```bash
npx create-next-app@latest web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: `web/package.json`, `web/src/app/page.tsx`, and Tailwind files exist.

- [ ] **Step 2: Install runtime dependencies**

Run:

```bash
cd web
npm install @prisma/client zod bcryptjs jose react-hook-form @hookform/resolvers marked file-type googleapis nodemailer csv-stringify
```

Expected: packages are added to `web/package.json`.

- [ ] **Step 3: Install development dependencies**

Run:

```bash
cd web
npm install -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test tsx
```

Expected: dev packages are added to `web/package.json`.

- [ ] **Step 4: Add Vitest config**

Create `web/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Create `web/src/tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add Playwright config**

Create `web/playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "Mobile Chrome", use: { ...devices["Pixel 7"] } },
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 6: Add package scripts**

Run:

```bash
cd web
npm pkg set scripts.test="vitest --run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.e2e="playwright test"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.db:push="prisma db push"
npm pkg set scripts.db:seed="tsx prisma/seed.ts"
```

Expected: `web/package.json` has `test`, `test:watch`, `e2e`, `typecheck`, `db:push`, and `db:seed` scripts.

- [ ] **Step 7: Verify scaffold**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: typecheck passes; Vitest exits successfully even before app tests exist.

- [ ] **Step 8: Commit**

```bash
git add web
git commit -m "chore: scaffold web app"
```

---

### Task 2: Domain Scoring And Ranking

**Files:**
- Create: `web/src/lib/domain/scoring.ts`
- Create: `web/src/lib/domain/scoring.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/lib/domain/scoring.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateFinalScore,
  rankCompetitionResults,
  roundToNearestHalf,
  validateHalfPointScore,
} from "./scoring";

describe("validateHalfPointScore", () => {
  it("accepts scores from 0 to 10 in 0.5 increments", () => {
    expect(validateHalfPointScore(0)).toBe(0);
    expect(validateHalfPointScore(7.5)).toBe(7.5);
    expect(validateHalfPointScore(10)).toBe(10);
  });

  it("rejects scores outside range or outside 0.5 increments", () => {
    expect(() => validateHalfPointScore(-0.5)).toThrow("Score must be between 0 and 10");
    expect(() => validateHalfPointScore(10.5)).toThrow("Score must be between 0 and 10");
    expect(() => validateHalfPointScore(7.25)).toThrow("Score must use 0.5 increments");
  });
});

describe("roundToNearestHalf", () => {
  it("rounds values to the nearest half point", () => {
    expect(roundToNearestHalf(8.24)).toBe(8);
    expect(roundToNearestHalf(8.25)).toBe(8.5);
    expect(roundToNearestHalf(8.74)).toBe(8.5);
    expect(roundToNearestHalf(8.75)).toBe(9);
  });
});

describe("calculateFinalScore", () => {
  it("averages all judge criterion scores and rounds to nearest 0.5", () => {
    expect(
      calculateFinalScore([
        { judgeId: "judge-1", criterionId: "creativity", score: 8 },
        { judgeId: "judge-1", criterionId: "finish", score: 8.5 },
        { judgeId: "judge-2", criterionId: "creativity", score: 9 },
        { judgeId: "judge-2", criterionId: "finish", score: 8 },
      ]),
    ).toEqual({
      rawAverage: 8.375,
      finalScore: 8.5,
      criterionAverages: [
        { criterionId: "creativity", average: 8.5 },
        { criterionId: "finish", average: 8.25 },
      ],
    });
  });

  it("rejects empty score lists", () => {
    expect(() => calculateFinalScore([])).toThrow("At least one score is required");
  });
});

describe("rankCompetitionResults", () => {
  it("uses shared ranks for ties and skips the next rank", () => {
    expect(
      rankCompetitionResults([
        { submissionId: "card-a", groupId: "open", finalScore: 9 },
        { submissionId: "card-b", groupId: "open", finalScore: 9 },
        { submissionId: "card-c", groupId: "open", finalScore: 8.5 },
        { submissionId: "card-d", groupId: "junior", finalScore: 7 },
      ]),
    ).toEqual([
      { submissionId: "card-a", groupId: "open", finalScore: 9, rank: 1 },
      { submissionId: "card-b", groupId: "open", finalScore: 9, rank: 1 },
      { submissionId: "card-c", groupId: "open", finalScore: 8.5, rank: 3 },
      { submissionId: "card-d", groupId: "junior", finalScore: 7, rank: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web
npm test -- src/lib/domain/scoring.test.ts
```

Expected: FAIL because `src/lib/domain/scoring.ts` does not exist.

- [ ] **Step 3: Implement scoring domain**

Create `web/src/lib/domain/scoring.ts`:

```ts
export type ScoreInput = {
  judgeId: string;
  criterionId: string;
  score: number;
};

export type CriterionAverage = {
  criterionId: string;
  average: number;
};

export type FinalScoreResult = {
  rawAverage: number;
  finalScore: number;
  criterionAverages: CriterionAverage[];
};

export type CompetitionResultInput = {
  submissionId: string;
  groupId: string;
  finalScore: number;
};

export type RankedCompetitionResult = CompetitionResultInput & {
  rank: number;
};

export function validateHalfPointScore(score: number): number {
  if (score < 0 || score > 10) {
    throw new Error("Score must be between 0 and 10");
  }

  if (Math.round(score * 2) !== score * 2) {
    throw new Error("Score must use 0.5 increments");
  }

  return score;
}

export function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function calculateFinalScore(scores: ScoreInput[]): FinalScoreResult {
  if (scores.length === 0) {
    throw new Error("At least one score is required");
  }

  for (const score of scores) {
    validateHalfPointScore(score.score);
  }

  const rawAverage = scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
  const criterionIds = [...new Set(scores.map((score) => score.criterionId))];

  const criterionAverages = criterionIds.map((criterionId) => {
    const criterionScores = scores.filter((score) => score.criterionId === criterionId);
    return {
      criterionId,
      average: criterionScores.reduce((sum, score) => sum + score.score, 0) / criterionScores.length,
    };
  });

  return {
    rawAverage,
    finalScore: roundToNearestHalf(rawAverage),
    criterionAverages,
  };
}

export function rankCompetitionResults(results: CompetitionResultInput[]): RankedCompetitionResult[] {
  const grouped = new Map<string, CompetitionResultInput[]>();

  for (const result of results) {
    grouped.set(result.groupId, [...(grouped.get(result.groupId) ?? []), result]);
  }

  return [...grouped.values()].flatMap((groupResults) => {
    const sorted = [...groupResults].sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return a.submissionId.localeCompare(b.submissionId);
    });

    let previousScore: number | null = null;
    let previousRank = 0;

    return sorted.map((result, index) => {
      const rank = previousScore === result.finalScore ? previousRank : index + 1;
      previousScore = result.finalScore;
      previousRank = rank;
      return { ...result, rank };
    });
  });
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
cd web
npm test -- src/lib/domain/scoring.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/domain/scoring.ts web/src/lib/domain/scoring.test.ts
git commit -m "feat: add scoring domain logic"
```

---

### Task 3: Domain Eligibility And Publishing Rules

**Files:**
- Create: `web/src/lib/domain/workflow.ts`
- Create: `web/src/lib/domain/workflow.test.ts`

- [ ] **Step 1: Write failing tests**

Create `web/src/lib/domain/workflow.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canEditSubmission,
  canPublishResults,
  getSubmissionJudgingEligibility,
} from "./workflow";

const beforeDeadline = new Date("2026-07-01T10:00:00.000Z");
const afterDeadline = new Date("2026-07-02T10:00:00.000Z");
const deadline = new Date("2026-07-01T23:59:00.000Z");

describe("canEditSubmission", () => {
  it("allows owners to edit before submission deadline", () => {
    expect(
      canEditSubmission({
        now: beforeDeadline,
        submissionDeadline: deadline,
        isOwner: true,
        isDeleted: false,
      }),
    ).toBe(true);
  });

  it("blocks editing after deadline, by non-owners, and deleted submissions", () => {
    expect(canEditSubmission({ now: afterDeadline, submissionDeadline: deadline, isOwner: true, isDeleted: false })).toBe(false);
    expect(canEditSubmission({ now: beforeDeadline, submissionDeadline: deadline, isOwner: false, isDeleted: false })).toBe(false);
    expect(canEditSubmission({ now: beforeDeadline, submissionDeadline: deadline, isOwner: true, isDeleted: true })).toBe(false);
  });
});

describe("getSubmissionJudgingEligibility", () => {
  it("allows judging when review and payment conditions are satisfied", () => {
    expect(
      getSubmissionJudgingEligibility({
        deletedAt: null,
        reviewRequired: true,
        reviewStatus: "approved",
        paymentRequired: true,
        paymentStatus: "confirmed",
      }),
    ).toEqual({ eligible: true, reason: null });
  });

  it("returns a specific reason when blocked", () => {
    expect(
      getSubmissionJudgingEligibility({
        deletedAt: null,
        reviewRequired: true,
        reviewStatus: "pending",
        paymentRequired: false,
        paymentStatus: "not_required",
      }),
    ).toEqual({ eligible: false, reason: "review_pending" });
  });
});

describe("canPublishResults", () => {
  it("requires every eligible submission to have all judge scores", () => {
    expect(canPublishResults({ eligibleSubmissionCount: 3, judgeCount: 2, completedJudgeSubmissionPairs: 6 })).toEqual({
      canPublish: true,
      missingJudgeSubmissionPairs: 0,
    });

    expect(canPublishResults({ eligibleSubmissionCount: 3, judgeCount: 2, completedJudgeSubmissionPairs: 5 })).toEqual({
      canPublish: false,
      missingJudgeSubmissionPairs: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd web
npm test -- src/lib/domain/workflow.test.ts
```

Expected: FAIL because `src/lib/domain/workflow.ts` does not exist.

- [ ] **Step 3: Implement workflow domain**

Create `web/src/lib/domain/workflow.ts`:

```ts
export type ReviewStatus = "not_required" | "pending" | "approved" | "rejected";
export type PaymentStatus = "not_required" | "pending" | "confirmed" | "rejected";
export type EligibilityReason =
  | "deleted"
  | "review_pending"
  | "review_rejected"
  | "payment_pending"
  | "payment_rejected";

export function canEditSubmission(input: {
  now: Date;
  submissionDeadline: Date;
  isOwner: boolean;
  isDeleted: boolean;
}): boolean {
  return input.isOwner && !input.isDeleted && input.now <= input.submissionDeadline;
}

export function getSubmissionJudgingEligibility(input: {
  deletedAt: Date | null;
  reviewRequired: boolean;
  reviewStatus: ReviewStatus;
  paymentRequired: boolean;
  paymentStatus: PaymentStatus;
}): { eligible: boolean; reason: EligibilityReason | null } {
  if (input.deletedAt) return { eligible: false, reason: "deleted" };

  if (input.reviewRequired && input.reviewStatus === "pending") {
    return { eligible: false, reason: "review_pending" };
  }

  if (input.reviewRequired && input.reviewStatus === "rejected") {
    return { eligible: false, reason: "review_rejected" };
  }

  if (input.paymentRequired && input.paymentStatus === "pending") {
    return { eligible: false, reason: "payment_pending" };
  }

  if (input.paymentRequired && input.paymentStatus === "rejected") {
    return { eligible: false, reason: "payment_rejected" };
  }

  return { eligible: true, reason: null };
}

export function canPublishResults(input: {
  eligibleSubmissionCount: number;
  judgeCount: number;
  completedJudgeSubmissionPairs: number;
}): { canPublish: boolean; missingJudgeSubmissionPairs: number } {
  const requiredPairs = input.eligibleSubmissionCount * input.judgeCount;
  const missingJudgeSubmissionPairs = Math.max(requiredPairs - input.completedJudgeSubmissionPairs, 0);

  return {
    canPublish: missingJudgeSubmissionPairs === 0,
    missingJudgeSubmissionPairs,
  };
}
```

- [ ] **Step 4: Verify tests pass**

Run:

```bash
cd web
npm test -- src/lib/domain/workflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/domain/workflow.ts web/src/lib/domain/workflow.test.ts
git commit -m "feat: add workflow eligibility rules"
```

---

### Task 4: Database Schema And Seed Data

**Files:**
- Create: `web/prisma/schema.prisma`
- Create: `web/prisma/seed.ts`
- Create: `web/.env.example`
- Create: `web/src/lib/db/prisma.ts`
- Modify: `web/package.json`

- [ ] **Step 1: Create Prisma schema**

Create `web/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  displayName     String
  emailVerifiedAt DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  roles            UserRole[]
  submissions      Submission[]
  judgeMemberships JudgeMembership[]
  reviewDecisions  ReviewDecision[]
  scores           Score[]
  judgeComments    JudgeComment[]
  verificationTokens EmailVerificationToken[]
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String
  role      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
}

model Activity {
  id                           String   @id @default(cuid())
  slug                         String   @unique
  title                        String
  description                  String
  mode                         String
  rulesMarkdown                String
  submissionStartAt            DateTime
  submissionDeadlineAt         DateTime
  judgingDeadlineAt            DateTime
  expectedResultAnnouncementAt DateTime
  perParticipantSubmissionLimit Int
  maxImagesPerSubmission       Int
  reviewRequired               Boolean
  anonymousJudging             Boolean
  paymentRequired              Boolean
  paymentInstructions          String?
  paymentChargingMode          String
  driveFolderId                String?
  resultsPublishedAt           DateTime?
  createdAt                    DateTime @default(now())
  updatedAt                    DateTime @updatedAt

  groups            ActivityGroup[]
  criteria          GradingCriterion[]
  submissions       Submission[]
  judgeInvitations  JudgeInvitation[]
  judgeMemberships  JudgeMembership[]
}

model ActivityGroup {
  id          String @id @default(cuid())
  activityId  String
  name        String
  displayOrder Int

  activity    Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  submissions Submission[]

  @@unique([activityId, name])
}

model GradingCriterion {
  id          String @id @default(cuid())
  activityId  String
  name        String
  description String?
  displayOrder Int

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  scores   Score[]
}

model JudgeInvitation {
  id         String   @id @default(cuid())
  activityId String
  tokenHash  String   @unique
  email      String?
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
}

model JudgeMembership {
  id         String   @id @default(cuid())
  activityId String
  userId     String
  createdAt  DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([activityId, userId])
}

model Submission {
  id              String   @id @default(cuid())
  activityId      String
  participantId   String
  groupId         String?
  cardName        String
  gameOrSeries    String?
  characterOrType String?
  description     String?
  authorDisplayName String?
  reviewStatus    String
  paymentStatus   String
  rejectionReason String?
  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  activity        Activity      @relation(fields: [activityId], references: [id], onDelete: Cascade)
  participant     User          @relation(fields: [participantId], references: [id], onDelete: Cascade)
  group           ActivityGroup? @relation(fields: [groupId], references: [id])
  images          SubmissionImage[]
  paymentProofs   PaymentProof[]
  reviewDecisions ReviewDecision[]
  scores          Score[]
  judgeComments   JudgeComment[]
  resultSnapshot  ResultSnapshot?
}

model SubmissionImage {
  id              String   @id @default(cuid())
  submissionId    String
  storageProvider String
  storageFileId   String
  publicUrl       String
  originalName    String
  mimeType        String
  fileSize        Int
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

model PaymentProof {
  id              String   @id @default(cuid())
  activityId      String
  submissionId    String?
  participantId   String
  storageProvider String
  storageFileId   String
  publicUrl       String
  originalName    String
  mimeType        String
  fileSize        Int
  status          String
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())

  submission Submission? @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}

model ReviewDecision {
  id           String   @id @default(cuid())
  submissionId String
  adminId      String
  decision     String
  reason       String?
  createdAt    DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  admin      User       @relation(fields: [adminId], references: [id], onDelete: Cascade)
}

model Score {
  id          String   @id @default(cuid())
  judgeId     String
  submissionId String
  criterionId String
  value       Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  judge      User             @relation(fields: [judgeId], references: [id], onDelete: Cascade)
  submission Submission       @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  criterion  GradingCriterion @relation(fields: [criterionId], references: [id], onDelete: Cascade)

  @@unique([judgeId, submissionId, criterionId])
}

model JudgeComment {
  id           String   @id @default(cuid())
  judgeId      String
  submissionId String
  comment      String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  judge      User       @relation(fields: [judgeId], references: [id], onDelete: Cascade)
  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)

  @@unique([judgeId, submissionId])
}

model ResultSnapshot {
  id           String   @id @default(cuid())
  submissionId String   @unique
  finalScore   Float
  rawAverage   Float
  rank         Int?
  criterionAveragesJson String
  publishedAt  DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 2: Add environment example**

Create `web/.env.example`:

```bash
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-with-32-random-bytes"
INITIAL_ADMIN_EMAIL="admin@example.com"
INITIAL_ADMIN_PASSWORD="change-this-password"
INITIAL_ADMIN_DISPLAY_NAME="Admin"
APP_BASE_URL="http://127.0.0.1:3000"
EMAIL_PROVIDER="console"
FILE_STORAGE_PROVIDER="local"
LOCAL_UPLOAD_ROOT="./uploads"
GOOGLE_DRIVE_ROOT_FOLDER_ID=""
GOOGLE_SERVICE_ACCOUNT_EMAIL=""
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="Card Grading <no-reply@example.com>"
```

- [ ] **Step 3: Add Prisma client helper**

Create `web/src/lib/db/prisma.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: Add seed script**

Create `web/prisma/seed.ts`:

```ts
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db/prisma";

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "change-this-password";
  const displayName = process.env.INITIAL_ADMIN_DISPLAY_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName, emailVerifiedAt: new Date() },
    create: { email, passwordHash, displayName, emailVerifiedAt: new Date() },
  });

  await prisma.userRole.upsert({
    where: { userId_role: { userId: user.id, role: "admin" } },
    update: {},
    create: { userId: user.id, role: "admin" },
  });

  console.log(`Seeded admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 5: Push schema and seed**

Run:

```bash
cd web
cp .env.example .env
npm run db:push
npm run db:seed
```

Expected: `web/prisma/dev.db` is created and console prints `Seeded admin: admin@example.com`.

- [ ] **Step 6: Verify typecheck**

Run:

```bash
cd web
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/prisma web/.env.example web/src/lib/db/prisma.ts web/package.json web/package-lock.json
git commit -m "feat: add database schema and seed"
```

---

### Task 5: Authentication And Role-Based Access

**Files:**
- Create: `web/src/lib/auth/password.ts`
- Create: `web/src/lib/auth/password.test.ts`
- Create: `web/src/lib/auth/session.ts`
- Create: `web/src/lib/auth/rbac.ts`
- Create: `web/src/app/account/register/page.tsx`
- Create: `web/src/app/account/login/page.tsx`
- Create: `web/src/app/account/verify-email/[token]/page.tsx`
- Create: `web/src/app/account/logout/route.ts`
- Create: `web/src/app/api/auth/register/route.ts`
- Create: `web/src/app/api/auth/login/route.ts`
- Create: `web/src/app/admin/users/page.tsx`
- Create: `web/src/app/api/admin/users/route.ts`

- [ ] **Step 1: Write password tests**

Create `web/src/lib/auth/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password helpers", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Implement password helpers**

Create `web/src/lib/auth/password.ts`:

```ts
import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 3: Implement session helpers**

Create `web/src/lib/auth/session.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const cookieName = "cardevent_session";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function readSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, getSecret());
    return verified.payload as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(cookieName);
}
```

- [ ] **Step 4: Implement RBAC helpers**

Create `web/src/lib/auth/rbac.ts`:

```ts
import { redirect } from "next/navigation";
import { readSessionUser, type SessionUser } from "./session";

export function hasRole(user: SessionUser | null, role: string): boolean {
  return Boolean(user?.roles.includes(role));
}

export async function requireUser(): Promise<SessionUser> {
  const user = await readSessionUser();
  if (!user) redirect("/account/login");
  return user;
}

export async function requireRole(role: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, role)) redirect("/");
  return user;
}
```

- [ ] **Step 5: Implement register and login route handlers**

Create `web/src/app/api/auth/register/route.ts` and `web/src/app/api/auth/login/route.ts`.

Both handlers must use these schemas:

```ts
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

Registration behavior:

- Reject duplicate email with HTTP 409.
- Hash the password.
- Create `User`.
- Create `UserRole` with role `participant`.
- Create `EmailVerificationToken` with a SHA-256 token hash and 24-hour expiry.
- Send registration verification email with the raw token URL.
- Set the session cookie with roles loaded from the database.
- Redirect to `/activities`.

Login behavior:

- Reject unknown email or invalid password with HTTP 401.
- Load user roles.
- Set the session cookie.
- Redirect admin users to `/admin`, judge users to `/judge`, and all other users to `/activities`.

Email verification behavior:

- `web/src/app/account/verify-email/[token]/page.tsx` hashes the raw token from the URL.
- It rejects missing, expired, or used tokens with a clear message.
- It sets `User.emailVerifiedAt` and `EmailVerificationToken.usedAt` in one transaction.
- It shows a success state with a link to `/activities`.

Code pattern for both handlers:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
```

- [ ] **Step 6: Implement mobile-friendly auth pages**

Create `web/src/app/account/register/page.tsx`, `web/src/app/account/login/page.tsx`, and `web/src/app/account/verify-email/[token]/page.tsx` as one-column pages with 44px minimum control height, clear labels, visible error area, and a full-width submit button near the bottom of the form.

- [ ] **Step 7: Add admin user creation**

Create `web/src/app/admin/users/page.tsx` and `web/src/app/api/admin/users/route.ts`.

Admin user creation behavior:

- Requires admin role.
- Accepts email, display name, password, and role.
- Allows role `admin` or `participant`.
- Hashes the password.
- Creates the user and selected role.
- Sets `emailVerifiedAt` immediately because the account was created by an admin.

- [ ] **Step 8: Verify**

Run:

```bash
cd web
npm test -- src/lib/auth/password.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add web/src/lib/auth web/src/app/account web/src/app/admin/users web/src/app/api/auth web/src/app/api/admin/users
git commit -m "feat: add email password authentication"
```

---

### Task 6: Mobile UI Primitives

**Files:**
- Create: `web/src/components/ui/button.tsx`
- Create: `web/src/components/ui/status-badge.tsx`
- Create: `web/src/components/mobile/bottom-action-bar.tsx`
- Create: `web/src/components/mobile/mobile-card-list.tsx`
- Create: `web/src/components/forms/form-field.tsx`
- Create: `web/src/components/ui/button.test.tsx`
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Write button test**

Create `web/src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("uses a mobile-friendly minimum touch target", () => {
    render(<Button>Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveClass("min-h-11");
  });
});
```

- [ ] **Step 2: Implement UI primitives**

Create `web/src/components/ui/button.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
};

const variants = {
  primary: "bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "bg-white text-zinc-950 ring-1 ring-zinc-200 hover:bg-zinc-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

Create `web/src/components/ui/status-badge.tsx`:

```tsx
export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{label}</span>;
}
```

Create `web/src/components/mobile/bottom-action-bar.tsx`:

```tsx
import type { ReactNode } from "react";

export function BottomActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom sticky bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-4 pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl gap-2">{children}</div>
    </div>
  );
}
```

Create `web/src/components/mobile/mobile-card-list.tsx`:

```tsx
import type { ReactNode } from "react";

export function MobileCardList({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
```

Create `web/src/components/forms/form-field.tsx`:

```tsx
import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-zinc-900">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
      {error ? <span className="text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}
```

- [ ] **Step 3: Add global mobile defaults**

Modify `web/src/app/globals.css` to include:

```css
html {
  text-size-adjust: 100%;
}

body {
  background: #f7f5f0;
  color: #18181b;
}

button,
input,
select,
textarea {
  font: inherit;
}

.safe-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
```

- [ ] **Step 4: Verify**

Run:

```bash
cd web
npm test -- src/components/ui/button.test.tsx
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components web/src/app/globals.css
git commit -m "feat: add mobile UI primitives"
```

---

### Task 7: Activity Creation And Public Activity Pages

**Files:**
- Create: `web/src/lib/validation/activity.ts`
- Create: `web/src/lib/db/activity-repository.ts`
- Create: `web/src/app/(public)/activities/page.tsx`
- Create: `web/src/app/(public)/activities/[slug]/page.tsx`
- Create: `web/src/app/admin/page.tsx`
- Create: `web/src/app/admin/activities/new/page.tsx`
- Create: `web/src/app/api/admin/activities/route.ts`

- [ ] **Step 1: Add activity validation schema**

Create `web/src/lib/validation/activity.ts`:

```ts
import { z } from "zod";

export const activityModeSchema = z.enum(["competition", "grading"]);
export const paymentChargingModeSchema = z.enum(["per_card", "per_participant"]);

export const gradingCriterionInputSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0),
});

export const activityGroupInputSchema = z.object({
  name: z.string().min(1).max(80),
  displayOrder: z.number().int().min(0),
});

export const createActivitySchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  mode: activityModeSchema,
  rulesMarkdown: z.string().min(1),
  submissionStartAt: z.coerce.date(),
  submissionDeadlineAt: z.coerce.date(),
  judgingDeadlineAt: z.coerce.date(),
  expectedResultAnnouncementAt: z.coerce.date(),
  perParticipantSubmissionLimit: z.coerce.number().int().min(1).max(20),
  maxImagesPerSubmission: z.coerce.number().int().min(1).max(10),
  reviewRequired: z.coerce.boolean(),
  anonymousJudging: z.coerce.boolean(),
  paymentRequired: z.coerce.boolean(),
  paymentInstructions: z.string().max(2000).optional(),
  paymentChargingMode: paymentChargingModeSchema,
  groups: z.array(activityGroupInputSchema).min(1),
  criteria: z.array(gradingCriterionInputSchema).min(1),
});
```

- [ ] **Step 2: Add repository functions**

Create `web/src/lib/db/activity-repository.ts` with functions:

```ts
import { prisma } from "./prisma";
import type { z } from "zod";
import type { createActivitySchema } from "@/lib/validation/activity";

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export async function listPublishedActivities() {
  return prisma.activity.findMany({
    orderBy: { submissionStartAt: "desc" },
    include: { groups: { orderBy: { displayOrder: "asc" } }, criteria: { orderBy: { displayOrder: "asc" } } },
  });
}

export async function getActivityBySlug(slug: string) {
  return prisma.activity.findUnique({
    where: { slug },
    include: { groups: { orderBy: { displayOrder: "asc" } }, criteria: { orderBy: { displayOrder: "asc" } } },
  });
}

export async function createActivity(input: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      slug: input.slug,
      title: input.title,
      description: input.description,
      mode: input.mode,
      rulesMarkdown: input.rulesMarkdown,
      submissionStartAt: input.submissionStartAt,
      submissionDeadlineAt: input.submissionDeadlineAt,
      judgingDeadlineAt: input.judgingDeadlineAt,
      expectedResultAnnouncementAt: input.expectedResultAnnouncementAt,
      perParticipantSubmissionLimit: input.perParticipantSubmissionLimit,
      maxImagesPerSubmission: input.maxImagesPerSubmission,
      reviewRequired: input.reviewRequired,
      anonymousJudging: input.anonymousJudging,
      paymentRequired: input.paymentRequired,
      paymentInstructions: input.paymentInstructions,
      paymentChargingMode: input.paymentChargingMode,
      groups: { create: input.groups },
      criteria: { create: input.criteria },
    },
  });
}
```

- [ ] **Step 3: Add public pages**

Create mobile-first activity listing and detail pages:

- `web/src/app/(public)/activities/page.tsx`: list activity cards with mode, dates, status, and primary link.
- `web/src/app/(public)/activities/[slug]/page.tsx`: show status, deadlines, rules rendered from Markdown, criteria, groups, payment instructions, and submit CTA.

- [ ] **Step 4: Add admin creation route and page**

Create `web/src/app/api/admin/activities/route.ts` to require admin role, validate `createActivitySchema`, call `createActivity`, and redirect to `/admin`.

Create `web/src/app/admin/activities/new/page.tsx` as a sectioned mobile wizard with these sections: basics, dates, submission settings, payment, groups, criteria, rules.

- [ ] **Step 5: Verify**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/validation/activity.ts web/src/lib/db/activity-repository.ts web/src/app
git commit -m "feat: add activity management"
```

---

### Task 8: Participant Submissions And Local File Storage

**Files:**
- Create: `web/src/lib/files/file-storage.ts`
- Create: `web/src/lib/files/local-file-storage.ts`
- Create: `web/src/lib/validation/submission.ts`
- Create: `web/src/lib/db/submission-repository.ts`
- Create: `web/src/app/(public)/activities/[slug]/submit/page.tsx`
- Create: `web/src/app/api/activities/[activityId]/submissions/route.ts`
- Create: `web/src/app/account/submissions/page.tsx`

- [ ] **Step 1: Create storage interface**

Create `web/src/lib/files/file-storage.ts`:

```ts
export type StoredFile = {
  provider: "local" | "google_drive";
  fileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
};

export type FileStorage = {
  saveSubmissionImage(input: {
    activitySlug: string;
    submissionId: string;
    file: File;
  }): Promise<StoredFile>;
  savePaymentProof(input: {
    activitySlug: string;
    ownerId: string;
    file: File;
  }): Promise<StoredFile>;
};
```

- [ ] **Step 2: Implement local storage adapter**

Create `web/src/lib/files/local-file-storage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStorage, StoredFile } from "./file-storage";

const uploadRoot = process.env.LOCAL_UPLOAD_ROOT ?? "./uploads";

async function saveFile(folder: string, file: File): Promise<StoredFile> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const absoluteFolder = path.join(process.cwd(), uploadRoot, folder);
  await mkdir(absoluteFolder, { recursive: true });
  await writeFile(path.join(absoluteFolder, safeName), buffer);

  return {
    provider: "local",
    fileId: `${folder}/${safeName}`,
    publicUrl: `/uploads/${folder}/${safeName}`,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

export const localFileStorage: FileStorage = {
  saveSubmissionImage({ activitySlug, submissionId, file }) {
    return saveFile(`activities/${activitySlug}/submissions/${submissionId}`, file);
  },
  savePaymentProof({ activitySlug, ownerId, file }) {
    return saveFile(`activities/${activitySlug}/payment-proofs/${ownerId}`, file);
  },
};
```

- [ ] **Step 3: Add submission validation**

Create `web/src/lib/validation/submission.ts`:

```ts
import { z } from "zod";

export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxImageBytes = 10 * 1024 * 1024;

export const submissionInputSchema = z.object({
  cardName: z.string().min(1).max(120),
  gameOrSeries: z.string().max(120).optional(),
  characterOrType: z.string().max(120).optional(),
  description: z.string().max(1000).optional(),
  authorDisplayName: z.string().max(120).optional(),
  groupId: z.string().optional(),
});

export function validateImageFile(file: File): void {
  if (!acceptedImageTypes.includes(file.type as (typeof acceptedImageTypes)[number])) {
    throw new Error("Only JPG, PNG, and WebP images are accepted");
  }

  if (file.size > maxImageBytes) {
    throw new Error("Each image must be 10MB or smaller");
  }
}
```

- [ ] **Step 4: Add submission repository**

Create `web/src/lib/db/submission-repository.ts` with these exported functions:

```ts
import { prisma } from "./prisma";

export async function countParticipantSubmissions(activityId: string, participantId: string) {
  return prisma.submission.count({
    where: { activityId, participantId, deletedAt: null },
  });
}

export async function createSubmissionRecord(input: {
  activityId: string;
  participantId: string;
  groupId?: string;
  cardName: string;
  gameOrSeries?: string;
  characterOrType?: string;
  description?: string;
  authorDisplayName?: string;
  reviewStatus: "not_required" | "pending";
  paymentStatus: "not_required" | "pending";
}) {
  return prisma.submission.create({ data: input });
}

export async function addSubmissionImage(input: {
  submissionId: string;
  storageProvider: string;
  storageFileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}) {
  return prisma.submissionImage.create({ data: { ...input, active: true } });
}

export async function markSubmissionImagesInactive(submissionId: string) {
  return prisma.submissionImage.updateMany({
    where: { submissionId, active: true },
    data: { active: false },
  });
}

export async function listParticipantSubmissions(participantId: string) {
  return prisma.submission.findMany({
    where: { participantId, deletedAt: null },
    include: { activity: true, group: true, images: { where: { active: true } } },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 5: Add mobile submission UI**

Create `web/src/app/(public)/activities/[slug]/submit/page.tsx` as a mobile guided flow:

1. Card details.
2. Image upload.
3. Optional fields.
4. Payment proof notice when needed.
5. Review and submit.

- [ ] **Step 6: Add submission route handler**

Create `web/src/app/api/activities/[activityId]/submissions/route.ts` with this sequence:

1. `const user = await requireUser()`.
2. Load activity with groups and settings.
3. Reject with HTTP 404 if activity does not exist.
4. Reject with HTTP 403 if `new Date()` is before `submissionStartAt` or after `submissionDeadlineAt`.
5. Reject with HTTP 409 if `countParticipantSubmissions` is already at `perParticipantSubmissionLimit`.
6. Parse form fields with `submissionInputSchema`.
7. Validate group is present when the activity has groups.
8. Validate file count is at least 1 and no higher than `maxImagesPerSubmission`.
9. Validate every image with `validateImageFile`.
10. Create submission with review status `pending` when review is required, otherwise `not_required`.
11. Create payment status `pending` when payment is required, otherwise `not_required`.
12. Save files through `localFileStorage`.
13. Create `SubmissionImage` rows.
14. Redirect to `/account/submissions`.

- [ ] **Step 7: Verify**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/files web/src/lib/validation/submission.ts web/src/lib/db/submission-repository.ts web/src/app
git commit -m "feat: add participant submissions"
```

---

### Task 9: Admin Review And Payment Proof

**Files:**
- Create: `web/src/lib/db/review-repository.ts`
- Create: `web/src/lib/db/payment-repository.ts`
- Create: `web/src/app/admin/submissions/page.tsx`
- Create: `web/src/app/admin/payments/page.tsx`
- Create: `web/src/app/api/admin/submissions/[submissionId]/review/route.ts`
- Create: `web/src/app/api/admin/payments/[paymentProofId]/review/route.ts`
- Create: `web/src/app/api/activities/[activityId]/payment-proof/route.ts`

- [ ] **Step 1: Add review repository**

Create `web/src/lib/db/review-repository.ts`:

```ts
import { prisma } from "./prisma";

export async function approveSubmission(submissionId: string, adminId: string) {
  return prisma.$transaction([
    prisma.submission.update({
      where: { id: submissionId },
      data: { reviewStatus: "approved", rejectionReason: null },
    }),
    prisma.reviewDecision.create({
      data: { submissionId, adminId, decision: "approved" },
    }),
  ]);
}

export async function rejectSubmission(submissionId: string, adminId: string, reason: string) {
  return prisma.$transaction([
    prisma.submission.update({
      where: { id: submissionId },
      data: { reviewStatus: "rejected", rejectionReason: reason },
    }),
    prisma.reviewDecision.create({
      data: { submissionId, adminId, decision: "rejected", reason },
    }),
  ]);
}
```

- [ ] **Step 2: Add payment repository**

Create `web/src/lib/db/payment-repository.ts`:

```ts
import { prisma } from "./prisma";

export async function createPaymentProof(input: {
  activityId: string;
  participantId: string;
  submissionId?: string;
  storageProvider: string;
  storageFileId: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}) {
  return prisma.paymentProof.create({ data: { ...input, status: "pending" } });
}

export async function confirmPaymentProof(paymentProofId: string) {
  const proof = await prisma.paymentProof.update({
    where: { id: paymentProofId },
    data: { status: "confirmed", reviewedAt: new Date() },
  });

  if (proof.submissionId) {
    await prisma.submission.update({
      where: { id: proof.submissionId },
      data: { paymentStatus: "confirmed" },
    });
  }

  return proof;
}

export async function rejectPaymentProof(paymentProofId: string) {
  return prisma.paymentProof.update({
    where: { id: paymentProofId },
    data: { status: "rejected", reviewedAt: new Date() },
  });
}
```

- [ ] **Step 3: Add participant payment proof route**

Route accepts one image file, validates JPG/PNG/WebP and 10MB, saves via file storage, and creates `PaymentProof` with `pending` status.

- [ ] **Step 4: Add admin mobile review queues**

Create admin pages using mobile card lists:

- Pending submission review queue.
- Pending payment proof queue.
- Action buttons for approve, reject, confirm payment, and reject payment.

- [ ] **Step 5: Verify**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/db/review-repository.ts web/src/lib/db/payment-repository.ts web/src/app/admin web/src/app/api
git commit -m "feat: add review and payment proof workflows"
```

---

### Task 10: Judge Invitations And Scoring

**Files:**
- Create: `web/src/lib/db/judge-repository.ts`
- Create: `web/src/lib/validation/scoring.ts`
- Create: `web/src/app/admin/activities/[activityId]/judges/page.tsx`
- Create: `web/src/app/judge/invite/[token]/page.tsx`
- Create: `web/src/app/judge/page.tsx`
- Create: `web/src/app/judge/activities/[activityId]/submissions/[submissionId]/page.tsx`
- Create: `web/src/app/api/admin/activities/[activityId]/judge-invitations/route.ts`
- Create: `web/src/app/api/judge/invitations/[token]/accept/route.ts`
- Create: `web/src/app/api/judge/submissions/[submissionId]/scores/route.ts`

- [ ] **Step 1: Add scoring validation**

Create `web/src/lib/validation/scoring.ts`:

```ts
import { z } from "zod";

export const criterionScoreSchema = z.object({
  criterionId: z.string().min(1),
  value: z.number().min(0).max(10).refine((value) => Math.round(value * 2) === value * 2, {
    message: "Score must use 0.5 increments",
  }),
});

export const judgeScoreSubmissionSchema = z.object({
  scores: z.array(criterionScoreSchema).min(1),
  comment: z.string().max(2000).optional(),
});
```

- [ ] **Step 2: Add judge repository**

Create `web/src/lib/db/judge-repository.ts` with these exported functions:

```ts
export async function createJudgeInvitation(input: { activityId: string; email?: string; expiresAt: Date }): Promise<{ rawToken: string; invitationId: string }>;
export async function acceptJudgeInvitation(input: { rawToken: string; userId: string }): Promise<{ activityId: string }>;
export async function listJudgeEligibleSubmissions(input: { activityId: string; judgeId: string }): Promise<Array<{ id: string; cardName: string }>>;
export async function upsertJudgeScores(input: { judgeId: string; submissionId: string; scores: Array<{ criterionId: string; value: number }>; comment?: string }): Promise<void>;
export async function countCompletedJudgeSubmissionPairs(activityId: string): Promise<number>;
```

Implementation rules:

- Store a SHA-256 hash of invitation tokens in `JudgeInvitation.tokenHash`.
- Never store the raw token.
- `acceptJudgeInvitation` rejects expired invitations.
- `upsertJudgeScores` uses Prisma upserts for each `(judgeId, submissionId, criterionId)` score.
- `upsertJudgeScores` upserts one optional `JudgeComment` per `(judgeId, submissionId)`.

- [ ] **Step 3: Add admin judge invitation UI**

Admin page creates invitation links and shows accepted judge count for the activity.

- [ ] **Step 4: Add judge accept flow**

Invitation page explains the activity and sends logged-in judges to accept. If not logged in, it sends them to register/login with a return URL to the invitation.

- [ ] **Step 5: Add mobile judge scoring UI**

Scoring page shows:

- Card images with a larger viewer.
- Criteria controls supporting 0.5 increments.
- Optional overall comment.
- Sticky save state.
- Previous and next card navigation.

- [ ] **Step 6: Verify**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/db/judge-repository.ts web/src/lib/validation/scoring.ts web/src/app/admin web/src/app/judge web/src/app/api
git commit -m "feat: add judge invitation and scoring"
```

---

### Task 11: Results, Publishing, And CSV Export

**Files:**
- Create: `web/src/lib/db/result-repository.ts`
- Create: `web/src/lib/domain/result-export.ts`
- Create: `web/src/lib/domain/result-export.test.ts`
- Create: `web/src/app/admin/activities/[activityId]/results/page.tsx`
- Create: `web/src/app/api/admin/activities/[activityId]/results/publish/route.ts`
- Create: `web/src/app/api/admin/activities/[activityId]/results/export/route.ts`
- Create: `web/src/app/(public)/activities/[slug]/results/page.tsx`
- Create: `web/src/app/account/results/page.tsx`

- [ ] **Step 1: Write export test**

Create `web/src/lib/domain/result-export.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildResultsCsvRows } from "./result-export";

describe("buildResultsCsvRows", () => {
  it("creates stable export rows", () => {
    expect(
      buildResultsCsvRows([
        {
          activityTitle: "Summer Cards",
          mode: "competition",
          groupName: "Open",
          participantDisplayName: "Aki",
          cardName: "Blue Dragon",
          status: "completed",
          paymentStatus: "confirmed",
          finalScore: 8.5,
          criterionAverages: [{ name: "Creativity", average: 9 }],
          driveLinks: ["https://drive.example/file-a"],
        },
      ]),
    ).toEqual([
      {
        activity: "Summer Cards",
        mode: "competition",
        group: "Open",
        participant: "Aki",
        card: "Blue Dragon",
        status: "completed",
        paymentStatus: "confirmed",
        finalScore: "8.5",
        criterionAverages: "Creativity: 9",
        driveLinks: "https://drive.example/file-a",
      },
    ]);
  });
});
```

- [ ] **Step 2: Implement export rows**

Create `web/src/lib/domain/result-export.ts`:

```ts
export type ResultExportInput = {
  activityTitle: string;
  mode: string;
  groupName: string;
  participantDisplayName: string;
  cardName: string;
  status: string;
  paymentStatus: string;
  finalScore: number;
  criterionAverages: Array<{ name: string; average: number }>;
  driveLinks: string[];
};

export function buildResultsCsvRows(results: ResultExportInput[]) {
  return results.map((result) => ({
    activity: result.activityTitle,
    mode: result.mode,
    group: result.groupName,
    participant: result.participantDisplayName,
    card: result.cardName,
    status: result.status,
    paymentStatus: result.paymentStatus,
    finalScore: String(result.finalScore),
    criterionAverages: result.criterionAverages.map((item) => `${item.name}: ${item.average}`).join("; "),
    driveLinks: result.driveLinks.join("; "),
  }));
}
```

- [ ] **Step 3: Add result repository**

Create `web/src/lib/db/result-repository.ts` with these exported functions:

```ts
export async function buildDraftResults(activityId: string): Promise<void>;
export async function getResultReview(activityId: string): Promise<{
  activityId: string;
  missingJudgeSubmissionPairs: number;
  canPublish: boolean;
  rows: Array<{ submissionId: string; cardName: string; finalScore: number; rank: number | null }>;
}>;
export async function publishResults(activityId: string): Promise<void>;
export async function getParticipantResults(participantId: string): Promise<Array<{ submissionId: string; finalScore: number }>>;
```

Implementation rules:

- `buildDraftResults` reads all scores for eligible submissions, calls `calculateFinalScore`, writes `ResultSnapshot`, then applies `rankCompetitionResults` for competition activities.
- `getResultReview` calls `canPublishResults` and returns missing score counts for the admin page.
- `publishResults` throws `Cannot publish results until every eligible submission has all judge scores` when `canPublish` is false.
- `publishResults` sets `Activity.resultsPublishedAt` and `ResultSnapshot.publishedAt` in one transaction.

- [ ] **Step 4: Add admin result review and publish page**

Page shows draft scores, group ranking preview, missing score count, and a clear publish confirmation. Publish button is disabled until every eligible submission has all required judge score sets.

- [ ] **Step 5: Add public and private result pages**

Public competition result page shows ranking by group after publish. Participant result page shows own final score, per-criterion averages, own card images, and anonymous judge comments after publish.

- [ ] **Step 6: Add CSV export route**

Route requires admin role, builds rows with `buildResultsCsvRows`, serializes with `csv-stringify/sync`, and returns `text/csv`.

- [ ] **Step 7: Verify**

Run:

```bash
cd web
npm test -- src/lib/domain/result-export.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/db/result-repository.ts web/src/lib/domain/result-export.ts web/src/lib/domain/result-export.test.ts web/src/app
git commit -m "feat: add result publishing and exports"
```

---

### Task 12: Email Notifications

**Files:**
- Create: `web/src/lib/email/email-service.ts`
- Create: `web/src/lib/email/console-email-service.ts`
- Create: `web/src/lib/email/smtp-email-service.ts`
- Create: `web/src/lib/email/messages.ts`
- Modify: auth, invitation, submission, review, and result routes from earlier tasks

- [ ] **Step 1: Create email service interface**

Create `web/src/lib/email/email-service.ts`:

```ts
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailService = {
  send(message: EmailMessage): Promise<void>;
};
```

- [ ] **Step 2: Add console email service**

Create `web/src/lib/email/console-email-service.ts`:

```ts
import type { EmailService } from "./email-service";

export const consoleEmailService: EmailService = {
  async send(message) {
    console.log("[email]", JSON.stringify(message, null, 2));
  },
};
```

- [ ] **Step 3: Add SMTP email service**

Create `web/src/lib/email/smtp-email-service.ts`:

```ts
import nodemailer from "nodemailer";
import type { EmailService } from "./email-service";

export const smtpEmailService: EmailService = {
  async send(message) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? "587"),
      secure: false,
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  },
};
```

- [ ] **Step 4: Add message builders**

Create `web/src/lib/email/messages.ts`:

```ts
import type { EmailMessage } from "./email-service";

export function registrationVerificationEmail(input: { to: string; verifyUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: "Verify your Card Grading account",
    text: `Verify your account by opening this link:\n\n${input.verifyUrl}`,
  };
}

export function judgeInvitationEmail(input: { to: string; activityTitle: string; inviteUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Judge invitation: ${input.activityTitle}`,
    text: `You have been invited to judge ${input.activityTitle}.\n\nOpen this link: ${input.inviteUrl}`,
  };
}

export function submissionReceivedEmail(input: { to: string; cardName: string; activityTitle: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Submission received: ${input.cardName}`,
    text: `Your card "${input.cardName}" was submitted to ${input.activityTitle}.`,
  };
}

export function submissionRejectedEmail(input: { to: string; cardName: string; reason: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Submission needs changes: ${input.cardName}`,
    text: `Your submission was rejected for this reason:\n\n${input.reason}`,
  };
}

export function resultsAvailableEmail(input: { to: string; activityTitle: string; resultUrl: string }): EmailMessage {
  return {
    to: input.to,
    subject: `Results available: ${input.activityTitle}`,
    text: `Results for ${input.activityTitle} are available here:\n\n${input.resultUrl}`,
  };
}
```

- [ ] **Step 5: Wire notifications into route handlers**

Send emails from the relevant route handlers after database writes succeed:

- Registration route sends `registrationVerificationEmail`.
- Judge invitation route sends `judgeInvitationEmail`.
- Submission route sends `submissionReceivedEmail`.
- Rejection route sends `submissionRejectedEmail`.
- Result publish route sends `resultsAvailableEmail`.

Use console service when `EMAIL_PROVIDER=console`, and SMTP service when `EMAIL_PROVIDER=smtp`.

- [ ] **Step 6: Verify**

Run:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/email web/src/app
git commit -m "feat: add email notifications"
```

---

### Task 13: Google Drive File Storage Adapter

**Files:**
- Create: `web/src/lib/files/google-drive-storage.ts`
- Create: `web/src/lib/files/storage-provider.ts`
- Modify: submission and payment proof route handlers to use `getFileStorage()`
- Modify: `web/.env.example`

- [ ] **Step 1: Add storage provider selector**

Create `web/src/lib/files/storage-provider.ts`:

```ts
import type { FileStorage } from "./file-storage";
import { localFileStorage } from "./local-file-storage";
import { googleDriveStorage } from "./google-drive-storage";

export function getFileStorage(): FileStorage {
  if (process.env.FILE_STORAGE_PROVIDER === "google_drive") {
    return googleDriveStorage;
  }
  return localFileStorage;
}
```

- [ ] **Step 2: Implement Google Drive adapter**

Create `web/src/lib/files/google-drive-storage.ts` with this structure:

```ts
import { Readable } from "node:stream";
import { google } from "googleapis";
import type { FileStorage, StoredFile } from "./file-storage";

function getDriveClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive credentials are missing");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id,name)",
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error("Google Drive folder creation failed");
  return created.data.id;
}

async function uploadToDrive(folderId: string, file: File): Promise<StoredFile> {
  const drive = getDriveClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await drive.files.create({
    requestBody: { name: file.name, parents: [folderId] },
    media: { mimeType: file.type, body: Readable.from(buffer) },
    fields: "id,webViewLink",
  });

  if (!created.data.id) throw new Error("Google Drive upload failed");

  return {
    provider: "google_drive",
    fileId: created.data.id,
    publicUrl: created.data.webViewLink ?? `https://drive.google.com/file/d/${created.data.id}/view`,
    originalName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

export const googleDriveStorage: FileStorage = {
  async saveSubmissionImage({ activitySlug, submissionId, file }) {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is missing");
    const activityFolderId = await ensureFolder(activitySlug, rootFolderId);
    const submissionFolderId = await ensureFolder(submissionId, activityFolderId);
    return uploadToDrive(submissionFolderId, file);
  },
  async savePaymentProof({ activitySlug, ownerId, file }) {
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is missing");
    const activityFolderId = await ensureFolder(activitySlug, rootFolderId);
    const proofFolderId = await ensureFolder(`payment-${ownerId}`, activityFolderId);
    return uploadToDrive(proofFolderId, file);
  },
};
```

- [ ] **Step 3: Swap route handlers to storage selector**

Update submission and payment proof route handlers so they call `getFileStorage()` instead of importing `localFileStorage` directly.

- [ ] **Step 4: Verify without Google credentials**

Run with `FILE_STORAGE_PROVIDER=local`:

```bash
cd web
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 5: Manual Google Drive verification**

Set `FILE_STORAGE_PROVIDER=google_drive` and valid Google Drive environment variables. Submit one card image through the website. Confirm the file appears under:

```text
Platform Drive Root
+-- Activity Folder
    +-- Card Submission Folder
        +-- submitted image
```

Expected: database row stores provider `google_drive`, a Drive file ID, and a Drive link.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/files web/src/app web/.env.example
git commit -m "feat: add google drive storage adapter"
```

---

### Task 14: Mobile E2E Verification

**Files:**
- Create: `web/e2e/mobile-participant.spec.ts`
- Create: `web/e2e/mobile-judge.spec.ts`
- Create: `web/e2e/mobile-admin.spec.ts`
- Modify: app pages that fail viewport or touch checks

- [ ] **Step 1: Add participant mobile E2E**

Create `web/e2e/mobile-participant.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("participant can view activity detail on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/activities");
  await expect(page.locator("body")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 2: Add judge mobile E2E**

Create `web/e2e/mobile-judge.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("judge dashboard is usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/judge");
  await expect(page.locator("body")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 3: Add admin mobile E2E**

Create `web/e2e/mobile-admin.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin dashboard is usable on mobile without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(page.locator("body")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
```

- [ ] **Step 4: Run mobile E2E**

Run:

```bash
cd web
npm run e2e -- --project="Mobile Chrome"
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
cd web
npm run typecheck
npm test
npm run e2e -- --project="Mobile Chrome"
```

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```bash
git add web/e2e web/src
git commit -m "test: add mobile end-to-end coverage"
```

---

### Task 15: Final MVP Review

**Files:**
- Modify: `docs/superpowers/specs/2026-06-06-card-grading-platform-design.md` only if behavior intentionally differs from the approved design.
- Create: `web/README.md`

- [ ] **Step 1: Add app README**

Create `web/README.md` with setup commands:

````md
# Card Grading Web App

## Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Default local admin:

- Email: `admin@example.com`
- Password: `change-this-password`

Use a stronger password before any shared deployment.

## Verification

```bash
npm run typecheck
npm test
npm run e2e -- --project="Mobile Chrome"
```
````

- [ ] **Step 2: Run final verification**

Run:

```bash
cd web
npm run typecheck
npm test
npm run e2e -- --project="Mobile Chrome"
```

Expected: all commands PASS.

- [ ] **Step 3: Start local dev server**

Run:

```bash
cd web
npm run dev
```

Expected: app is available at `http://127.0.0.1:3000`.

- [ ] **Step 4: Commit README**

```bash
git add web/README.md
git commit -m "docs: add web app setup guide"
```
