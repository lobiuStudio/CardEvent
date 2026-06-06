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
