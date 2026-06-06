import { z } from "zod";

const optionalTrimmedComment = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(2000).optional());

export const criterionScoreSchema = z.object({
  criterionId: z.string().min(1),
  value: z.number().min(0).max(10).refine((value) => Math.round(value * 2) === value * 2, {
    message: "Score must use 0.5 increments",
  }),
});

export const judgeScoreSubmissionSchema = z.object({
  scores: z.array(criterionScoreSchema).min(1),
  comment: optionalTrimmedComment,
});

export type JudgeScoreSubmissionInput = z.infer<typeof judgeScoreSubmissionSchema>;
