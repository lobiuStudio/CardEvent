import { prisma } from "./prisma";

export class ReviewSubmissionNotFoundError extends Error {
  constructor() {
    super("Submission was not found or cannot be reviewed.");
    this.name = "ReviewSubmissionNotFoundError";
  }
}

export async function approveSubmission(submissionId: string, adminId: string) {
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!submission) {
    throw new ReviewSubmissionNotFoundError();
  }

  const updatedSubmission = await prisma.submission.update({
    where: {
      id: submission.id,
    },
    data: {
      reviewStatus: "approved",
      rejectionReason: null,
    },
  });

  await prisma.reviewDecision.create({
    data: {
      submissionId: submission.id,
      adminId,
      decision: "approved",
    },
  });

  return updatedSubmission;
}

export async function rejectSubmission(submissionId: string, adminId: string, reason?: string) {
  const rejectionReason = reason?.trim() || null;

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!submission) {
    throw new ReviewSubmissionNotFoundError();
  }

  const updatedSubmission = await prisma.submission.update({
    where: {
      id: submission.id,
    },
    data: {
      reviewStatus: "rejected",
      rejectionReason,
    },
  });

  await prisma.reviewDecision.create({
    data: {
      submissionId: submission.id,
      adminId,
      decision: "rejected",
      reason: rejectionReason,
    },
  });

  return updatedSubmission;
}

export function listPendingReviewSubmissions() {
  return prisma.submission.findMany({
    where: {
      deletedAt: null,
      reviewStatus: "pending",
      activity: {
        reviewRequired: true,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      activity: true,
      group: true,
      participant: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      images: {
        where: {
          active: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}
