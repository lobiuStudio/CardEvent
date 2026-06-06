import { mkdir, unlink, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { fileTypeFromBuffer } from "file-type";
import path from "path";
import type { FileStorage, SavePaymentProofInput, SaveSubmissionImageInput, StoredFile } from "./file-storage";
import { readValidatedImageFile } from "@/lib/validation/submission";

const unsafeFilenameCharacters = /[^a-zA-Z0-9._-]/g;
const safeUploadPathSegment = /^[a-zA-Z0-9._-]+$/;

export function getLocalUploadRoot(): string {
  return path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_ROOT ?? "./uploads");
}

function sanitizePathSegment(value: string): string {
  const sanitized = value.replace(unsafeFilenameCharacters, "-").replace(/-+/g, "-") || "file";

  return sanitized === "." || sanitized === ".." ? "file" : sanitized;
}

function isSafeUploadPathSegment(value: string): boolean {
  return safeUploadPathSegment.test(value) && value !== "." && value !== "..";
}

export function resolveLocalUploadPath(pathSegments: string[]): string | null {
  if (pathSegments.length === 0 || pathSegments.some((segment) => !isSafeUploadPathSegment(segment))) {
    return null;
  }

  const uploadRoot = getLocalUploadRoot();
  const resolvedPath = path.resolve(uploadRoot, ...pathSegments);

  if (resolvedPath !== uploadRoot && resolvedPath.startsWith(`${uploadRoot}${path.sep}`)) {
    return resolvedPath;
  }

  return null;
}

function toPublicUploadUrl(fileId: string): string {
  return `/uploads/${fileId.split("/").map(encodeURIComponent).join("/")}`;
}

async function saveBytesFile({
  bytes,
  directoryParts,
  extension,
  mimeType,
  originalName,
}: {
  bytes: Uint8Array;
  directoryParts: string[];
  extension: string;
  mimeType: string;
  originalName: string;
}): Promise<StoredFile> {
  const safeDirectoryParts = directoryParts.map(sanitizePathSegment);
  const storedName = `${Date.now()}-${randomUUID()}.${sanitizePathSegment(extension)}`;
  const pathSegments = [...safeDirectoryParts, storedName];
  const absolutePath = resolveLocalUploadPath(pathSegments);

  if (!absolutePath) {
    throw new Error("Unable to resolve a safe upload path.");
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, bytes);

  const fileId = pathSegments.join("/");
  return {
    provider: "local",
    fileId,
    publicUrl: toPublicUploadUrl(fileId),
    originalName,
    mimeType,
    fileSize: bytes.byteLength,
  };
}

async function saveImageFile({
  file,
  directoryParts,
  validatedImage,
}: SaveSubmissionImageInput & { directoryParts: string[] }): Promise<StoredFile> {
  const image = validatedImage ?? (await readValidatedImageFile(file));

  return saveBytesFile({
    bytes: image.bytes,
    directoryParts,
    extension: image.extension,
    mimeType: image.mimeType,
    originalName: file.name || "upload",
  });
}

export const localFileStorage: FileStorage = {
  saveSubmissionImage({ activitySlug, submissionId, file, validatedImage }: SaveSubmissionImageInput) {
    return saveImageFile({
      activitySlug,
      submissionId,
      file,
      validatedImage,
      directoryParts: ["submissions", activitySlug, submissionId],
    });
  },
  async savePaymentProof({ activitySlug, ownerId, file }: SavePaymentProofInput) {
    if (file.size === 0) {
      throw new Error("Payment proof files cannot be empty.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = await fileTypeFromBuffer(bytes);

    return saveBytesFile({
      bytes,
      directoryParts: ["payment-proofs", activitySlug, ownerId],
      extension: detectedType?.ext ?? "bin",
      mimeType: detectedType?.mime ?? "application/octet-stream",
      originalName: file.name || "upload",
    });
  },
};

export async function deleteLocalStoredFile(file: StoredFile): Promise<void> {
  if (file.provider !== "local") {
    return;
  }

  const absolutePath = resolveLocalUploadPath(file.fileId.split("/"));

  if (!absolutePath) {
    return;
  }

  await unlink(absolutePath).catch((error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  });
}
