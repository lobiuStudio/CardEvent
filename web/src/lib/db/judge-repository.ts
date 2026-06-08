import { createHash, randomBytes } from "crypto";
import { getSubmissionJudgingEligibility, type PaymentStatus, type ReviewStatus } from "@/lib/domain/workflow";
import { prisma } from "./prisma";

export type JudgeRepositoryDeps = {
  generateToken?: () => string;
  now?: () => Date;
  store?: unknown;
};

export class JudgeInvitationNotFoundError extends Error {
  constructor() {
    super("Judge invitation was not found.");
    this.name = "JudgeInvitationNotFoundError";
  }
}

export class JudgeInvitationExpiredError extends Error {
  constructor() {
    super("Judge invitation has expired.");
    this.name = "JudgeInvitationExpiredError";
  }
}

export class JudgeInvitationAlreadyAcceptedError extends Error {
  constructor() {
    super("Judge invitation has already been accepted.");
    this.name = "JudgeInvitationAlreadyAcceptedError";
  }
}

export class JudgeSubmissionNotFoundError extends Error {
  constructor() {
    super("Submission was not found.");
    this.name = "JudgeSubmissionNotFoundError";
  }
}

export class JudgeMembershipRequiredError extends Error {
  constructor() {
    super("Judge is not assigned to this activity.");
    this.name = "JudgeMembershipRequiredError";
  }
}

export class JudgeScoreCriteriaMismatchError extends Error {
  constructor() {
    super("Scores must match criteria from the submission activity.");
    this.name = "JudgeScoreCriteriaMismatchError";
  }
}

function getStore(deps: JudgeRepositoryDeps = {}): typeof prisma {
  return (deps.store ?? prisma) as typeof prisma;
}

function getNow(deps: JudgeRepositoryDeps = {}): Date {
  return deps.now?.() ?? new Date();
}

function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashJudgeInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toReviewStatus(value: string): ReviewStatus {
  if (value === "not_required" || value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }

  return "pending";
}

function toPaymentStatus(value: string): PaymentStatus {
  if (value === "not_required" || value === "pending" || value === "confirmed" || value === "rejected") {
    return value;
  }

  return "pending";
}

export async function createJudgeInvitation(
  input: { activityId: string; email?: string; expiresAt: Date },
  deps: JudgeRepositoryDeps = {},
): Promise<{ rawToken: string; invitationId: string }> {
  const store = getStore(deps);
  const rawToken = deps.generateToken?.() ?? generateInvitationToken();
  const invitation = await store.judgeInvitation.create({
    data: {
      activityId: input.activityId,
      email: input.email?.trim().toLowerCase() || undefined,
      expiresAt: input.expiresAt,
      rawToken,
      tokenHash: hashJudgeInvitationToken(rawToken),
    },
    select: {
      id: true,
    },
  });

  return {
    rawToken,
    invitationId: invitation.id,
  };
}

export async function acceptJudgeInvitation(
  input: { rawToken: string; userId: string },
  deps: JudgeRepositoryDeps = {},
): Promise<{ activityId: string }> {
  const store = getStore(deps);
  const now = getNow(deps);
  const tokenHash = hashJudgeInvitationToken(input.rawToken);
  const invitation = await store.judgeInvitation.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      activityId: true,
      acceptedAt: true,
      expiresAt: true,
    },
  });

  if (!invitation) {
    throw new JudgeInvitationNotFoundError();
  }

  if (invitation.expiresAt <= now) {
    throw new JudgeInvitationExpiredError();
  }

  if (invitation.acceptedAt) {
    throw new JudgeInvitationAlreadyAcceptedError();
  }

  const claimed = await store.judgeInvitation.updateMany({
    where: {
      id: invitation.id,
      acceptedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    data: {
      acceptedAt: now,
    },
  });

  if (claimed.count !== 1) {
    throw new JudgeInvitationAlreadyAcceptedError();
  }

  await store.judgeMembership.upsert({
    where: {
      activityId_userId: {
        activityId: invitation.activityId,
        userId: input.userId,
      },
    },
    create: {
      activityId: invitation.activityId,
      userId: input.userId,
    },
    update: {},
  });

  await store.userRole.upsert({
    where: {
      userId_role: {
        userId: input.userId,
        role: "judge",
      },
    },
    create: {
      userId: input.userId,
      role: "judge",
    },
    update: {},
  });

  return {
    activityId: invitation.activityId,
  };
}

export async function listJudgeEligibleSubmissions(
  input: { activityId: string; judgeId: string },
  deps: JudgeRepositoryDeps = {},
): Promise<Array<{ id: string; cardName: string }>> {
  const store = getStore(deps);
  const membership = await store.judgeMembership.findUnique({
    where: {
      activityId_userId: {
        activityId: input.activityId,
        userId: input.judgeId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return [];
  }

  const submissions = await store.submission.findMany({
    where: {
      activityId: input.activityId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      cardName: true,
      deletedAt: true,
      reviewStatus: true,
      paymentStatus: true,
      activity: {
        select: {
          reviewRequired: true,
          paymentRequired: true,
        },
      },
    },
  });

  return submissions
    .filter((submission) =>
      getSubmissionJudgingEligibility({
        deletedAt: submission.deletedAt,
        reviewRequired: submission.activity.reviewRequired,
        reviewStatus: toReviewStatus(submission.reviewStatus),
        paymentRequired: submission.activity.paymentRequired,
        paymentStatus: toPaymentStatus(submission.paymentStatus),
      }).eligible,
    )
    .map((submission) => ({
      id: submission.id,
      cardName: submission.cardName,
    }));
}

export async function upsertJudgeScores(
  input: {
    judgeId: string;
    submissionId: string;
    scores: Array<{ criterionId: string; value: number }>;
    comment?: string;
  },
  deps: JudgeRepositoryDeps = {},
): Promise<void> {
  const store = getStore(deps);
  const submission = await store.submission.findUnique({
    where: {
      id: input.submissionId,
    },
    select: {
      id: true,
      activityId: true,
    },
  });

  if (!submission) {
    throw new JudgeSubmissionNotFoundError();
  }

  const membership = await store.judgeMembership.findUnique({
    where: {
      activityId_userId: {
        activityId: submission.activityId,
        userId: input.judgeId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw new JudgeMembershipRequiredError();
  }

  const criteria = await store.gradingCriterion.findMany({
    where: {
      activityId: submission.activityId,
    },
    select: {
      id: true,
    },
  });
  const validCriterionIds = new Set(criteria.map((criterion) => criterion.id));
  const seenCriterionIds = new Set<string>();

  for (const score of input.scores) {
    if (!validCriterionIds.has(score.criterionId) || seenCriterionIds.has(score.criterionId)) {
      throw new JudgeScoreCriteriaMismatchError();
    }

    seenCriterionIds.add(score.criterionId);
  }

  for (const score of input.scores) {
    await store.score.upsert({
      where: {
        judgeId_submissionId_criterionId: {
          judgeId: input.judgeId,
          submissionId: submission.id,
          criterionId: score.criterionId,
        },
      },
      create: {
        activityId: submission.activityId,
        judgeId: input.judgeId,
        submissionId: submission.id,
        criterionId: score.criterionId,
        value: score.value,
      },
      update: {
        value: score.value,
      },
    });
  }

  if (typeof input.comment === "string") {
    await store.judgeComment.upsert({
      where: {
        judgeId_submissionId: {
          judgeId: input.judgeId,
          submissionId: submission.id,
        },
      },
      create: {
        judgeId: input.judgeId,
        submissionId: submission.id,
        comment: input.comment,
      },
      update: {
        comment: input.comment,
      },
    });
  }
}

export async function countCompletedJudgeSubmissionPairs(
  activityId: string,
  deps: JudgeRepositoryDeps = {},
): Promise<number> {
  const store = getStore(deps);
  const [criteria, memberships, submissions] = await Promise.all([
    store.gradingCriterion.findMany({
      where: {
        activityId,
      },
      select: {
        id: true,
      },
    }),
    store.judgeMembership.findMany({
      where: {
        activityId,
      },
      select: {
        userId: true,
      },
    }),
    store.submission.findMany({
      where: {
        activityId,
        deletedAt: null,
      },
      select: {
        id: true,
        deletedAt: true,
        reviewStatus: true,
        paymentStatus: true,
        activity: {
          select: {
            reviewRequired: true,
            paymentRequired: true,
          },
        },
      },
    }),
  ]);
  const criterionIds = new Set(criteria.map((criterion) => criterion.id));
  const judgeIds = new Set(memberships.map((membership) => membership.userId));
  const eligibleSubmissionIds = new Set(
    submissions
      .filter((submission) =>
        getSubmissionJudgingEligibility({
          deletedAt: submission.deletedAt,
          reviewRequired: submission.activity.reviewRequired,
          reviewStatus: toReviewStatus(submission.reviewStatus),
          paymentRequired: submission.activity.paymentRequired,
          paymentStatus: toPaymentStatus(submission.paymentStatus),
        }).eligible,
      )
      .map((submission) => submission.id),
  );

  if (criterionIds.size === 0 || judgeIds.size === 0 || eligibleSubmissionIds.size === 0) {
    return 0;
  }

  const scores = await store.score.findMany({
    where: {
      activityId,
      judgeId: {
        in: [...judgeIds],
      },
      submissionId: {
        in: [...eligibleSubmissionIds],
      },
    },
    select: {
      criterionId: true,
      judgeId: true,
      submissionId: true,
    },
  });
  const completedCriteriaByPair = new Map<string, Set<string>>();

  for (const score of scores) {
    if (!criterionIds.has(score.criterionId)) {
      continue;
    }

    const key = JSON.stringify([score.judgeId, score.submissionId]);
    completedCriteriaByPair.set(key, completedCriteriaByPair.get(key)?.add(score.criterionId) ?? new Set([score.criterionId]));
  }

  let completedPairs = 0;

  for (const judgeId of judgeIds) {
    for (const submissionId of eligibleSubmissionIds) {
      const key = JSON.stringify([judgeId, submissionId]);
      if (completedCriteriaByPair.get(key)?.size === criterionIds.size) {
        completedPairs += 1;
      }
    }
  }

  return completedPairs;
}
