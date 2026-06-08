import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import {
  JudgeMembershipRequiredError,
  JudgeScoreCriteriaMismatchError,
  JudgeSubmissionNotFoundError,
  upsertJudgeScores,
} from "@/lib/db/judge-repository";
import { prisma } from "@/lib/db/prisma";
import { judgeScoreSubmissionSchema } from "@/lib/validation/scoring";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    submissionId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToSubmission(request: Request, submissionId: string, key: "error" | "saved", value: string): NextResponse {
  const activityId = new URL(request.url).searchParams.get("activityId");
  const path = activityId ? `/judge/activities/${activityId}/submissions/${submissionId}` : "/judge";
  const url = createSameOriginUrl(request, path);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectToNextSubmission(request: Request, currentSubmissionId: string, nextSubmissionId: string): NextResponse {
  const activityId = new URL(request.url).searchParams.get("activityId");
  const path = activityId ? `/judge/activities/${activityId}/submissions/${nextSubmissionId}` : "/judge";
  const url = createSameOriginUrl(request, path);
  url.searchParams.set("saved", "1");
  url.searchParams.set("savedSubmissionId", currentSubmissionId);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, submissionId: string, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToSubmission(request, submissionId, "error", error);
}

function successResponse(request: Request, submissionId: string, nextSubmissionId?: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({
      saved: true,
      ...(nextSubmissionId ? { nextSubmissionId } : {}),
    });
  }

  if (nextSubmissionId) {
    return redirectToNextSubmission(request, submissionId, nextSubmissionId);
  }

  return redirectToSubmission(request, submissionId, "saved", "1");
}

type ScoreRequestBody = {
  comment?: string;
  nextSubmissionId?: string;
  scores: Array<{
    criterionId: string;
    value: number;
  }>;
};

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  const criterionIds = formData.getAll("criterionId").filter((value): value is string => typeof value === "string");
  const values = formData.getAll("value").filter((value): value is string => typeof value === "string");

  return {
    scores: criterionIds.map((criterionId, index) => ({
      criterionId,
      value: Number(values[index]),
    })),
    comment: typeof formData.get("comment") === "string" ? formData.get("comment") : undefined,
    nextSubmissionId: typeof formData.get("nextSubmissionId") === "string" ? formData.get("nextSubmissionId") : undefined,
  };
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();
  const { submissionId } = await params;

  if (!currentUser) {
    return errorResponse(request, submissionId, "Sign in as a judge to save scores.", 401);
  }

  if (!hasRole(currentUser, "judge")) {
    return errorResponse(request, submissionId, "Judge access is required.", 403);
  }

  const requestBody = (await readRequestBody(request).catch(() => null)) as Partial<ScoreRequestBody> | null;
  const parsed = judgeScoreSubmissionSchema.safeParse(requestBody);

  if (!parsed.success) {
    return errorResponse(request, submissionId, "Enter scores from 0 to 10 using 0.5 increments.", 400);
  }

  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    include: {
      activity: {
        include: {
          criteria: true,
        },
      },
    },
  });

  if (!submission) {
    return errorResponse(request, submissionId, "Submission not found.", 404);
  }

  const requiredCriterionIds = new Set(submission.activity.criteria.map((criterion) => criterion.id));
  const submittedCriterionIds = new Set(parsed.data.scores.map((score) => score.criterionId));

  if (requiredCriterionIds.size !== submittedCriterionIds.size || [...requiredCriterionIds].some((id) => !submittedCriterionIds.has(id))) {
    return errorResponse(request, submissionId, "Score every criterion before saving.", 400);
  }

  try {
    await upsertJudgeScores({
      judgeId: currentUser.id,
      submissionId,
      scores: parsed.data.scores,
      comment: parsed.data.comment,
    });
    return successResponse(request, submissionId, requestBody?.nextSubmissionId?.trim() || undefined);
  } catch (error) {
    if (error instanceof JudgeSubmissionNotFoundError) {
      return errorResponse(request, submissionId, "Submission not found.", 404);
    }

    if (error instanceof JudgeMembershipRequiredError) {
      return errorResponse(request, submissionId, "You are not assigned to this activity.", 403);
    }

    if (error instanceof JudgeScoreCriteriaMismatchError) {
      return errorResponse(request, submissionId, "Scores must match this activity's criteria.", 400);
    }

    throw error;
  }
}
