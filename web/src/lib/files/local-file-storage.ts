import { mkdir, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import type { FileStorage, SavePaymentProofInput, SaveSubmissionImageInput, StoredFile } from "./file-storage";

const unsafeFilenameCharacters = /[^a-zA-Z0-9._-]/g;

function getUploadRoot(): string {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_ROOT ?? "./uploads");
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(unsafeFilenameCharacters, "-").replace(/-+/g, "-") || "file";

  return sanitized === "." || sanitized === ".." ? "file" : sanitized;
}

function toPublicUploadUrl(fileId: string): string {
  return `/uploads/${fileId.split(path.sep).map(encodeURIComponent).join("/")}`;
}

async function saveFile(file: File, directoryParts: string[]): Promise<StoredFile> {
  const uploadRoot = getUploadRoot();
  const safeDirectoryParts = directoryParts.map(sanitizePathSegment);
  const originalName = file.name || "upload";
  const storedName = `${Date.now()}-${randomUUID()}-${sanitizePathSegment(originalName)}`;
  const relativePath = path.join(...safeDirectoryParts, storedName);
  const absolutePath = path.join(uploadRoot, relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    provider: "local",
    fileId: relativePath.split(path.sep).join("/"),
    publicUrl: toPublicUploadUrl(relativePath),
    originalName,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
  };
}

export const localFileStorage: FileStorage = {
  saveSubmissionImage({ activitySlug, submissionId, file }: SaveSubmissionImageInput) {
    return saveFile(file, ["submissions", activitySlug, submissionId]);
  },
  savePaymentProof({ activitySlug, ownerId, file }: SavePaymentProofInput) {
    return saveFile(file, ["payment-proofs", activitySlug, ownerId]);
  },
};
