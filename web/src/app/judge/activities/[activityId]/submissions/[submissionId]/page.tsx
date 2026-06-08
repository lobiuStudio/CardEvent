import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { listJudgeEligibleSubmissions } from "@/lib/db/judge-repository";
import { prisma } from "@/lib/db/prisma";
import { JudgeScoreFormEnhancer } from "@/components/judge/judge-score-form-enhancer";
import { ScoreButtonGroup } from "@/components/judge/score-button-group";
import { SubmissionImageLightbox } from "@/components/judge/submission-image-lightbox";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type JudgeScoringPageProps = {
  params: Promise<{
    activityId: string;
    submissionId: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
    savedSubmissionId?: string | string[];
  }>;
};

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isSubmissionEligible(submission: {
  deletedAt: Date | null;
  reviewStatus: string;
  paymentStatus: string;
  activity: {
    reviewRequired: boolean;
    paymentRequired: boolean;
  };
}): boolean {
  return (
    !submission.deletedAt &&
    (!submission.activity.reviewRequired || submission.reviewStatus === "approved") &&
    (!submission.activity.paymentRequired || submission.paymentStatus === "confirmed")
  );
}

export default async function JudgeScoringPage({ params, searchParams }: JudgeScoringPageProps) {
  const user = await requireRole("judge");
  const [{ activityId, submissionId }, query] = await Promise.all([params, searchParams]);
  const error = readParam(query.error);
  const saved = readParam(query.saved);
  const savedSubmissionId = readParam(query.savedSubmissionId);
  const [membership, submission, eligibleSubmissions] = await Promise.all([
    prisma.judgeMembership.findUnique({
      where: {
        activityId_userId: {
          activityId,
          userId: user.id,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.submission.findFirst({
      where: {
        id: submissionId,
        activityId,
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
        group: true,
        images: {
          where: {
            active: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        scores: {
          where: {
            judgeId: user.id,
          },
        },
        judgeComments: {
          where: {
            judgeId: user.id,
          },
        },
      },
    }),
    listJudgeEligibleSubmissions({ activityId, judgeId: user.id }),
  ]);

  if (!membership || !submission) {
    notFound();
  }

  if (!isSubmissionEligible(submission)) {
    return (
      <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
        <div className="mx-auto max-w-xl rounded-lg border-2 border-[var(--line)] bg-white p-5">
          <StatusBadge label="Unavailable" tone="danger" />
          <h1 className="mt-4 text-2xl font-black">Submission is not eligible for judging</h1>
          <Link className="mt-5 inline-flex text-sm font-bold text-[var(--ink-muted)]" href="/judge">
            Back to judge dashboard
          </Link>
        </div>
      </main>
    );
  }

  const currentIndex = eligibleSubmissions.findIndex((item) => item.id === submission.id);
  const previousSubmission = currentIndex > 0 ? eligibleSubmissions[currentIndex - 1] : null;
  const nextSubmission = currentIndex >= 0 ? eligibleSubmissions[currentIndex + 1] : null;
  const scoreByCriterionId = new Map(submission.scores.map((score) => [score.criterionId, score.value]));
  const comment = submission.judgeComments[0]?.comment ?? "";
  const draftStorageKey = `cardevent:judge-score:${submission.id}`;
  const clearDraftStorageKey = saved ? `cardevent:judge-score:${savedSubmissionId || submission.id}` : undefined;
  const canRestoreDraft = clearDraftStorageKey !== draftStorageKey;

  return (
    <>
      <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 pb-44 text-[var(--ink)] sm:pb-40">
        <div className="mx-auto grid w-full max-w-5xl gap-8">
          <header className="grid gap-4">
            <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href="/judge">
              Back to judge dashboard
            </Link>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={`${currentIndex + 1}/${eligibleSubmissions.length}`} tone="warning" />
                {submission.group ? <StatusBadge label={submission.group.name} tone="neutral" /> : null}
              </div>
              <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">{submission.cardName}</h1>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">{submission.activity.title}</p>
            </div>
          </header>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {saved ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              Scores saved.
            </p>
          ) : null}

          <SubmissionImageLightbox images={submission.images} />

          <form
            action={`/api/judge/submissions/${submission.id}/scores?activityId=${activityId}`}
            className="grid gap-5"
            id="score-form"
            method="post"
          >
            <section className="paper-surface grid gap-4 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]">Scores</h2>
              <div className="grid gap-4">
                {submission.activity.criteria.map((criterion) => (
                  <ScoreButtonGroup
                    criterionId={criterion.id}
                    description={criterion.description}
                    draftStorageKey={canRestoreDraft ? draftStorageKey : undefined}
                    initialValue={scoreByCriterionId.get(criterion.id)}
                    key={criterion.id}
                    name={criterion.name}
                  />
                ))}
              </div>
            </section>

            <section className="paper-surface grid gap-3 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <label className="text-base font-black text-[var(--ink)]" htmlFor="comment">
                Overall comment
              </label>
              <textarea
                className="min-h-32 rounded-md border-2 border-[var(--line)] bg-white px-3 py-2 text-base text-[var(--ink)] outline-none transition focus:ring-4 focus:ring-[rgb(255_209_102_/_0.55)]"
                defaultValue={comment}
                id="comment"
                maxLength={2000}
                name="comment"
              />
              <JudgeScoreFormEnhancer
                clearStorageKey={clearDraftStorageKey}
                formId="score-form"
                saved={Boolean(saved)}
                storageKey={draftStorageKey}
              />
            </section>
          </form>

          <nav className="grid gap-3 sm:grid-cols-2" aria-label="Submission navigation">
            {previousSubmission ? (
              <Link
                className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)]"
                href={`/judge/activities/${activityId}/submissions/${previousSubmission.id}`}
              >
                Previous: {previousSubmission.cardName}
              </Link>
            ) : (
              <span className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-zinc-300 bg-zinc-100 px-4 text-sm font-bold text-zinc-500">
                First submission
              </span>
            )}
            {nextSubmission ? (
              <Link
                className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)]"
                href={`/judge/activities/${activityId}/submissions/${nextSubmission.id}`}
              >
                Next: {nextSubmission.cardName}
              </Link>
            ) : (
              <span className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-zinc-300 bg-zinc-100 px-4 text-sm font-bold text-zinc-500">
                Last submission
              </span>
            )}
          </nav>
        </div>
      </main>

      <BottomActionBar>
        {nextSubmission ? (
          <Button className="flex-[1.35]" form="score-form" name="nextSubmissionId" type="submit" value={nextSubmission.id}>
            Save and next
          </Button>
        ) : null}
        <Button className="flex-1" form="score-form" type="submit" variant={nextSubmission ? "secondary" : "primary"}>
          Save scores
        </Button>
        <Link
          className="focus-ink inline-flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)]"
          href="/judge"
        >
          Back
        </Link>
      </BottomActionBar>
    </>
  );
}
