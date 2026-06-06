import { NextResponse } from "next/server";
import { hasRole } from "@/lib/auth/rbac";
import { createSameOriginUrl } from "@/lib/auth/redirect";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { publishResults, ResultsNotPublishableError } from "@/lib/db/result-repository";
import { sendEmail } from "@/lib/email/email-service";
import { resultsAvailableEmail } from "@/lib/email/messages";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function redirectToResults(request: Request, activityId: string, key: "error" | "published", value: string): NextResponse {
  const url = createSameOriginUrl(request, `/admin/activities/${activityId}/results`);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

function errorResponse(request: Request, activityId: string, error: string, status: number): NextResponse {
  if (wantsJson(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToResults(request, activityId, "error", error);
}

export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const { activityId } = await params;
  const currentUser = await readSessionUser();

  if (!currentUser) {
    return errorResponse(request, activityId, "Sign in as an admin to publish results.", 401);
  }

  if (!hasRole(currentUser, "admin")) {
    return errorResponse(request, activityId, "Admin access is required.", 403);
  }

  try {
    await publishResults(activityId);
  } catch (error) {
    if (error instanceof ResultsNotPublishableError) {
      return errorResponse(request, activityId, error.message, 409);
    }

    throw error;
  }

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      title: true,
      submissions: {
        where: {
          resultSnapshot: {
            is: {
              publishedAt: {
                not: null,
              },
            },
          },
        },
        select: {
          participant: {
            select: {
              email: true,
            },
          },
        },
      },
    },
  });

  if (activity) {
    const resultUrl = createSameOriginUrl(request, "/account/results").toString();
    const participantEmails = [...new Set(activity.submissions.map((submission) => submission.participant.email))];

    await Promise.all(
      participantEmails.map((email) =>
        sendEmail(
          resultsAvailableEmail({
            to: email,
            activityTitle: activity.title,
            resultUrl,
          }),
        ),
      ),
    );
  }

  if (wantsJson(request)) {
    return NextResponse.json({ published: true });
  }

  return redirectToResults(request, activityId, "published", "1");
}
