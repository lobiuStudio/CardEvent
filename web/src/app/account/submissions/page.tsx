/* eslint-disable @next/next/no-img-element -- Submission image URLs come from pluggable file storage. */
import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { listParticipantSubmissions } from "@/lib/db/submission-repository";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type Submission = Awaited<ReturnType<typeof listParticipantSubmissions>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusTone(value: string): StatusTone {
  if (value === "not_required" || value === "approved" || value === "paid") {
    return "success";
  }

  if (value === "rejected" || value === "failed") {
    return "danger";
  }

  if (value === "pending") {
    return "warning";
  }

  return "neutral";
}

function SubmissionCard({ submission }: { submission: Submission }) {
  const coverImage = submission.images[0];

  return (
    <article className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold leading-7 tracking-normal text-zinc-950">{submission.cardName}</h2>
          <Link
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
            href={`/activities/${submission.activity.slug}`}
          >
            {submission.activity.title}
          </Link>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
          {submission.group?.name ?? "Ungrouped"}
        </span>
      </div>

      {coverImage ? (
        <img
          alt={coverImage.originalName}
          className="aspect-[4/3] w-full rounded-md border border-zinc-200 object-cover"
          src={coverImage.publicUrl}
        />
      ) : null}

      <dl className="grid gap-3 text-sm leading-6 text-zinc-600">
        {submission.gameOrSeries ? (
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-zinc-900">Game or series</dt>
            <dd className="text-right">{submission.gameOrSeries}</dd>
          </div>
        ) : null}
        {submission.characterOrType ? (
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-zinc-900">Character or type</dt>
            <dd className="text-right">{submission.characterOrType}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Submitted</dt>
          <dd className="text-right">{formatDate(submission.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-zinc-900">Review</dt>
          <dd>
            <StatusBadge label={formatStatus(submission.reviewStatus)} tone={getStatusTone(submission.reviewStatus)} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-medium text-zinc-900">Payment</dt>
          <dd>
            <StatusBadge label={formatStatus(submission.paymentStatus)} tone={getStatusTone(submission.paymentStatus)} />
          </dd>
        </div>
      </dl>

      {submission.description ? <p className="text-sm leading-6 text-zinc-600">{submission.description}</p> : null}
    </article>
  );
}

export default async function AccountSubmissionsPage() {
  const user = await requireUser();
  const submissions = await listParticipantSubmissions(user.id);

  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto grid w-full max-w-3xl gap-8">
        <header className="grid gap-2">
          <p className="text-sm font-medium uppercase tracking-normal text-zinc-500">Account</p>
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Your submissions</h1>
          <p className="text-sm leading-6 text-zinc-600">Review your submitted cards, images, and activity statuses.</p>
        </header>

        {submissions.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        ) : (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">No submissions yet</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Open activities are ready for card submissions.</p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              href="/activities"
            >
              Browse activities
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
