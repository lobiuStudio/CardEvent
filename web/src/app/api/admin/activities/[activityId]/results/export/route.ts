import { stringify } from "csv-stringify/sync";
import { hasRole } from "@/lib/auth/rbac";
import { getCrossSiteRequestResponse } from "@/lib/auth/request-security";
import { readSessionUser } from "@/lib/auth/session";
import { buildResultsCsvRows } from "@/lib/domain/result-export";
import { prisma } from "@/lib/db/prisma";
import { buildDraftResults, mapCriterionAverages } from "@/lib/db/result-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    activityId: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const crossSiteResponse = getCrossSiteRequestResponse(request);

  if (crossSiteResponse) {
    return crossSiteResponse;
  }

  const currentUser = await readSessionUser();

  if (!currentUser || !hasRole(currentUser, "admin")) {
    return Response.json({ error: "Admin access is required." }, { status: 403 });
  }

  const { activityId } = await params;
  await buildDraftResults(activityId);
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    include: {
      criteria: true,
      submissions: {
        where: {
          resultSnapshot: {
            isNot: null,
          },
        },
        include: {
          group: true,
          participant: true,
          images: {
            where: {
              active: true,
            },
          },
          resultSnapshot: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!activity) {
    return Response.json({ error: "Activity not found." }, { status: 404 });
  }

  const rows = buildResultsCsvRows(
    activity.submissions.map((submission) => ({
      activityTitle: activity.title,
      mode: activity.mode,
      groupName: submission.group?.name ?? "Ungrouped",
      participantDisplayName: submission.participant.displayName,
      cardName: submission.cardName,
      status: submission.resultSnapshot?.publishedAt ? "completed" : "draft",
      paymentStatus: submission.paymentStatus,
      finalScore: submission.resultSnapshot?.finalScore ?? 0,
      criterionAverages: mapCriterionAverages(submission.resultSnapshot?.criterionAveragesJson ?? "[]", activity.criteria),
      driveLinks: submission.images.map((image) => image.publicUrl),
    })),
  );
  const csv = stringify(rows, { header: true });

  return new Response(csv, {
    headers: {
      "content-disposition": `attachment; filename="${activity.slug}-results.csv"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
