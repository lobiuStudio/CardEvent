import { NextResponse } from "next/server";
import { z } from "zod";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { createJudgeInvitation } from "@/lib/db/judge-repository";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/email-service";
import { judgeInvitationEmail } from "@/lib/email/messages";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

const invitationSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
});

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToJudges(request: Request, activityId: string, key: "created" | "error", value: string): NextResponse {
  const url = createSameOriginUrl(request, `/admin/activities/${activityId}/judges`);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, activityId: string, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToJudges(request, activityId, "error", error);
}

function successResponse(request: Request, activityId: string, rawToken: string): NextResponse {
  const invitationPath = `/judge/invite/${rawToken}`;

  if (wantsJson(request)) {
    return NextResponse.json({ invitationPath, rawToken });
  }

  return redirectToJudges(request, activityId, "created", rawToken);
}

async function readRequestBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  return Object.fromEntries((await request.formData()).entries());
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { activityId } = await params;
  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, activityId, "Sign in as an admin to invite judges.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, activityId, "Admin access is required.", 403);
  }

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!activity) {
    return errorResponse(request, activityId, "Activity not found.", 404);
  }

  const parsed = invitationSchema.safeParse(await readRequestBody(request).catch(() => null));

  if (!parsed.success) {
    return errorResponse(request, activityId, "Enter a valid judge email or leave it blank.", 400);
  }

  const invitation = await createJudgeInvitation({
    activityId,
    email: parsed.data.email || undefined,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const judgeEmail = parsed.data.email?.trim().toLowerCase();

  if (judgeEmail) {
    await sendEmail(
      judgeInvitationEmail({
        to: judgeEmail,
        activityTitle: activity.title,
        inviteUrl: createSameOriginUrl(request, `/judge/invite/${invitation.rawToken}`).toString(),
      }),
    );
  }

  return successResponse(request, activityId, invitation.rawToken);
}
