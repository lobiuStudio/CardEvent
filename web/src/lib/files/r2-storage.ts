import { randomUUID } from "crypto";
import { getRequiredCloudflareEnv } from "@/lib/cloudflare/bindings";
import { readValidatedImageFile } from "@/lib/validation/submission";
import type { FileStorage, SavePaymentProofInput, SaveSubmissionImageInput, StoredFile, StoredFileBody } from "./file-storage";
import { buildR2ObjectKey, toPublicUploadUrl } from "./r2-key";

async function saveImageFile({
  activitySlug,
  ownerId,
  file,
  kind,
  validatedImage,
}: {
  activitySlug: string;
  ownerId: string;
  file: File;
  kind: "submission" | "payment-proof";
  validatedImage?: SaveSubmissionImageInput["validatedImage"];
}): Promise<StoredFile> {
  const image = validatedImage ?? (await readValidatedImageFile(file));
  const fileId = buildR2ObjectKey({
    kind,
    activitySlug,
    ownerId,
    fileName: file.name || `upload.${image.extension}`,
    id: randomUUID(),
  });

  await getRequiredCloudflareEnv().CARD_EVENT_UPLOADS.put(fileId, image.bytes, {
    httpMetadata: {
      contentType: image.mimeType,
    },
  });

  return {
    provider: "r2",
    fileId,
    publicUrl: toPublicUploadUrl(fileId),
    originalName: file.name || "upload",
    mimeType: image.mimeType,
    fileSize: image.bytes.byteLength,
  };
}

export const r2FileStorage: FileStorage = {
  saveSubmissionImage({ activitySlug, submissionId, file, validatedImage }: SaveSubmissionImageInput) {
    return saveImageFile({
      activitySlug,
      ownerId: submissionId,
      file,
      kind: "submission",
      validatedImage,
    });
  },
  savePaymentProof({ activitySlug, ownerId, file, validatedImage }: SavePaymentProofInput) {
    return saveImageFile({
      activitySlug,
      ownerId,
      file,
      kind: "payment-proof",
      validatedImage,
    });
  },
  async readFile(fileId: string): Promise<StoredFileBody | null> {
    const object = await getRequiredCloudflareEnv().CARD_EVENT_UPLOADS.get(fileId);

    if (!object) {
      return null;
    }

    return {
      body: object.body,
      mimeType: object.httpMetadata?.contentType ?? "application/octet-stream",
      fileSize: object.size,
    };
  },
  async deleteFile(file: StoredFile): Promise<void> {
    if (file.provider !== "r2") {
      return;
    }

    await getRequiredCloudflareEnv().CARD_EVENT_UPLOADS.delete(file.fileId);
  },
};
