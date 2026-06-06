import { describe, expect, it } from "vitest";
import {
  canEditSubmission,
  canPublishResults,
  getSubmissionJudgingEligibility,
  type EligibilityReason,
  type PaymentStatus,
  type ReviewStatus,
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

  it("allows owners to edit at the submission deadline", () => {
    expect(
      canEditSubmission({
        now: deadline,
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

  it.each([
    {
      reason: "deleted",
      input: {
        deletedAt: new Date("2026-07-01T12:00:00.000Z"),
        reviewRequired: false,
        reviewStatus: "not_required",
        paymentRequired: false,
        paymentStatus: "not_required",
      },
    },
    {
      reason: "review_pending",
      input: {
        deletedAt: null,
        reviewRequired: true,
        reviewStatus: "pending",
        paymentRequired: false,
        paymentStatus: "not_required",
      },
    },
    {
      reason: "review_rejected",
      input: {
        deletedAt: null,
        reviewRequired: true,
        reviewStatus: "rejected",
        paymentRequired: false,
        paymentStatus: "not_required",
      },
    },
    {
      reason: "payment_pending",
      input: {
        deletedAt: null,
        reviewRequired: false,
        reviewStatus: "not_required",
        paymentRequired: true,
        paymentStatus: "pending",
      },
    },
    {
      reason: "payment_rejected",
      input: {
        deletedAt: null,
        reviewRequired: false,
        reviewStatus: "not_required",
        paymentRequired: true,
        paymentStatus: "rejected",
      },
    },
  ] satisfies {
    reason: EligibilityReason;
    input: Parameters<typeof getSubmissionJudgingEligibility>[0];
  }[])("returns $reason when judging is blocked", ({ input, reason }) => {
    expect(getSubmissionJudgingEligibility(input)).toEqual({ eligible: false, reason });
  });

  it.each([
    {
      name: "required review marked not required",
      input: {
        deletedAt: null,
        reviewRequired: true,
        reviewStatus: "not_required",
        paymentRequired: false,
        paymentStatus: "not_required",
      },
      reason: "review_pending",
    },
    {
      name: "required payment marked not required",
      input: {
        deletedAt: null,
        reviewRequired: false,
        reviewStatus: "not_required",
        paymentRequired: true,
        paymentStatus: "not_required",
      },
      reason: "payment_pending",
    },
  ] satisfies {
    name: string;
    input: {
      deletedAt: Date | null;
      reviewRequired: boolean;
      reviewStatus: ReviewStatus;
      paymentRequired: boolean;
      paymentStatus: PaymentStatus;
    };
    reason: EligibilityReason;
  }[])("fails closed for inconsistent required/status inputs: $name", ({ input, reason }) => {
    expect(getSubmissionJudgingEligibility(input)).toEqual({ eligible: false, reason });
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

  it.each([
    {
      name: "empty eligible submissions without judges",
      input: { eligibleSubmissionCount: 0, judgeCount: 0, completedJudgeSubmissionPairs: 0 },
      expected: { canPublish: true, missingJudgeSubmissionPairs: 0 },
    },
    {
      name: "empty eligible submissions with judges",
      input: { eligibleSubmissionCount: 0, judgeCount: 2, completedJudgeSubmissionPairs: 0 },
      expected: { canPublish: true, missingJudgeSubmissionPairs: 0 },
    },
    {
      name: "non-empty eligible submissions with zero judges",
      input: { eligibleSubmissionCount: 3, judgeCount: 0, completedJudgeSubmissionPairs: 0 },
      expected: { canPublish: false, missingJudgeSubmissionPairs: 0 },
    },
  ])("handles $name", ({ input, expected }) => {
    expect(canPublishResults(input)).toEqual(expected);
  });
});
