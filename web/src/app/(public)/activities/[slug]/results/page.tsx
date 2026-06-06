/* eslint-disable @next/next/no-img-element -- Result images use the configured submission file storage URLs. */
import Link from "next/link";
import { notFound } from "next/navigation";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { getPublishedCompetitionResultsBySlug, type PublicResultRow } from "@/lib/db/result-repository";
import { formatBilingualDate } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

type PublicResultsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-HK", {
    maximumFractionDigits: 1,
    minimumFractionDigits: score % 1 === 0 ? 0 : 1,
  }).format(score);
}

function formatRank(rank: number | null): string {
  return rank ? `#${rank}` : "-";
}

function ResultCard({ row }: { row: PublicResultRow }) {
  return (
    <article className="paper-surface grid gap-4 rounded-lg border-2 border-[var(--line)] p-4 ink-shadow-sm">
      {row.imageUrl ? (
        <img
          alt={row.cardName}
          className="aspect-[4/3] w-full rounded-md border-2 border-[var(--line)] object-cover"
          src={row.imageUrl}
        />
      ) : null}
      <div className="grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-sm font-black text-[var(--ink-muted)]">{formatRank(row.rank)}</p>
            <h3 className="text-xl font-black leading-7 text-[var(--ink)]">{row.cardName}</h3>
          </div>
          <span className="shrink-0 rounded-full border-2 border-[var(--line)] bg-[var(--sun)] px-2.5 py-1 text-sm font-black text-[var(--ink)]">
            {formatScore(row.finalScore)}
          </span>
        </div>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{row.authorDisplayName}</p>
      </div>
    </article>
  );
}

export default async function PublicResultsPage({ params }: PublicResultsPageProps) {
  const { slug } = await params;
  const activity = await getPublishedCompetitionResultsBySlug(slug);

  if (!activity) {
    notFound();
  }

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)] sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-8">
        <header className="grid gap-5 py-4">
          <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href={`/activities/${activity.slug}`}>
            <BilingualText en="Back to activity" zh="返回活動" />
          </Link>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="Results published / 結果已公布" tone="success" />
              <span className="rounded-full border-2 border-[var(--line)] bg-white px-2.5 py-1 text-xs font-black text-[var(--ink)]">
                <BilingualText en="Competition" zh="比賽" />
              </span>
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-normal text-[var(--ink)] md:text-6xl">
              {activity.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[var(--ink-muted)]">
              Public ranking results by group.
              <span className="block" lang="zh-HK">
                按組別公布的公開排名結果。
              </span>
            </p>
            <p className="text-sm font-bold text-[var(--ink-muted)]">
              {formatBilingualDate(activity.resultsPublishedAt, "full")}
            </p>
          </div>
        </header>

        {activity.groups.length ? (
          <div className="grid gap-8">
            {activity.groups.map((group) => (
              <section className="border-t-2 border-[var(--line)] pt-7" key={group.id}>
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]">{group.name}</h2>
                  <span className="rounded-full border-2 border-[var(--line)] bg-[var(--mint)] px-2.5 py-1 text-xs font-black text-[var(--ink)]">
                    {group.rows.length} <BilingualText en="cards" zh="份作品" />
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.rows.map((row) => (
                    <ResultCard key={row.submissionId} row={row} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <h2 className="text-lg font-black text-[var(--ink)]">
              <BilingualText en="No ranked cards" zh="未有排名作品" />
            </h2>
          </section>
        )}
      </div>
    </main>
  );
}
