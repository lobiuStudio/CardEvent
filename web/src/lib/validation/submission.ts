import { z } from "zod";

export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxSubmissionImageBytes = 10 * 1024 * 1024;

const optionalTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, z.string().max(max).optional());

export const submissionInputSchema = z.object({
  cardName: z.string().trim().min(1, "Card name is required.").max(120),
  gameOrSeries: optionalTrimmedString(120),
  characterOrType: optionalTrimmedString(120),
  description: optionalTrimmedString(1000),
  authorDisplayName: optionalTrimmedString(120),
  groupId: optionalTrimmedString(200),
});

export type SubmissionInput = z.infer<typeof submissionInputSchema>;

export function validateImageFile(file: File): void {
  if (!acceptedImageMimeTypes.includes(file.type as (typeof acceptedImageMimeTypes)[number])) {
    throw new Error("Upload JPG, PNG, or WebP images only.");
  }

  if (file.size > maxSubmissionImageBytes) {
    throw new Error("Each image must be 10 MB or smaller.");
  }
}
