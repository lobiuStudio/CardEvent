import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { createPaymentProof } from "@/lib/db/payment-repository";
import { prisma } from "@/lib/db/prisma";
import { deleteLocalStoredFile, localFileStorage } from "@/lib/files/local-file-storage";
import type { StoredFile } from "@/lib/files/file-storage";
import { readValidatedImageFile, type ValidatedImageFile } from "@/lib/validation/submission";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToAccount(request: Request, key: "error" | "paymentProof", value: string): NextResponse {
  const url = new URL("/account/submissions", request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToAccount(request, "error", error);
}

function successResponse(request: Request, paymentProofId: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ paymentProofId });
  }

  return redirectToAccount(request, "paymentProof", "uploaded");
}

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return value instanceof File && (value.name !== "" || value.size > 0);
}

async function deleteStagedFile(file: StoredFile): Promise<void> {
  try {
    await deleteLocalStoredFile(file);
  } catch (error) {
    console.error("Failed to clean up staged payment proof", error);
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const user = await requireUser();
  const { activityId } = await params;
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
  });

  if (!activity) {
    return errorResponse(request, "Activity not found.", 404);
  }

  if (!activity.paymentRequired) {
    return errorResponse(request, "Payment proof is not required for this activity.", 409);
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return errorResponse(request, "Upload one payment proof image.", 400);
  }

  const proofFiles = formData.getAll("proof").filter(isUploadedFile);

  if (proofFiles.length !== 1) {
    return errorResponse(request, "Upload exactly one payment proof image.", 400);
  }

  const proofFile = proofFiles[0];
  const submissionId = stringValue(formData, "submissionId");
  let scopedSubmissionId: string | null = null;
  let storageOwnerId = user.id;

  if (activity.paymentChargingMode === "per_card") {
    if (!submissionId) {
      return errorResponse(request, "Choose the submission this payment proof belongs to.", 400);
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        activityId: activity.id,
        participantId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        paymentStatus: true,
      },
    });

    if (!submission) {
      return errorResponse(request, "Submission not found.", 404);
    }

    if (submission.paymentStatus === "confirmed") {
      return errorResponse(request, "Payment has already been confirmed for this submission.", 409);
    }

    scopedSubmissionId = submission.id;
    storageOwnerId = submission.id;
  } else if (activity.paymentChargingMode === "per_participant") {
    const submissions = await prisma.submission.findMany({
      where: {
        activityId: activity.id,
        participantId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        paymentStatus: true,
      },
    });

    if (submissions.length === 0) {
      return errorResponse(request, "Submit a card before uploading payment proof.", 409);
    }

    if (submissions.every((submission) => submission.paymentStatus === "confirmed")) {
      return errorResponse(request, "Payment has already been confirmed for this activity.", 409);
    }
  } else {
    return errorResponse(request, "This activity has an unsupported payment charging mode.", 400);
  }

  let validatedImage: ValidatedImageFile;

  try {
    validatedImage = await readValidatedImageFile(proofFile);
  } catch (error) {
    return errorResponse(
      request,
      error instanceof Error ? error.message : "Upload a valid payment proof image.",
      400,
    );
  }

  let stagedFile: StoredFile;

  try {
    stagedFile = await localFileStorage.savePaymentProof({
      activitySlug: activity.slug,
      ownerId: storageOwnerId,
      file: proofFile,
      validatedImage,
    });
  } catch (error) {
    console.error("Failed to save payment proof", error);
    return errorResponse(request, "Payment proof upload failed. No proof was saved.", 500);
  }

  try {
    const paymentProof = await createPaymentProof({
      activityId: activity.id,
      participantId: user.id,
      submissionId: scopedSubmissionId,
      file: stagedFile,
    });

    return successResponse(request, paymentProof.id);
  } catch (error) {
    await deleteStagedFile(stagedFile);
    console.error("Failed to create payment proof record", error);
    return errorResponse(request, "Payment proof could not be saved.", 500);
  }
}
