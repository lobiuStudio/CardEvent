import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { StoredFile } from "@/lib/files/file-storage";
import { getFileStorage } from "@/lib/files/storage-provider";
import { acceptedImageMimeTypes, type AcceptedImageMimeType } from "@/lib/validation/submission";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

type StoredFileRecord = {
  storageProvider: string | null;
  storageFileId: string | null;
  publicUrl: string | null;
  originalName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToAdmin(request: Request, key: "deleted" | "error", value: string): NextResponse {
  const url = createSameOriginUrl(request, "/admin");
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToAdmin(request, "error", error);
}

function successResponse(request: Request, slug: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ slug });
  }

  return redirectToAdmin(request, "deleted", slug);
}

function isAcceptedImageMimeType(value: string | null): value is AcceptedImageMimeType {
  return acceptedImageMimeTypes.includes(value as AcceptedImageMimeType);
}

function toStoredFile(record: StoredFileRecord): StoredFile | null {
  if (
    (record.storageProvider !== "local" && record.storageProvider !== "r2") ||
    !record.storageFileId ||
    !record.publicUrl ||
    !record.originalName ||
    !isAcceptedImageMimeType(record.mimeType) ||
    typeof record.fileSize !== "number"
  ) {
    return null;
  }

  return {
    provider: record.storageProvider,
    fileId: record.storageFileId,
    publicUrl: record.publicUrl,
    originalName: record.originalName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
  };
}

async function deleteStoredFiles(files: StoredFile[]): Promise<void> {
  if (!files.length) {
    return;
  }

  const fileStorage = getFileStorage();
  const results = await Promise.allSettled(files.map((file) => fileStorage.deleteFile(file)));
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (rejected) {
    console.error("Failed to delete every stored activity file", rejected.reason);
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, "Sign in as an admin to delete activities.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, "Admin access is required.", 403);
  }

  const { activityId } = await params;
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      slug: true,
      coverImageStorageProvider: true,
      coverImageStorageFileId: true,
      coverImagePublicUrl: true,
      coverImageOriginalName: true,
      coverImageMimeType: true,
      coverImageFileSize: true,
      submissions: {
        select: {
          images: {
            select: {
              storageProvider: true,
              storageFileId: true,
              publicUrl: true,
              originalName: true,
              mimeType: true,
              fileSize: true,
            },
          },
        },
      },
      paymentProofs: {
        select: {
          storageProvider: true,
          storageFileId: true,
          publicUrl: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
        },
      },
    },
  });

  if (!activity) {
    return errorResponse(request, "Activity not found.", 404);
  }

  const files = [
    toStoredFile({
      storageProvider: activity.coverImageStorageProvider,
      storageFileId: activity.coverImageStorageFileId,
      publicUrl: activity.coverImagePublicUrl,
      originalName: activity.coverImageOriginalName,
      mimeType: activity.coverImageMimeType,
      fileSize: activity.coverImageFileSize,
    }),
    ...activity.submissions.flatMap((submission) => submission.images.map(toStoredFile)),
    ...activity.paymentProofs.map(toStoredFile),
  ].filter((file): file is StoredFile => Boolean(file));

  await prisma.activity.delete({ where: { id: activity.id } });
  await deleteStoredFiles(files);

  return successResponse(request, activity.slug);
}
