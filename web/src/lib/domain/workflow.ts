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

  if (input.reviewRequired && input.reviewStatus !== "approved") {
    return {
      eligible: false,
      reason: input.reviewStatus === "rejected" ? "review_rejected" : "review_pending",
    };
  }

  if (input.paymentRequired && input.paymentStatus !== "confirmed") {
    return {
      eligible: false,
      reason: input.paymentStatus === "rejected" ? "payment_rejected" : "payment_pending",
    };
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
  const hasJudgesForEligibleSubmissions = input.eligibleSubmissionCount === 0 || input.judgeCount > 0;

  return {
    canPublish: hasJudgesForEligibleSubmissions && missingJudgeSubmissionPairs === 0,
    missingJudgeSubmissionPairs,
  };
}
