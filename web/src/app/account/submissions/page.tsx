/* eslint-disable @next/next/no-img-element -- Submission image URLs come from pluggable file storage. */
import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { listParticipantSubmissions } from "@/lib/db/submission-repository";
import { SubmissionNextAction } from "@/components/participant/submission-next-action";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { bilingualLabel, formatBilingualDate } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

type Submission = Awaited<ReturnType<typeof listParticipantSubmissions>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

function formatStatus(value: string): string {
  const labels: Record<string, string> = {
    approved: bilingualLabel({ en: "Approved", zh: "已通過" }),
    confirmed: bilingualLabel({ en: "Confirmed", zh: "已確認" }),
    failed: bilingualLabel({ en: "Failed", zh: "失敗" }),
    not_required: bilingualLabel({ en: "Not required", zh: "不需要" }),
    paid: bilingualLabel({ en: "Paid", zh: "已付款" }),
    pending: bilingualLabel({ en: "Pending", zh: "待處理" }),
    rejected: bilingualLabel({ en: "Rejected", zh: "已拒絕" }),
  };

  return labels[value] ?? value;
}

function getStatusTone(value: string): StatusTone {
  if (value === "not_required" || value === "approved" || value === "confirmed" || value === "paid") {
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
    <article className="paper-surface grid gap-4 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="text-xl font-black leading-7 tracking-normal text-[var(--ink)]">{submission.cardName}</h2>
          <Link
            className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
            href={`/activities/${submission.activity.slug}`}
          >
            {submission.activity.title}
          </Link>
        </div>
        <span className="shrink-0 rounded-full border-2 border-[var(--line)] bg-[var(--mint)] px-2.5 py-1 text-xs font-black text-[var(--ink)]">
          {submission.group?.name ?? bilingualLabel({ en: "Ungrouped", zh: "未分組" })}
        </span>
      </div>

      {coverImage ? (
        <img
          alt={coverImage.originalName}
          className="aspect-[4/3] w-full rounded-md border-2 border-[var(--line)] object-cover"
          src={coverImage.publicUrl}
        />
      ) : null}

      <dl className="grid gap-3 text-sm leading-6 text-[var(--ink-muted)]">
        {submission.gameOrSeries ? (
          <div className="flex justify-between gap-4">
            <dt className="font-black text-[var(--ink)]">
              <BilingualText en="Game or series" zh="遊戲或系列" />
            </dt>
            <dd className="text-right">{submission.gameOrSeries}</dd>
          </div>
        ) : null}
        {submission.characterOrType ? (
          <div className="flex justify-between gap-4">
            <dt className="font-black text-[var(--ink)]">
              <BilingualText en="Character or type" zh="角色或類型" />
            </dt>
            <dd className="text-right">{submission.characterOrType}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="font-black text-[var(--ink)]">
            <BilingualText en="Submitted" zh="提交時間" />
          </dt>
          <dd className="text-right">{formatBilingualDate(submission.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-black text-[var(--ink)]">
            <BilingualText en="Review" zh="審核" />
          </dt>
          <dd>
            <StatusBadge label={formatStatus(submission.reviewStatus)} tone={getStatusTone(submission.reviewStatus)} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="font-black text-[var(--ink)]">
            <BilingualText en="Payment" zh="付款" />
          </dt>
          <dd>
            <StatusBadge label={formatStatus(submission.paymentStatus)} tone={getStatusTone(submission.paymentStatus)} />
          </dd>
        </div>
      </dl>

      {submission.description ? <p className="text-sm leading-6 text-[var(--ink-muted)]">{submission.description}</p> : null}

      <SubmissionNextAction
        activityId={submission.activityId}
        chargingMode={submission.activity.paymentChargingMode === "per_card" ? "per_card" : "per_participant"}
        paymentInstructions={submission.activity.paymentInstructions}
        paymentRequired={submission.activity.paymentRequired}
        paymentStatus={submission.paymentStatus}
        reviewStatus={submission.reviewStatus}
        submissionId={submission.id}
      />
    </article>
  );
}

export default async function AccountSubmissionsPage() {
  const user = await requireUser();
  const submissions = await listParticipantSubmissions(user.id);

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-3xl gap-8">
        <header className="grid gap-2">
          <p className="w-fit rounded-full border-2 border-[var(--line)] bg-[var(--sky)] px-3 py-1 text-xs font-black uppercase text-[var(--ink)]">
            <BilingualText en="Account" zh="帳戶" />
          </p>
          <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">
            <BilingualText en="Your submissions" zh="我的投稿" />
          </h1>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">
            Review your submitted cards, images, and activity statuses.
            <span className="block" lang="zh-HK">
              查看你提交的卡牌、圖片及活動狀態。
            </span>
          </p>
          <Link
            className="focus-ink w-fit rounded-md border-2 border-[var(--line)] bg-white px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
            href="/account/results"
          >
            <BilingualText en="View published results" zh="查看已公布結果" />
          </Link>
        </header>

        {submissions.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <h2 className="text-lg font-black text-[var(--ink)]">
              <BilingualText en="No submissions yet" zh="暫時未有投稿" />
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              Open activities are ready for card submissions.
              <span className="block" lang="zh-HK">
                你可以在開放中的活動提交卡牌。
              </span>
            </p>
            <Link
              className="focus-ink mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
              href="/activities"
            >
              <BilingualText en="Browse activities" zh="瀏覽活動" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
