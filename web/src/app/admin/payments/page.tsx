/* eslint-disable @next/next/no-img-element -- Payment proof images come from the app upload route. */
import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { listPendingPaymentProofs } from "@/lib/db/payment-repository";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { MobileCardList } from "@/components/mobile/mobile-card-list";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminPaymentsPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    reviewed?: string | string[];
  }>;
};

type PaymentProof = Awaited<ReturnType<typeof listPendingPaymentProofs>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

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

function formatChargingMode(value: string): string {
  return value === "per_card" ? "Per card" : "Per participant";
}

function PaymentProofCard({ paymentProof }: { paymentProof: PaymentProof }) {
  const submissionImage = paymentProof.submission?.images[0];

  return (
    <article className="grid gap-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={formatStatus(paymentProof.status)} tone={getStatusTone(paymentProof.status)} />
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
            {formatChargingMode(paymentProof.activity.paymentChargingMode)}
          </span>
        </div>
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold leading-7 tracking-normal text-zinc-950">
            {paymentProof.submission?.cardName ?? paymentProof.activity.title}
          </h2>
          <Link
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950"
            href={`/activities/${paymentProof.activity.slug}?from=admin`}
          >
            {paymentProof.activity.title}
          </Link>
        </div>
      </div>

      <a className="grid gap-2 text-sm font-medium text-zinc-600" href={paymentProof.publicUrl}>
        <img
          alt={paymentProof.originalName}
          className="aspect-[4/3] w-full rounded-md border border-zinc-200 object-cover"
          src={paymentProof.publicUrl}
        />
        <span className="break-words">Open proof: {paymentProof.originalName}</span>
      </a>

      <dl className="grid gap-3 text-sm leading-6 text-zinc-600">
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Participant</dt>
          <dd className="text-right">
            {paymentProof.participant.displayName}
            <br />
            <span className="text-xs text-zinc-500">{paymentProof.participant.email}</span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-medium text-zinc-900">Uploaded</dt>
          <dd className="text-right">{formatDate(paymentProof.createdAt)}</dd>
        </div>
        {paymentProof.submission ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-zinc-900">Submission</dt>
              <dd className="text-right">{paymentProof.submission.cardName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium text-zinc-900">Group</dt>
              <dd className="text-right">{paymentProof.submission.group?.name ?? "Ungrouped"}</dd>
            </div>
          </>
        ) : (
          <div className="flex justify-between gap-4">
            <dt className="font-medium text-zinc-900">Scope</dt>
            <dd className="text-right">Participant activity payment</dd>
          </div>
        )}
      </dl>

      {submissionImage ? (
        <a className="grid gap-2 text-xs font-medium text-zinc-600" href={submissionImage.publicUrl}>
          <img
            alt={submissionImage.originalName}
            className="aspect-[4/3] w-full rounded-md border border-zinc-200 object-cover"
            src={submissionImage.publicUrl}
          />
          <span className="break-words">Submission image: {submissionImage.originalName}</span>
        </a>
      ) : null}

      <div className="grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-2">
        <form action={`/api/admin/payments/${paymentProof.id}/review`} method="post">
          <input name="action" type="hidden" value="confirm" />
          <Button className="w-full" type="submit">
            Confirm
          </Button>
        </form>
        <form action={`/api/admin/payments/${paymentProof.id}/review`} method="post">
          <input name="action" type="hidden" value="reject" />
          <Button className="w-full" type="submit" variant="danger">
            Reject
          </Button>
        </form>
      </div>
    </article>
  );
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const error = readParam(params.error);
  const reviewed = readParam(params.reviewed);
  const paymentProofs = await listPendingPaymentProofs();

  return (
    <AdminPageShell
      title="Payment proofs"
      description="Confirm or reject uploaded payment proof images."
      backHref="/admin"
    >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        {reviewed ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            Payment proof marked {formatStatus(reviewed)}.
          </p>
        ) : null}

        {paymentProofs.length ? (
          <MobileCardList>
            {paymentProofs.map((paymentProof) => (
              <PaymentProofCard key={paymentProof.id} paymentProof={paymentProof} />
            ))}
          </MobileCardList>
        ) : (
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">No pending payment proofs</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Every uploaded proof has been handled.</p>
          </section>
        )}
    </AdminPageShell>
  );
}
