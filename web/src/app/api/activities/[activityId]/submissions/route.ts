import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import {
  addSubmissionImage,
  countParticipantSubmissions,
  createSubmissionRecord,
} from "@/lib/db/submission-repository";
import { prisma } from "@/lib/db/prisma";
import { localFileStorage } from "@/lib/files/local-file-storage";
import { submissionInputSchema, validateImageFile } from "@/lib/validation/submission";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToSubmit(request: Request, slug: string, error: string): NextResponse {
  const url = new URL(`/activities/${slug}/submit`, request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number, activitySlug?: string): NextResponse {
  if (!wantsJson(request) && activitySlug) {
    return redirectToSubmit(request, activitySlug, error);
  }

  return NextResponse.json({ error }, { status });
}

function successResponse(request: Request): NextResponse {
  return NextResponse.redirect(new URL("/account/submissions", request.url), { status: 303 });
}

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function isUploadedFile(value: FormDataEntryValue): value is File {
  return value instanceof File && (value.name !== "" || value.size > 0);
}

function getFirstIssueMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Enter valid submission details.";
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const user = await requireUser();
  const { activityId } = await params;
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      groups: {
        orderBy: {
          displayOrder: "asc",
        },
      },
    },
  });

  if (!activity) {
    return errorResponse(request, "Activity not found.", 404);
  }

  const now = new Date();

  if (now < activity.submissionStartAt) {
    return errorResponse(request, "Submissions are not open yet.", 403, activity.slug);
  }

  if (now > activity.submissionDeadlineAt) {
    return errorResponse(request, "The submission deadline has passed.", 403, activity.slug);
  }

  const submissionCount = await countParticipantSubmissions(activity.id, user.id);

  if (submissionCount >= activity.perParticipantSubmissionLimit) {
    return errorResponse(request, "You have reached the submission limit for this activity.", 409, activity.slug);
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return errorResponse(request, "Submit the form with card details and images.", 400, activity.slug);
  }

  const parsed = submissionInputSchema.safeParse({
    cardName: stringValue(formData, "cardName"),
    gameOrSeries: stringValue(formData, "gameOrSeries"),
    characterOrType: stringValue(formData, "characterOrType"),
    description: stringValue(formData, "description"),
    authorDisplayName: stringValue(formData, "authorDisplayName"),
    groupId: stringValue(formData, "groupId"),
  });

  if (!parsed.success) {
    return errorResponse(request, getFirstIssueMessage(parsed.error), 400, activity.slug);
  }

  const groupIds = new Set(activity.groups.map((group) => group.id));

  if (activity.groups.length > 0 && !parsed.data.groupId) {
    return errorResponse(request, "Choose a submission group.", 400, activity.slug);
  }

  if (parsed.data.groupId && !groupIds.has(parsed.data.groupId)) {
    return errorResponse(request, "Choose a valid submission group.", 400, activity.slug);
  }

  const imageFiles = formData.getAll("images").filter(isUploadedFile);

  if (imageFiles.length < 1) {
    return errorResponse(request, "Upload at least one card image.", 400, activity.slug);
  }

  if (imageFiles.length > activity.maxImagesPerSubmission) {
    return errorResponse(
      request,
      `Upload no more than ${activity.maxImagesPerSubmission} images for this activity.`,
      400,
      activity.slug,
    );
  }

  for (const file of imageFiles) {
    try {
      validateImageFile(file);
    } catch (error) {
      return errorResponse(
        request,
        error instanceof Error ? error.message : "Upload valid card images.",
        400,
        activity.slug,
      );
    }
  }

  const submission = await createSubmissionRecord({
    activityId: activity.id,
    participantId: user.id,
    groupId: parsed.data.groupId,
    cardName: parsed.data.cardName,
    gameOrSeries: parsed.data.gameOrSeries,
    characterOrType: parsed.data.characterOrType,
    description: parsed.data.description,
    authorDisplayName: parsed.data.authorDisplayName,
    reviewStatus: activity.reviewRequired ? "pending" : "not_required",
    paymentStatus: activity.paymentRequired ? "pending" : "not_required",
  });

  try {
    for (const file of imageFiles) {
      const storedFile = await localFileStorage.saveSubmissionImage({
        activitySlug: activity.slug,
        submissionId: submission.id,
        file,
      });

      await addSubmissionImage({
        submissionId: submission.id,
        file: storedFile,
      });
    }
  } catch (error) {
    console.error("Failed to save submission images", error);
    return errorResponse(
      request,
      "Submission was created, but image upload failed. Contact support before submitting again.",
      500,
      activity.slug,
    );
  }

  return successResponse(request);
}
