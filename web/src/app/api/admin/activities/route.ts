import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { createActivity } from "@/lib/db/activity-repository";
import type { StoredFile } from "@/lib/files/file-storage";
import { getFileStorage } from "@/lib/files/storage-provider";
import { createActivitySchema } from "@/lib/validation/activity";

export const runtime = "nodejs";

type ActivityFormBody = {
  slug: string;
  title: string;
  description: string;
  mode: string;
  rulesMarkdown: string;
  submissionStartAt: string;
  submissionDeadlineAt: string;
  judgingDeadlineAt: string;
  expectedResultAnnouncementAt: string;
  perParticipantSubmissionLimit: string;
  maxImagesPerSubmission: string;
  reviewRequired: boolean;
  anonymousJudging: boolean;
  paymentRequired: boolean;
  paymentInstructions?: string;
  paymentChargingMode: string;
  groups: {
    name: string;
    displayOrder: number;
  }[];
  criteria: {
    name: string;
    description?: string;
    displayOrder: number;
  }[];
};

type ParsedActivityRequest = {
  values: ActivityFormBody | unknown;
  coverImageFile?: File;
};

type FieldErrors = Record<string, string>;

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToNewActivity(request: Request, error: string): NextResponse {
  const url = createSameOriginUrl(request, "/admin/activities/new");
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectToAdmin(request: Request, slug: string): NextResponse {
  const url = createSameOriginUrl(request, "/admin");
  url.searchParams.set("created", slug);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToNewActivity(request, error);
}

function validationErrorResponse(
  request: Request,
  fieldErrors: FieldErrors,
  values: unknown,
  status = 400,
): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json(
      {
        error: "Check the highlighted fields and try again.",
        fieldErrors,
        values,
      },
      { status },
    );
  }

  return redirectToNewActivity(request, "Check the highlighted fields and try again.");
}

function successResponse(request: Request, activity: { id: string; slug: string }): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ activityId: activity.id, slug: activity.slug });
  }

  return redirectToAdmin(request, activity.slug);
}

function stringValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringValue(formData: FormData, name: string): string | undefined {
  const value = stringValue(formData, name);
  return value ? value : undefined;
}

function booleanValue(formData: FormData, name: string): boolean {
  return formData
    .getAll(name)
    .some((value) => typeof value === "string" && ["1", "on", "true"].includes(value.toLowerCase()));
}

function stringValues(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => (typeof value === "string" ? value.trim() : ""));
}

function parseActivityFormData(formData: FormData): ActivityFormBody {
  const groupNames = stringValues(formData, "groupName");
  const criteriaNames = stringValues(formData, "criterionName");
  const criteriaDescriptions = stringValues(formData, "criterionDescription");

  return {
    slug: stringValue(formData, "slug"),
    title: stringValue(formData, "title"),
    description: stringValue(formData, "description"),
    mode: stringValue(formData, "mode"),
    rulesMarkdown: stringValue(formData, "rulesMarkdown"),
    submissionStartAt: stringValue(formData, "submissionStartAt"),
    submissionDeadlineAt: stringValue(formData, "submissionDeadlineAt"),
    judgingDeadlineAt: stringValue(formData, "judgingDeadlineAt"),
    expectedResultAnnouncementAt: stringValue(formData, "expectedResultAnnouncementAt"),
    perParticipantSubmissionLimit: stringValue(formData, "perParticipantSubmissionLimit"),
    maxImagesPerSubmission: stringValue(formData, "maxImagesPerSubmission"),
    reviewRequired: booleanValue(formData, "reviewRequired"),
    anonymousJudging: booleanValue(formData, "anonymousJudging"),
    paymentRequired: booleanValue(formData, "paymentRequired"),
    paymentInstructions: optionalStringValue(formData, "paymentInstructions"),
    paymentChargingMode: stringValue(formData, "paymentChargingMode"),
    groups: groupNames
      .filter((name) => name.length > 0)
      .map((name, displayOrder) => ({
        name,
        displayOrder,
      })),
    criteria: criteriaNames
      .map((name, index) => ({
        name,
        description: criteriaDescriptions[index] || undefined,
      }))
      .filter((criterion) => criterion.name.length > 0)
      .map((criterion, displayOrder) => ({
        ...criterion,
        displayOrder,
      })),
  };
}

function readCoverImageFile(formData: FormData): File | undefined {
  const file = formData.get("coverImage");

  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  return file;
}

async function readActivityRequest(request: Request): Promise<ParsedActivityRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return { values: await request.json() };
  }

  const formData = await request.formData();

  return {
    values: parseActivityFormData(formData),
    coverImageFile: readCoverImageFile(formData),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function issuePathToField(path: PropertyKey[]): string {
  const [scope, index, field] = path;

  if (scope === "groups" && typeof index === "number" && field === "name") {
    return `groupName.${index}`;
  }

  if (scope === "criteria" && typeof index === "number" && field === "name") {
    return `criterionName.${index}`;
  }

  if (scope === "criteria" && typeof index === "number" && field === "description") {
    return `criterionDescription.${index}`;
  }

  return typeof scope === "string" ? scope : "form";
}

function fieldErrorsFromIssues(
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
): FieldErrors {
  const fieldErrors: FieldErrors = {};

  for (const issue of issues) {
    const field = issuePathToField(issue.path);
    fieldErrors[field] ??= issue.message;
  }

  return fieldErrors;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Upload failed. Try again.";
}

export async function POST(request: Request): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, "Sign in as an admin to create activities.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, "Admin access is required.", 403);
  }

  const requestBody = await readActivityRequest(request).catch(() => null);

  if (!requestBody) {
    return validationErrorResponse(request, { form: "Enter valid activity details." }, null);
  }

  const parsed = createActivitySchema.safeParse(requestBody.values);

  if (!parsed.success) {
    return validationErrorResponse(request, fieldErrorsFromIssues(parsed.error.issues), requestBody.values);
  }

  let coverImage: StoredFile | undefined;

  if (requestBody.coverImageFile) {
    try {
      coverImage = await getFileStorage().saveActivityCover({
        activitySlug: parsed.data.slug,
        file: requestBody.coverImageFile,
      });
    } catch (error) {
      return validationErrorResponse(
        request,
        {
          coverImage: errorMessage(error),
        },
        requestBody.values,
      );
    }
  }

  try {
    const activity = await createActivity({
      ...parsed.data,
      coverImage,
    });
    return successResponse(request, activity);
  } catch (error) {
    if (coverImage) {
      await getFileStorage().deleteFile(coverImage).catch((cleanupError: unknown) => {
        console.error("Failed to clean up staged activity cover image", cleanupError);
      });
    }

    if (isUniqueConstraintError(error)) {
      return errorResponse(request, "An activity with this slug already exists.", 409);
    }

    throw error;
  }
}
