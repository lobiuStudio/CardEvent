import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { buildDraftResults, getResultReview, type ResultReviewRow } from "@/lib/db/result-repository";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminResultsPageProps = {
  params: Promise<{
    activityId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    published?: string | string[];
  }>;
};

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    minimumFractionDigits: score % 1 === 0 ? 0 : 1,
  }).format(score);
}

function formatRank(rank: number | null): string {
  return rank ? `#${rank}` : "Not ranked";
}

function groupRows(rows: ResultReviewRow[]): Array<{ groupName: string; rows: ResultReviewRow[] }> {
  const groups = new Map<string, ResultReviewRow[]>();

  for (const row of rows) {
    groups.set(row.groupName, [...(groups.get(row.groupName) ?? []), row]);
  }

  return [...groups.entries()].map(([groupName, groupRows]) => ({ groupName, rows: groupRows }));
}

export default async function AdminResultsPage({ params, searchParams }: AdminResultsPageProps) {
  await requireRole("admin");

  const [{ activityId }, query] = await Promise.all([params, searchParams]);
  const error = readParam(query.error);
  const published = readParam(query.published);

  await buildDraftResults(activityId);

  const [activity, review] = await Promise.all([
    prisma.activity.findUnique({
      where: {
        id: activityId,
      },
      select: {
        id: true,
        title: true,
        mode: true,
        resultsPublishedAt: true,
      },
    }),
    getResultReview(activityId),
  ]);

  if (!activity) {
    notFound();
  }

  const rowsByGroup = groupRows(review.rows);
  const isPublished = Boolean(activity.resultsPublishedAt);
  const canPublish = review.canPublish && !isPublished;

  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-3">
            <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href="/admin">
              Back to admin
            </Link>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Results</h1>
              <p className="text-base leading-7 text-zinc-600">{activity.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={isPublished ? "Published" : review.canPublish ? "Ready to publish" : "Scores missing"} tone={isPublished || review.canPublish ? "success" : "warning"} />
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-normal text-zinc-500 ring-1 ring-zinc-200">
                {activity.mode}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {review.rows.length ? (
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                href={`/api/admin/activities/${activity.id}/results/export`}
              >
                Export CSV
              </Link>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-100 px-4 text-sm font-medium text-zinc-500 ring-1 ring-zinc-200">
                Export CSV
              </span>
            )}
          </div>
        </header>

        {published ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Results have been published.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">Draft result rows</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">{review.rows.length}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">Missing judge-submission pairs</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">{review.missingJudgeSubmissionPairs}</p>
          </article>
          <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-zinc-600">Published at</p>
            <p className="mt-2 text-base font-semibold leading-7 text-zinc-950">
              {activity.resultsPublishedAt ? formatDate(activity.resultsPublishedAt) : "Not published"}
            </p>
          </article>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-2">
            <h2 className="text-xl font-semibold text-zinc-950">Publish confirmation</h2>
            <p className="text-sm leading-6 text-zinc-600">
              Publishing locks the public result link for competition activities and makes each participant&apos;s private
              score details available in their account. The button stays disabled until every eligible submission has a
              complete score set from every assigned judge.
            </p>
          </div>
          <form className="mt-5" action={`/api/admin/activities/${activity.id}/results/publish`} method="post">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
              disabled={!canPublish}
              type="submit"
            >
              {isPublished ? "Published" : "Publish results"}
            </button>
          </form>
        </section>

        <section className="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5">
            <h2 className="text-xl font-semibold text-zinc-950">Result preview</h2>
            <p className="mt-1 text-sm text-zinc-600">Draft scores are recalculated from complete judge scores.</p>
          </div>

          {rowsByGroup.length ? (
            <div className="divide-y divide-zinc-200">
              {rowsByGroup.map((group) => (
                <section className="p-5" key={group.groupName}>
                  <h3 className="text-base font-semibold text-zinc-950">{group.groupName}</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[42rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500">
                          <th className="py-2 pr-4 font-medium">Rank</th>
                          <th className="px-4 py-2 font-medium">Card</th>
                          <th className="px-4 py-2 font-medium">Participant</th>
                          <th className="py-2 pl-4 text-right font-medium">Final score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {group.rows.map((row) => (
                          <tr key={row.submissionId}>
                            <td className="py-3 pr-4 font-medium text-zinc-950">{formatRank(row.rank)}</td>
                            <td className="px-4 py-3 text-zinc-950">{row.cardName}</td>
                            <td className="px-4 py-3 text-zinc-600">{row.participantDisplayName}</td>
                            <td className="py-3 pl-4 text-right font-semibold text-zinc-950">{formatScore(row.finalScore)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm leading-6 text-zinc-600">
              No draft result rows are available yet. Eligible submissions appear here after every criterion has been
              scored by every assigned judge.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
