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
