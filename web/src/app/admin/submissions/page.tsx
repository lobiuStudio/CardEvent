/* eslint-disable @next/next/no-img-element -- Submission images come from the app upload route. */
import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { listPendingReviewSubmissions } from "@/lib/db/review-repository";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { FormField } from "@/components/forms/form-field";
import { MobileCardList } from "@/components/mobile/mobile-card-list";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminSubmissionsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    reviewed?: string | string[];
  }>;
};

type ReviewSubmission = Awaited<ReturnType<typeof listPendingReviewSubmissions>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

const inputClassName =
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200";

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

function formatStatus(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusTone(value: string): StatusTone {
  if (value === "not_required" || value === "approved" || value === "confirmed") {
    return "success";
  }

  if (value === "rejected") {
    return "danger";
  }

  if (value === "pending") {
    return "warning";
  }

  return "neutral";
}

function SubmissionReviewCard({ submission }: { submission: ReviewSubmission }) {
  return (
    <article className="grid gap-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={formatStatus(submission.reviewStatus)} tone={getStatusTone(submission.reviewStatus)} />
          <StatusBadge label={`Payment ${formatStatus(submission.paymentStatus)}`} tone={getStatusTone(submission.paymentStatus)} />
        </div>
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold leading-7 tracking-normal text-zinc-950">{submission.cardName}</h2>
          <Link
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
            href={`/activities/${submission.activity.slug}?from=admin`}
          >
            {submission.activity.title}
          </Link>
        </div>
      </div>

      {submission.images.length ? (
        <div className="grid grid-cols-2 gap-3">
          {submission.images.map((image) => (
            <a className="grid gap-2 text-xs font-medium text-zinc-600" href={image.publicUrl} key={image.id}>
              <img
                alt={image.originalName}
                className="aspect-[4/3] w-full rounded-md border border-zinc-200 object-cover"
                src={image.publicUrl}
              />
              <span className="break-words">{image.originalName}</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-zinc-100 p-3 text-sm text-zinc-600">No active images.</p>
      )}

      <dl className="grid gap-3 text-sm leading-6 text-zinc-600">
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Participant</dt>
          <dd className="text-right">
            {submission.participant.displayName}
            <br />
            <span className="text-xs text-zinc-500">{submission.participant.email}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Group</dt>
          <dd className="text-right">{submission.group?.name ?? "Ungrouped"}</dd>
        </div>
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
        {submission.authorDisplayName ? (
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-zinc-900">Display name</dt>
            <dd className="text-right">{submission.authorDisplayName}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Submitted</dt>
          <dd className="text-right">{formatDate(submission.createdAt)}</dd>
        </div>
      </dl>

      {submission.description ? <p className="text-sm leading-6 text-zinc-600">{submission.description}</p> : null}

      {submission.rejectionReason ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
          {submission.rejectionReason}
        </p>
      ) : null}

      <div className="grid gap-3 border-t border-zinc-200 pt-4">
        <form action={`/api/admin/submissions/${submission.id}/review`} method="post">
          <input name="action" type="hidden" value="approve" />
          <Button className="w-full" type="submit">
            Approve
          </Button>
        </form>

        <form action={`/api/admin/submissions/${submission.id}/review`} className="grid gap-3" method="post">
          <input name="action" type="hidden" value="reject" />
          <FormField hint="Optional, up to 500 characters." id={`reason-${submission.id}`} label="Rejection reason">
            {({ id, describedBy, invalid }) => (
              <textarea
                aria-describedby={describedBy}
                aria-invalid={invalid}
                className={`${inputClassName} min-h-24 py-3 leading-6`}
                id={id}
                maxLength={500}
                name="reason"
              />
            )}
          </FormField>
          <Button className="w-full" type="submit" variant="danger">
            Reject
          </Button>
        </form>
      </div>
    </article>
  );
}

export default async function AdminSubmissionsPage({ searchParams }: AdminSubmissionsPageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const error = readParam(params.error);
  const reviewed = readParam(params.reviewed);
  const submissions = await listPendingReviewSubmissions();

  return (
    <AdminPageShell
      title="Submission review"
      description="Review cards that are waiting for organizer approval."
      backHref="/admin"
    >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {reviewed ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            Submission marked {formatStatus(reviewed)}.
          </p>
        ) : null}

        {submissions.length ? (
          <MobileCardList>
            {submissions.map((submission) => (
              <SubmissionReviewCard key={submission.id} submission={submission} />
            ))}
          </MobileCardList>
        ) : (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">No pending submissions</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Every required review has been handled.</p>
          </section>
        )}
    </AdminPageShell>
  );
}
