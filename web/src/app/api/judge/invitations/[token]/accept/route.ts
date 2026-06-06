import { NextResponse } from "next/server";
import { createSameOriginUrl, getSafeReturnPath } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import {
  acceptJudgeInvitation,
  JudgeInvitationAlreadyAcceptedError,
  JudgeInvitationExpiredError,
  JudgeInvitationNotFoundError,
} from "@/lib/db/judge-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToInvite(request: Request, token: string, error: string): NextResponse {
  const url = createSameOriginUrl(request, `/judge/invite/${token}`);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, token: string, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToInvite(request, token, error);
}

function successResponse(request: Request, activityId: string): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ activityId });
  }

  const url = createSameOriginUrl(request, "/judge");
  url.searchParams.set("accepted", activityId);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { token } = await params;
  const user = await readSessionUser();

  if (!user) {
    const url = createSameOriginUrl(request, "/account/login");
    url.searchParams.set("returnTo", getSafeReturnPath(`/judge/invite/${token}`) ?? "/judge");
    return NextResponse.redirect(url, { status: 303 });
  }

  try {
    const result = await acceptJudgeInvitation({ rawToken: token, userId: user.id });
    return successResponse(request, result.activityId);
  } catch (error) {
    if (error instanceof JudgeInvitationNotFoundError) {
      return errorResponse(request, token, JudgeInvitationNotFoundError.name, 404);
    }

    if (error instanceof JudgeInvitationExpiredError) {
      return errorResponse(request, token, JudgeInvitationExpiredError.name, 410);
    }

    if (error instanceof JudgeInvitationAlreadyAcceptedError) {
      return errorResponse(request, token, JudgeInvitationAlreadyAcceptedError.name, 409);
    }

    throw error;
  }
}
