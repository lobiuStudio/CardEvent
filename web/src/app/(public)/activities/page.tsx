import Link from "next/link";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { listPublishedActivities } from "@/lib/db/activity-repository";
import { bilingualLabel, formatBilingualDate, type BilingualCopy } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

type Activity = Awaited<ReturnType<typeof listPublishedActivities>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

function formatMode(mode: string): BilingualCopy {
  return mode === "competition" ? { en: "Competition", zh: "比賽" } : { en: "Grading", zh: "評審" };
}

function getActivityStatus(activity: Activity, now: Date): { label: string; tone: StatusTone } {
  if (activity.resultsPublishedAt) {
    return { label: bilingualLabel({ en: "Results published", zh: "結果已公布" }), tone: "success" };
  }

  if (now < activity.submissionStartAt) {
    return { label: bilingualLabel({ en: "Opening soon", zh: "即將開始" }), tone: "neutral" };
  }

  if (now <= activity.submissionDeadlineAt) {
    return { label: bilingualLabel({ en: "Open", zh: "接受投稿" }), tone: "success" };
  }

  if (now <= activity.judgingDeadlineAt) {
    return { label: bilingualLabel({ en: "Judging", zh: "評審中" }), tone: "warning" };
  }

  if (now <= activity.expectedResultAnnouncementAt) {
    return { label: bilingualLabel({ en: "Results pending", zh: "等待結果" }), tone: "warning" };
  }

  return { label: bilingualLabel({ en: "Closed", zh: "已截止" }), tone: "neutral" };
}

export default async function ActivitiesPage() {
  const activities = await listPublishedActivities();
  const now = new Date();

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="grid gap-4 py-4">
          <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href="/">
            <BilingualText en="Back to home" zh="返回首頁" />
          </Link>
          <div className="grid gap-3">
            <p className="w-fit rounded-full border-2 border-[var(--line)] bg-[var(--sun)] px-3 py-1 text-xs font-black uppercase text-[var(--ink)] ink-shadow-sm">
              <BilingualText en="CardEvent calendar" zh="活動日曆" />
            </p>
            <h1 className="text-4xl font-black tracking-normal text-[var(--ink)] sm:text-6xl">
              <BilingualText en="Activities" zh="活動列表" />
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--ink-muted)]">
              Open grading and competition activities for hand-drawn card submissions.
              <span className="block" lang="zh-HK">
                查看正在接受投稿的手繪卡牌評審及比賽活動。
              </span>
            </p>
          </div>
        </header>

        {activities.length ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Activities">
            {activities.map((activity) => {
              const status = getActivityStatus(activity, now);
              const mode = formatMode(activity.mode);

              return (
                <article
                  className="paper-surface flex min-h-[21rem] flex-col justify-between rounded-lg border-2 border-[var(--line)] p-5 transition hover:-translate-y-1 ink-shadow-sm"
                  key={activity.id}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <StatusBadge label={status.label} tone={status.tone} />
                      <span className="rounded-full border-2 border-[var(--line)] bg-white px-2.5 py-1 text-xs font-black text-[var(--ink)]">
                        <BilingualText en={mode.en} zh={mode.zh} />
                      </span>
                    </div>

                    <div className="grid gap-2">
                      <h2 className="text-2xl font-black leading-8 text-[var(--ink)]">{activity.title}</h2>
                      <p className="line-clamp-3 text-sm leading-6 text-[var(--ink-muted)]">{activity.description}</p>
                    </div>

                    <dl className="grid gap-3 text-sm">
                      <div>
                        <dt className="font-black text-[var(--ink)]">
                          <BilingualText en="Submissions open" zh="投稿開始" />
                        </dt>
                        <dd className="mt-1 leading-6 text-[var(--ink-muted)]">
                          {formatBilingualDate(activity.submissionStartAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black text-[var(--ink)]">
                          <BilingualText en="Submission deadline" zh="投稿截止" />
                        </dt>
                        <dd className="mt-1 leading-6 text-[var(--ink-muted)]">
                          {formatBilingualDate(activity.submissionDeadlineAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <Link
                    className="focus-ink mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
                    href={`/activities/${activity.slug}`}
                  >
                    <BilingualText en="View activity" zh="查看活動" />
                  </Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-6 text-[var(--ink-muted)] ink-shadow-sm">
            <BilingualText en="No activities are available yet." zh="暫時未有可參加的活動。" />
          </section>
        )}
      </div>
    </main>
  );
}
