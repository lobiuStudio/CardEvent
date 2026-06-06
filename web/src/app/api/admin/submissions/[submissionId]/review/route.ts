import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { approveSubmission, rejectSubmission, ReviewSubmissionNotFoundError } from "@/lib/db/review-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToSubmissions(request: Request, key: "error" | "reviewed", value: string): NextResponse {
  const url = createSameOriginUrl(request, "/admin/submissions");
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToSubmissions(request, "error", error);
}

function successResponse(request: Request, submission: { id: string; reviewStatus: string }): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({
      submissionId: submission.id,
      reviewStatus: submission.reviewStatus,
    });
  }

  return redirectToSubmissions(request, "reviewed", submission.reviewStatus);
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  return Object.fromEntries((await request.formData()).entries());
}

function stringValue(body: unknown, name: string): string {
  if (typeof body !== "object" || body === null || !(name in body)) {
    return "";
  }

  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, "Sign in as an admin to review submissions.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, "Admin access is required.", 403);
  }

  const body = await readRequestBody(request).catch(() => null);
  const action = stringValue(body, "action");
  const reason = stringValue(body, "reason");
  const { submissionId } = await params;

  if (action !== "approve" && action !== "reject") {
    return errorResponse(request, "Choose whether to approve or reject this submission.", 400);
  }

  if (reason.length > 500) {
    return errorResponse(request, "Rejection reason must be 500 characters or fewer.", 400);
  }

  try {
    const submission =
      action === "approve"
        ? await approveSubmission(submissionId, currentUser.id)
        : await rejectSubmission(submissionId, currentUser.id, reason);

    return successResponse(request, submission);
  } catch (error) {
    if (error instanceof ReviewSubmissionNotFoundError) {
      return errorResponse(request, "Submission not found.", 404);
    }

    throw error;
  }
}
