import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { listJudgeEligibleSubmissions } from "@/lib/db/judge-repository";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type JudgePageProps = {
  searchParams: Promise<{
    accepted?: string | string[];
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

function formatDeadlineDistance(date: Date): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((date.getTime() - Date.now()) / millisecondsPerDay);

  if (daysRemaining < 0) {
    return "Deadline passed / 已截止";
  }

  if (daysRemaining === 0) {
    return "Due today / 今日截止";
  }

  if (daysRemaining === 1) {
    return "1 day left / 尚餘 1 日";
  }

  return `${daysRemaining} days left / 尚餘 ${daysRemaining} 日`;
}

function formatRemaining(count: number): string {
  if (count === 0) {
    return "All scored / 全部已評";
  }

  return `${count} remaining / 尚餘 ${count} 份`;
}

function prioritizeUnscoredSubmissions<T extends { id: string }>(submissions: T[], completedSubmissionIds: Set<string>): T[] {
  return [...submissions].sort((first, second) => {
    const firstComplete = completedSubmissionIds.has(first.id) ? 1 : 0;
    const secondComplete = completedSubmissionIds.has(second.id) ? 1 : 0;

    return firstComplete - secondComplete;
  });
}

export default async function JudgePage({ searchParams }: JudgePageProps) {
  const user = await requireRole("judge");
  const params = await searchParams;
  const accepted = readParam(params.accepted);
  const memberships = await prisma.judgeMembership.findMany({
    where: {
      userId: user.id,
    },
    include: {
      activity: {
        include: {
          criteria: {
            orderBy: {
              displayOrder: "asc",
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const activitySummaries = await Promise.all(
    memberships.map(async (membership) => {
      const submissions = await listJudgeEligibleSubmissions({
        activityId: membership.activityId,
        judgeId: user.id,
      });
      const scores = submissions.length
        ? await prisma.score.findMany({
            where: {
              judgeId: user.id,
              submissionId: {
                in: submissions.map((submission) => submission.id),
              },
            },
            select: {
              criterionId: true,
              submissionId: true,
            },
          })
        : [];
      const completedSubmissionIds = new Set<string>();

      for (const submission of submissions) {
        const scoredCriteria = new Set(
          scores
            .filter((score) => score.submissionId === submission.id)
            .map((score) => score.criterionId),
        );

        if (scoredCriteria.size === membership.activity.criteria.length) {
          completedSubmissionIds.add(submission.id);
        }
      }

      return {
        membership,
        submissions,
        completedSubmissionIds,
      };
    }),
  );

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-5xl gap-8">
        <header className="grid gap-2">
          <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">Judge dashboard</h1>
          <p className="text-base leading-7 text-[var(--ink-muted)]">Score eligible card submissions for your activities.</p>
        </header>

        {accepted ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            Judge invitation accepted.
          </p>
        ) : null}

        {activitySummaries.length ? (
          <div className="grid gap-5">
            {activitySummaries.map(({ completedSubmissionIds, membership, submissions }) => {
              const sortedSubmissions = prioritizeUnscoredSubmissions(submissions, completedSubmissionIds);
              const nextUnscoredSubmission = sortedSubmissions.find((submission) => !completedSubmissionIds.has(submission.id));
              const completedCount = completedSubmissionIds.size;
              const remainingCount = Math.max(0, submissions.length - completedCount);
              const progressPercent = submissions.length ? Math.round((completedCount / submissions.length) * 100) : 0;

              return (
                <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm" key={membership.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h2 className="text-2xl font-black text-[var(--ink)]">{membership.activity.title}</h2>
                      <p className="text-sm leading-6 text-[var(--ink-muted)]">
                        Deadline: {formatDate(membership.activity.judgingDeadlineAt)}
                      </p>
                      <p className="text-sm font-bold text-[var(--ink)]">
                        {formatDeadlineDistance(membership.activity.judgingDeadlineAt)}
                      </p>
                    </div>
                    <StatusBadge
                      label={`${completedCount}/${submissions.length} complete`}
                      tone={completedCount === submissions.length && submissions.length > 0 ? "success" : "warning"}
                    />
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-black text-[var(--ink)]">
                          {completedCount} of {submissions.length} scored
                        </span>
                        <span className="font-bold text-[var(--ink-muted)]">{formatRemaining(remainingCount)}</span>
                      </div>
                      <div
                        aria-label={`${membership.activity.title} judging progress`}
                        aria-valuemax={submissions.length}
                        aria-valuemin={0}
                        aria-valuenow={completedCount}
                        className="h-3 overflow-hidden rounded-full border-2 border-[var(--line)] bg-white"
                        role="progressbar"
                      >
                        <div className="h-full bg-[var(--jade)]" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>

                    {nextUnscoredSubmission ? (
                      <Link
                        className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--ink)] bg-[var(--ink)] px-4 text-sm font-black text-white"
                        href={`/judge/activities/${membership.activityId}/submissions/${nextUnscoredSubmission.id}`}
                      >
                        Next unscored: {nextUnscoredSubmission.cardName}
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {sortedSubmissions.length ? (
                      sortedSubmissions.map((submission) => (
                        <Link
                          className="grid gap-1 rounded-md border-2 border-[var(--line)] bg-white p-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
                          href={`/judge/activities/${membership.activityId}/submissions/${submission.id}`}
                          key={submission.id}
                        >
                          <span>{submission.cardName}</span>
                          <span className="text-xs font-medium text-[var(--ink-muted)]">
                            {completedSubmissionIds.has(submission.id) ? "Scored / 已評" : "Needs scoring / 未評"}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-[var(--ink-muted)]">No eligible submissions are ready for judging.</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <h2 className="text-xl font-black text-[var(--ink)]">No judging assignments</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Accept a judge invitation to start scoring.</p>
          </section>
        )}
      </div>
    </main>
  );
}
