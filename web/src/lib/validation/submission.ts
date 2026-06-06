import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

export const acceptedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export const maxSubmissionImageBytes = 10 * 1024 * 1024;

export type AcceptedImageMimeType = (typeof acceptedImageMimeTypes)[number];
export type AcceptedImageExtension = "jpg" | "png" | "webp";

export type ValidatedImageFile = {
  bytes: Uint8Array;
  extension: AcceptedImageExtension;
  mimeType: AcceptedImageMimeType;
  fileSize: number;
};

const acceptedImageExtensionsByMimeType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} satisfies Record<AcceptedImageMimeType, AcceptedImageExtension>;

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

export async function readValidatedImageFile(file: File): Promise<ValidatedImageFile> {
  if (file.size > maxSubmissionImageBytes) {
    throw new Error("Each image must be 10 MB or smaller.");
  }

  if (file.size === 0) {
    throw new Error("Image files cannot be empty.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = await fileTypeFromBuffer(bytes);
  const detectedMimeType = detectedType?.mime;

  if (!acceptedImageMimeTypes.includes(detectedMimeType as AcceptedImageMimeType)) {
    throw new Error("Upload JPG, PNG, or WebP images only.");
  }

  const mimeType = detectedMimeType as AcceptedImageMimeType;

  return {
    bytes,
    extension: acceptedImageExtensionsByMimeType[mimeType],
    mimeType,
    fileSize: bytes.byteLength,
  };
}

export async function validateImageFile(file: File): Promise<void> {
  await readValidatedImageFile(file);
}
