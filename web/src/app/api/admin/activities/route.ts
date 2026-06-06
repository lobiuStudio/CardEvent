import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { createActivity } from "@/lib/db/activity-repository";
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

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToNewActivity(request: Request, error: string): NextResponse {
  const url = new URL("/admin/activities/new", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectToAdmin(request: Request, slug: string): NextResponse {
  const url = new URL("/admin", request.url);
  url.searchParams.set("created", slug);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToNewActivity(request, error);
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

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  return parseActivityFormData(await request.formData());
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
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

  const parsed = createActivitySchema.safeParse(await readRequestBody(request).catch(() => null));

  if (!parsed.success) {
    return errorResponse(request, "Enter valid activity details, dates, groups, criteria, and rules.", 400);
  }

  try {
    const activity = await createActivity(parsed.data);
    return successResponse(request, activity);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return errorResponse(request, "An activity with this slug already exists.", 409);
    }

    throw error;
  }
}
