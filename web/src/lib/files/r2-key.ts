const unsafeObjectKeyCharacters = /[^a-zA-Z0-9._-]/g;
const repeatedDashes = /-+/g;

export type BuildR2ObjectKeyInput = {
  kind: "submission" | "payment-proof";
  activitySlug: string;
  ownerId: string;
  fileName: string;
  id: string;
};

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(unsafeObjectKeyCharacters, "-")
    .replace(repeatedDashes, "-")
    .replace(/-\./g, ".")
    .replace(/^-|-$/g, "");

  return sanitized === "" || sanitized === "." || sanitized === ".." ? "file" : sanitized;
}

export function buildR2ObjectKey(input: BuildR2ObjectKeyInput): string {
  const prefix = input.kind === "submission" ? "submissions" : "payment-proofs";
  const safeActivitySlug = sanitizePathSegment(input.activitySlug);
  const safeOwnerId = sanitizePathSegment(input.ownerId);
  const safeId = sanitizePathSegment(input.id);
  const safeFileName = sanitizePathSegment(input.fileName || "upload");

  return `${prefix}/${safeActivitySlug}/${safeOwnerId}/${safeId}-${safeFileName}`;
}

export function toPublicUploadUrl(fileId: string): string {
  const segments = fileId.split("/");

  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error("Upload file id contains an unsafe path segment.");
  }

  return `/uploads/${segments.map(encodeURIComponent).join("/")}`;
}
