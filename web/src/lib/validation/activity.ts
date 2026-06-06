import { z } from "zod";

export const activityModeSchema = z.enum(["competition", "grading"]);
export const paymentChargingModeSchema = z.enum(["per_card", "per_participant"]);

const booleanInputSchema = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "on", "true"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const nameSchema = z.string().trim().min(1).max(80);

export const gradingCriterionInputSchema = z.object({
  name: nameSchema,
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0),
});

export const activityGroupInputSchema = z.object({
  name: nameSchema,
  displayOrder: z.number().int().min(0),
});

function addDuplicateNameIssues(
  context: z.RefinementCtx,
  path: "groups" | "criteria",
  items: {
    name: string;
  }[],
) {
  const seenNames = new Set<string>();

  items.forEach((item, index) => {
    if (seenNames.has(item.name)) {
      context.addIssue({
        code: "custom",
        message: "Names must be unique.",
        path: [path, index, "name"],
      });
      return;
    }

    seenNames.add(item.name);
  });
}

export const createActivitySchema = z
  .object({
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
    reviewRequired: booleanInputSchema,
    anonymousJudging: booleanInputSchema,
    paymentRequired: booleanInputSchema,
    paymentInstructions: z.string().trim().max(2000).optional(),
    paymentChargingMode: paymentChargingModeSchema,
    groups: z.array(activityGroupInputSchema).min(1),
    criteria: z.array(gradingCriterionInputSchema).min(1),
  })
  .superRefine((activity, context) => {
    if (activity.submissionStartAt >= activity.submissionDeadlineAt) {
      context.addIssue({
        code: "custom",
        message: "Submission deadline must be after the submission start.",
        path: ["submissionDeadlineAt"],
      });
    }

    if (activity.submissionDeadlineAt >= activity.judgingDeadlineAt) {
      context.addIssue({
        code: "custom",
        message: "Judging deadline must be after the submission deadline.",
        path: ["judgingDeadlineAt"],
      });
    }

    if (activity.judgingDeadlineAt >= activity.expectedResultAnnouncementAt) {
      context.addIssue({
        code: "custom",
        message: "Expected result announcement must be after the judging deadline.",
        path: ["expectedResultAnnouncementAt"],
      });
    }

    if (activity.paymentRequired && !activity.paymentInstructions) {
      context.addIssue({
        code: "custom",
        message: "Payment instructions are required when payment is required.",
        path: ["paymentInstructions"],
      });
    }

    addDuplicateNameIssues(context, "groups", activity.groups);
    addDuplicateNameIssues(context, "criteria", activity.criteria);
  });
