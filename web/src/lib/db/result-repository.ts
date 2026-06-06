import { calculateFinalScore, rankCompetitionResults } from "@/lib/domain/scoring";
import { canPublishResults, getSubmissionJudgingEligibility, type PaymentStatus, type ReviewStatus } from "@/lib/domain/workflow";
import { countCompletedJudgeSubmissionPairs } from "./judge-repository";
import { prisma } from "./prisma";

export class ResultsNotPublishableError extends Error {
  constructor() {
    super("Cannot publish results until every eligible submission has all judge scores");
    this.name = "ResultsNotPublishableError";
  }
}

type CriterionAverageSnapshot = {
  criterionId: string;
  average: number;
};

export type NamedCriterionAverage = CriterionAverageSnapshot & {
  name: string;
};

export type ResultReviewRow = {
  submissionId: string;
  cardName: string;
  groupName: string;
  participantDisplayName: string;
  finalScore: number;
  rank: number | null;
};

export type PublicResultRow = {
  submissionId: string;
  cardName: string;
  authorDisplayName: string;
  finalScore: number;
  rank: number | null;
  imageUrl: string | null;
};

export type PublicResultGroup = {
  id: string;
  name: string;
  rows: PublicResultRow[];
};

export type PublicActivityResults = {
  activityId: string;
  slug: string;
  title: string;
  mode: string;
  resultsPublishedAt: Date;
  groups: PublicResultGroup[];
};

export type ParticipantResult = {
  submissionId: string;
  cardName: string;
  activityTitle: string;
  activitySlug: string;
  activityMode: string;
  groupName: string;
  finalScore: number;
  rank: number | null;
  publishedAt: Date;
  criterionAverages: NamedCriterionAverage[];
  images: Array<{ id: string; publicUrl: string; originalName: string }>;
  judgeComments: Array<{ id: string; comment: string; createdAt: Date }>;
};

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

function parseCriterionAverages(value: string): CriterionAverageSnapshot[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapCriterionAverages(
  value: string,
  criteria: Array<{ id: string; name: string }>,
): NamedCriterionAverage[] {
  const criterionNameById = new Map(criteria.map((criterion) => [criterion.id, criterion.name]));

  return parseCriterionAverages(value).map((item) => ({
    criterionId: item.criterionId,
    name: criterionNameById.get(item.criterionId) ?? item.criterionId,
    average: item.average,
  }));
}

function compareResultRows(a: { groupName: string; rank: number | null; finalScore: number; cardName: string }, b: typeof a): number {
  if (a.groupName !== b.groupName) {
    return a.groupName.localeCompare(b.groupName);
  }

  if (a.rank !== b.rank) {
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  }

  if (a.finalScore !== b.finalScore) {
    return b.finalScore - a.finalScore;
  }

  return a.cardName.localeCompare(b.cardName);
}

export async function buildDraftResults(activityId: string): Promise<void> {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    include: {
      criteria: true,
      judgeMemberships: true,
      submissions: {
        include: {
          scores: true,
        },
      },
    },
  });

  if (!activity) {
    return;
  }

  const requiredScoreCount = activity.criteria.length * activity.judgeMemberships.length;
  const completedSnapshotInputs = activity.submissions
    .filter((submission) =>
      getSubmissionJudgingEligibility({
        deletedAt: submission.deletedAt,
        reviewRequired: activity.reviewRequired,
        reviewStatus: toReviewStatus(submission.reviewStatus),
        paymentRequired: activity.paymentRequired,
        paymentStatus: toPaymentStatus(submission.paymentStatus),
      }).eligible,
    )
    .filter((submission) => requiredScoreCount > 0 && submission.scores.length >= requiredScoreCount)
    .map((submission) => {
      const finalScore = calculateFinalScore(
        submission.scores.map((score) => ({
          judgeId: score.judgeId,
          criterionId: score.criterionId,
          score: score.value,
        })),
      );

      return {
        submission,
        finalScore,
      };
    });
  const completedSubmissionIds = completedSnapshotInputs.map(({ submission }) => submission.id);

  await prisma.$transaction(async (tx) => {
    await tx.resultSnapshot.deleteMany({
      where: {
        publishedAt: null,
        submission: {
          activityId,
          id: {
            notIn: completedSubmissionIds,
          },
        },
      },
    });

    await Promise.all(
      completedSnapshotInputs.map(({ finalScore, submission }) =>
        tx.resultSnapshot.upsert({
          where: {
            submissionId: submission.id,
          },
          create: {
            submissionId: submission.id,
            finalScore: finalScore.finalScore,
            rawAverage: finalScore.rawAverage,
            rank: null,
            criterionAveragesJson: JSON.stringify(finalScore.criterionAverages),
          },
          update: {
            finalScore: finalScore.finalScore,
            rawAverage: finalScore.rawAverage,
            criterionAveragesJson: JSON.stringify(finalScore.criterionAverages),
          },
        }),
      ),
    );

    if (activity.mode === "competition") {
      const rankedResults = rankCompetitionResults(
        completedSnapshotInputs.map(({ finalScore, submission }) => ({
          submissionId: submission.id,
          groupId: submission.groupId ?? "ungrouped",
          finalScore: finalScore.finalScore,
        })),
      );

      await Promise.all(
        rankedResults.map((result) =>
          tx.resultSnapshot.update({
            where: {
              submissionId: result.submissionId,
            },
            data: {
              rank: result.rank,
            },
          }),
        ),
      );
    } else {
      await tx.resultSnapshot.updateMany({
        where: {
          submissionId: {
            in: completedSubmissionIds,
          },
        },
        data: {
          rank: null,
        },
      });
    }
  });
}

export async function getResultReview(activityId: string): Promise<{
  activityId: string;
  missingJudgeSubmissionPairs: number;
  canPublish: boolean;
  rows: ResultReviewRow[];
}> {
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    include: {
      submissions: {
        include: {
          group: true,
          participant: {
            select: {
              displayName: true,
            },
          },
          resultSnapshot: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      judgeMemberships: true,
    },
  });

  if (!activity) {
    return {
      activityId,
      missingJudgeSubmissionPairs: 0,
      canPublish: false,
      rows: [],
    };
  }

  const eligibleSubmissions = activity.submissions.filter((submission) =>
    getSubmissionJudgingEligibility({
      deletedAt: submission.deletedAt,
      reviewRequired: activity.reviewRequired,
      reviewStatus: toReviewStatus(submission.reviewStatus),
      paymentRequired: activity.paymentRequired,
      paymentStatus: toPaymentStatus(submission.paymentStatus),
    }).eligible,
  );
  const completedJudgeSubmissionPairs = await countCompletedJudgeSubmissionPairs(activityId);
  const publishState = canPublishResults({
    eligibleSubmissionCount: eligibleSubmissions.length,
    judgeCount: activity.judgeMemberships.length,
    completedJudgeSubmissionPairs,
  });

  return {
    activityId,
    missingJudgeSubmissionPairs: publishState.missingJudgeSubmissionPairs,
    canPublish: publishState.canPublish,
    rows: activity.submissions
      .filter((submission) => submission.resultSnapshot)
      .map((submission) => ({
        submissionId: submission.id,
        cardName: submission.cardName,
        groupName: submission.group?.name ?? "Ungrouped",
        participantDisplayName: submission.participant.displayName,
        finalScore: submission.resultSnapshot?.finalScore ?? 0,
        rank: submission.resultSnapshot?.rank ?? null,
      }))
      .sort(compareResultRows),
  };
}

export async function publishResults(activityId: string): Promise<void> {
  await buildDraftResults(activityId);
  const review = await getResultReview(activityId);

  if (!review.canPublish) {
    throw new ResultsNotPublishableError();
  }

  const publishedAt = new Date();

  await prisma.$transaction([
    prisma.activity.update({
      where: {
        id: activityId,
      },
      data: {
        resultsPublishedAt: publishedAt,
      },
    }),
    prisma.resultSnapshot.updateMany({
      where: {
        submission: {
          activityId,
        },
      },
      data: {
        publishedAt,
      },
    }),
  ]);
}

export async function getPublishedCompetitionResultsBySlug(slug: string): Promise<PublicActivityResults | null> {
  const activity = await prisma.activity.findUnique({
    where: {
      slug,
    },
    include: {
      groups: {
        orderBy: {
          displayOrder: "asc",
        },
      },
      submissions: {
        where: {
          deletedAt: null,
          resultSnapshot: {
            is: {
              publishedAt: {
                not: null,
              },
            },
          },
        },
        include: {
          group: true,
          images: {
            where: {
              active: true,
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          resultSnapshot: true,
        },
      },
    },
  });

  if (!activity?.resultsPublishedAt || activity.mode !== "competition") {
    return null;
  }

  const groups = new Map<string, PublicResultGroup>(
    activity.groups.map((group) => [
      group.id,
      {
        id: group.id,
        name: group.name,
        rows: [],
      },
    ]),
  );
  const ungrouped: PublicResultGroup = { id: "ungrouped", name: "Ungrouped", rows: [] };

  for (const submission of activity.submissions) {
    if (!submission.resultSnapshot) {
      continue;
    }

    const group = submission.groupId ? groups.get(submission.groupId) ?? ungrouped : ungrouped;
    group.rows.push({
      submissionId: submission.id,
      cardName: submission.cardName,
      authorDisplayName: submission.authorDisplayName ?? "Anonymous participant",
      finalScore: submission.resultSnapshot.finalScore,
      rank: submission.resultSnapshot.rank,
      imageUrl: submission.images[0]?.publicUrl ?? null,
    });
  }

  for (const group of [...groups.values(), ungrouped]) {
    group.rows.sort((a, b) => {
      if (a.rank !== b.rank) {
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      }

      if (a.finalScore !== b.finalScore) {
        return b.finalScore - a.finalScore;
      }

      return a.cardName.localeCompare(b.cardName);
    });
  }

  return {
    activityId: activity.id,
    slug: activity.slug,
    title: activity.title,
    mode: activity.mode,
    resultsPublishedAt: activity.resultsPublishedAt,
    groups: [...groups.values(), ungrouped].filter((group) => group.rows.length > 0),
  };
}

export async function getParticipantResults(participantId: string): Promise<ParticipantResult[]> {
  const submissions = await prisma.submission.findMany({
    where: {
      participantId,
      deletedAt: null,
      resultSnapshot: {
        is: {
          publishedAt: {
            not: null,
          },
        },
      },
      activity: {
        resultsPublishedAt: {
          not: null,
        },
      },
    },
    include: {
      activity: {
        include: {
          criteria: {
            orderBy: {
              displayOrder: "asc",
            },
          },
        },
      },
      group: true,
      images: {
        where: {
          active: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          publicUrl: true,
          originalName: true,
        },
      },
      judgeComments: {
        where: {
          comment: {
            not: "",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          comment: true,
          createdAt: true,
        },
      },
      resultSnapshot: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return submissions.flatMap((submission) => {
    if (!submission.resultSnapshot?.publishedAt) {
      return [];
    }

    return {
      submissionId: submission.id,
      cardName: submission.cardName,
      activityTitle: submission.activity.title,
      activitySlug: submission.activity.slug,
      activityMode: submission.activity.mode,
      groupName: submission.group?.name ?? "Ungrouped",
      finalScore: submission.resultSnapshot.finalScore,
      rank: submission.resultSnapshot.rank,
      publishedAt: submission.resultSnapshot.publishedAt,
      criterionAverages: mapCriterionAverages(
        submission.resultSnapshot.criterionAveragesJson,
        submission.activity.criteria,
      ),
      images: submission.images,
      judgeComments: submission.judgeComments,
    };
  });
}

export { mapCriterionAverages, parseCriterionAverages };
