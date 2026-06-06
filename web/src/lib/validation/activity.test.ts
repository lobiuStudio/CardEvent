import { describe, expect, it } from "vitest";
import { createActivitySchema } from "./activity";

const validActivityInput = {
  slug: "spring-card-cup",
  title: "Spring Card Cup",
  description: "A seasonal card grading activity.",
  mode: "grading",
  rulesMarkdown: "## Rules\n\nSubmit original card images.",
  submissionStartAt: "2026-07-01T00:00:00.000Z",
  submissionDeadlineAt: "2026-07-10T00:00:00.000Z",
  judgingDeadlineAt: "2026-07-20T00:00:00.000Z",
  expectedResultAnnouncementAt: "2026-07-25T00:00:00.000Z",
  perParticipantSubmissionLimit: "3",
  maxImagesPerSubmission: "4",
  reviewRequired: true,
  anonymousJudging: false,
  paymentRequired: false,
  paymentChargingMode: "per_card",
  groups: [{ name: "Open", displayOrder: 0 }],
  criteria: [{ name: "Condition", displayOrder: 0 }],
};

describe("createActivitySchema", () => {
  it("coerces valid activity input into typed dates and numbers", () => {
    const parsed = createActivitySchema.parse(validActivityInput);

    expect(parsed.submissionStartAt).toBeInstanceOf(Date);
    expect(parsed.submissionDeadlineAt).toBeInstanceOf(Date);
    expect(parsed.perParticipantSubmissionLimit).toBe(3);
    expect(parsed.maxImagesPerSubmission).toBe(4);
  });

  it("requires submission, judging, and announcement dates to be chronological", () => {
    const parsed = createActivitySchema.safeParse({
      ...validActivityInput,
      submissionDeadlineAt: "2026-06-30T00:00:00.000Z",
      judgingDeadlineAt: "2026-07-09T00:00:00.000Z",
      expectedResultAnnouncementAt: "2026-07-08T00:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["submissionDeadlineAt", "expectedResultAnnouncementAt"]),
    );
  });
});
