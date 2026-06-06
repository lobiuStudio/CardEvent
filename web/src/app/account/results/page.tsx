/* eslint-disable @next/next/no-img-element -- Result images use the configured submission file storage URLs. */
import Link from "next/link";
import { requireUser } from "@/lib/auth/rbac";
import { getParticipantResults, type ParticipantResult } from "@/lib/db/result-repository";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBilingualDate } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-HK", {
    maximumFractionDigits: 1,
    minimumFractionDigits: score % 1 === 0 ? 0 : 1,
  }).format(score);
}

function formatRank(rank: number | null): string {
  return rank ? `#${rank}` : "-";
}

function ResultCard({ result }: { result: ParticipantResult }) {
  return (
    <article className="paper-surface grid gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <Link
            className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
            href={`/activities/${result.activitySlug}`}
          >
            {result.activityTitle}
          </Link>
          <h2 className="text-2xl font-black leading-8 tracking-normal text-[var(--ink)]">{result.cardName}</h2>
          <p className="text-sm leading-6 text-[var(--ink-muted)]">{result.groupName}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <StatusBadge label="Published / 已公布" tone="success" />
          {result.activityMode === "competition" ? (
            <span className="rounded-full border-2 border-[var(--line)] bg-[var(--mint)] px-2.5 py-1 text-xs font-black text-[var(--ink)]">
              {formatRank(result.rank)}
            </span>
          ) : null}
          <span className="rounded-full border-2 border-[var(--line)] bg-[var(--sun)] px-2.5 py-1 text-xs font-black text-[var(--ink)]">
            {formatScore(result.finalScore)}
          </span>
        </div>
      </div>

      {result.images.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.images.map((image) => (
            <img
              alt={image.originalName}
              className="aspect-[4/3] w-full rounded-md border-2 border-[var(--line)] object-cover"
              key={image.id}
              src={image.publicUrl}
            />
          ))}
        </div>
      ) : null}

      <dl className="grid gap-3 text-sm leading-6 text-[var(--ink-muted)] sm:grid-cols-2">
        <div>
          <dt className="font-black text-[var(--ink)]">
            <BilingualText en="Final score" zh="最終分數" />
          </dt>
          <dd className="mt-1">{formatScore(result.finalScore)}</dd>
        </div>
        {result.activityMode === "competition" ? (
          <div>
            <dt className="font-black text-[var(--ink)]">
              <BilingualText en="Rank" zh="排名" />
            </dt>
            <dd className="mt-1">{formatRank(result.rank)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-black text-[var(--ink)]">
            <BilingualText en="Published" zh="公布時間" />
          </dt>
          <dd className="mt-1">{formatBilingualDate(result.publishedAt)}</dd>
        </div>
      </dl>

      {result.criterionAverages.length ? (
        <section className="border-t-2 border-[var(--line)] pt-4">
          <h3 className="text-base font-black text-[var(--ink)]">
            <BilingualText en="Criterion averages" zh="評分準則平均分" />
          </h3>
          <dl className="mt-3 grid gap-2">
            {result.criterionAverages.map((item) => (
              <div className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2" key={item.criterionId}>
                <dt className="text-sm font-bold text-[var(--ink)]">{item.name}</dt>
                <dd className="text-sm font-black text-[var(--ink)]">{formatScore(item.average)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="border-t-2 border-[var(--line)] pt-4">
        <h3 className="text-base font-black text-[var(--ink)]">
          <BilingualText en="Judge comments" zh="評審評語" />
        </h3>
        {result.judgeComments.length ? (
          <div className="mt-3 grid gap-3">
            {result.judgeComments.map((comment) => (
              <blockquote className="rounded-md bg-white p-3 text-sm leading-6 text-[var(--ink-muted)]" key={comment.id}>
                {comment.comment}
              </blockquote>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            No judge comments were published for this submission.
            <span className="block" lang="zh-HK">
              此投稿未有已公布的評審評語。
            </span>
          </p>
        )}
      </section>
    </article>
  );
}

export default async function AccountResultsPage() {
  const user = await requireUser();
  const results = await getParticipantResults(user.id);

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-4xl gap-8">
        <header className="grid gap-4">
          <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href="/account/submissions">
            <BilingualText en="Back to submissions" zh="返回我的投稿" />
          </Link>
          <div className="grid gap-2">
            <p className="w-fit rounded-full border-2 border-[var(--line)] bg-[var(--sky)] px-3 py-1 text-xs font-black uppercase text-[var(--ink)]">
              <BilingualText en="Account" zh="帳戶" />
            </p>
            <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">
              <BilingualText en="Your results" zh="我的結果" />
            </h1>
            <p className="text-sm leading-6 text-[var(--ink-muted)]">
              Published score details for your submitted cards.
              <span className="block" lang="zh-HK">
                查看你已投稿卡牌的已公布分數詳情。
              </span>
            </p>
          </div>
        </header>

        {results.length ? (
          <div className="grid gap-5">
            {results.map((result) => (
              <ResultCard key={result.submissionId} result={result} />
            ))}
          </div>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <h2 className="text-lg font-black text-[var(--ink)]">
              <BilingualText en="No results yet" zh="暫時未有結果" />
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              Results appear here after an organizer publishes them.
              <span className="block" lang="zh-HK">
                主辦方公布結果後，分數會在此顯示。
              </span>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
