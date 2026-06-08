import { z } from "zod";

export const activityModeSchema = z.enum(["competition", "grading"], {
  error: "Choose grading or competition.",
});
export const paymentChargingModeSchema = z.enum(["per_card", "per_participant"], {
  error: "Choose how payment is charged.",
});
export const fileStorageProviderSchema = z.enum(["local", "r2"]);

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

const activityDateSchema = z.coerce.date({
  error: "Enter a valid date and time.",
});

export const gradingCriterionInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a criterion name.").max(80, "Use 80 characters or fewer."),
  description: z.string().max(500, "Use 500 characters or fewer.").optional(),
  displayOrder: z.number().int().min(0),
});

export const activityGroupInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a group name.").max(80, "Use 80 characters or fewer."),
  displayOrder: z.number().int().min(0),
});

export const storedActivityCoverImageSchema = z.object({
  provider: fileStorageProviderSchema,
  fileId: z.string().min(1).max(1000),
  publicUrl: z.string().min(1).max(1000),
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024),
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
    slug: z
      .string()
      .min(3, "Use at least 3 characters for the public URL.")
      .max(80, "Use 80 characters or fewer for the public URL.")
      .regex(/^[a-z0-9-]+$/, "Use lowercase English letters, numbers, and hyphens only."),
    title: z.string().trim().min(1, "Enter an activity name.").max(120, "Use 120 characters or fewer."),
    description: z.string().trim().min(1, "Enter a short introduction.").max(1000, "Use 1000 characters or fewer."),
    mode: activityModeSchema,
    rulesMarkdown: z.string().trim().min(1, "Enter the activity rules."),
    submissionStartAt: activityDateSchema,
    submissionDeadlineAt: activityDateSchema,
    judgingDeadlineAt: activityDateSchema,
    expectedResultAnnouncementAt: activityDateSchema,
    perParticipantSubmissionLimit: z.coerce
      .number({ error: "Enter max submissions as a number." })
      .int("Use a whole number.")
      .min(1, "Allow at least 1 submission.")
      .max(20, "Allow 20 submissions or fewer."),
    maxImagesPerSubmission: z.coerce
      .number({ error: "Enter max images as a number." })
      .int("Use a whole number.")
      .min(1, "Allow at least 1 image.")
      .max(10, "Allow 10 images or fewer."),
    reviewRequired: booleanInputSchema,
    anonymousJudging: booleanInputSchema,
    paymentRequired: booleanInputSchema,
    paymentInstructions: z.string().trim().max(2000, "Use 2000 characters or fewer.").optional(),
    paymentChargingMode: paymentChargingModeSchema,
    coverImage: storedActivityCoverImageSchema.optional(),
    groups: z.array(activityGroupInputSchema).min(1, "Add at least one group."),
    criteria: z.array(gradingCriterionInputSchema).min(1, "Add at least one judging criterion."),
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
        message: "Enter payment instructions or turn payment off.",
        path: ["paymentInstructions"],
      });
    }

    addDuplicateNameIssues(context, "groups", activity.groups);
    addDuplicateNameIssues(context, "criteria", activity.criteria);
  });
