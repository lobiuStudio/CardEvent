import { z } from "zod";

export const activityModeSchema = z.enum(["competition", "grading"]);
export const paymentChargingModeSchema = z.enum(["per_card", "per_participant"]);

export const gradingCriterionInputSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  displayOrder: z.number().int().min(0),
});

export const activityGroupInputSchema = z.object({
  name: z.string().min(1).max(80),
  displayOrder: z.number().int().min(0),
});

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
    reviewRequired: z.coerce.boolean(),
    anonymousJudging: z.coerce.boolean(),
    paymentRequired: z.coerce.boolean(),
    paymentInstructions: z.string().max(2000).optional(),
    paymentChargingMode: paymentChargingModeSchema,
    groups: z.array(activityGroupInputSchema).min(1),
    criteria: z.array(gradingCriterionInputSchema).min(1),
  })
  .superRefine((activity, context) => {
    if (activity.submissionStartAt > activity.submissionDeadlineAt) {
      context.addIssue({
        code: "custom",
        message: "Submission deadline must be after the submission start.",
        path: ["submissionDeadlineAt"],
      });
    }

    if (activity.submissionDeadlineAt > activity.judgingDeadlineAt) {
      context.addIssue({
        code: "custom",
        message: "Judging deadline must be after the submission deadline.",
        path: ["judgingDeadlineAt"],
      });
    }

    if (activity.judgingDeadlineAt > activity.expectedResultAnnouncementAt) {
      context.addIssue({
        code: "custom",
        message: "Expected result announcement must be after the judging deadline.",
        path: ["expectedResultAnnouncementAt"],
      });
    }
  });
