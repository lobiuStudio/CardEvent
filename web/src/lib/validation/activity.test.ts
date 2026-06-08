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

  it("accepts optional activity cover image metadata", () => {
    const parsed = createActivitySchema.parse({
      ...validActivityInput,
      coverImage: {
        provider: "r2",
        fileId: "activity-covers/spring-card-cup/cover.png",
        publicUrl: "/uploads/activity-covers/spring-card-cup/cover.png",
        originalName: "cover.png",
        mimeType: "image/png",
        fileSize: 1024,
      },
    });

    expect(parsed.coverImage).toEqual({
      provider: "r2",
      fileId: "activity-covers/spring-card-cup/cover.png",
      publicUrl: "/uploads/activity-covers/spring-card-cup/cover.png",
      originalName: "cover.png",
      mimeType: "image/png",
      fileSize: 1024,
    });
  });


  it.each(["false", "0"])("parses %s boolean input as false", (booleanInput) => {
    const parsed = createActivitySchema.parse({
      ...validActivityInput,
      reviewRequired: booleanInput,
      anonymousJudging: booleanInput,
      paymentRequired: booleanInput,
    });

    expect(parsed.reviewRequired).toBe(false);
    expect(parsed.anonymousJudging).toBe(false);
    expect(parsed.paymentRequired).toBe(false);
  });

  it("requires non-empty trimmed payment instructions when payment is required", () => {
    const parsed = createActivitySchema.safeParse({
      ...validActivityInput,
      paymentRequired: true,
      paymentInstructions: "   ",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toContain("paymentInstructions");
  });

  it("trims group and criterion names from JSON input", () => {
    const parsed = createActivitySchema.parse({
      ...validActivityInput,
      groups: [{ name: " Open ", displayOrder: 0 }],
      criteria: [{ name: " Condition ", displayOrder: 0 }],
    });

    expect(parsed.groups[0]?.name).toBe("Open");
    expect(parsed.criteria[0]?.name).toBe("Condition");
  });

  it("rejects empty and duplicate trimmed group and criterion names", () => {
    const parsed = createActivitySchema.safeParse({
      ...validActivityInput,
      groups: [
        { name: "Open", displayOrder: 0 },
        { name: " Open ", displayOrder: 1 },
        { name: "   ", displayOrder: 2 },
      ],
      criteria: [
        { name: "Condition", displayOrder: 0 },
        { name: " Condition ", displayOrder: 1 },
        { name: "   ", displayOrder: 2 },
      ],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toEqual(
      expect.arrayContaining(["groups.1.name", "groups.2.name", "criteria.1.name", "criteria.2.name"]),
    );
  });

  it("requires submission, judging, and announcement dates to be strictly chronological", () => {
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

  it.each([
    {
      name: "submission deadline equals submission start",
      overrides: {
        submissionDeadlineAt: validActivityInput.submissionStartAt,
      },
      path: "submissionDeadlineAt",
    },
    {
      name: "judging deadline equals submission deadline",
      overrides: {
        judgingDeadlineAt: validActivityInput.submissionDeadlineAt,
      },
      path: "judgingDeadlineAt",
    },
    {
      name: "expected results equals judging deadline",
      overrides: {
        expectedResultAnnouncementAt: validActivityInput.judgingDeadlineAt,
      },
      path: "expectedResultAnnouncementAt",
    },
  ])("rejects equal dates when $name", ({ overrides, path }) => {
    const parsed = createActivitySchema.safeParse({
      ...validActivityInput,
      ...overrides,
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((issue) => issue.path.join("."))).toContain(path);
  });
});
