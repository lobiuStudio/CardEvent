import Link from "next/link";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { listPublishedActivities } from "@/lib/db/activity-repository";
import { bilingualLabel, formatBilingualDate, type BilingualCopy } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

type Activity = Awaited<ReturnType<typeof listPublishedActivities>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";
type ActivityBucketId = "open" | "upcoming" | "results" | "review" | "closed";

type ActivityBucket = {
  id: ActivityBucketId;
  title: string;
  description: string;
  activities: Activity[];
};

type ActivityAction = {
  href: string;
  label: BilingualCopy;
  ariaLabel: string;
  variant: "primary" | "secondary";
};

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

function getActivityBucketId(activity: Activity, now: Date): ActivityBucketId {
  if (activity.resultsPublishedAt) {
    return "results";
  }

  if (now < activity.submissionStartAt) {
    return "upcoming";
  }

  if (now <= activity.submissionDeadlineAt) {
    return "open";
  }

  if (now <= activity.expectedResultAnnouncementAt) {
    return "review";
  }

  return "closed";
}

function getBucketSortTime(activity: Activity, bucket: ActivityBucketId): number {
  if (bucket === "open") {
    return activity.submissionDeadlineAt.getTime();
  }

  if (bucket === "upcoming") {
    return activity.submissionStartAt.getTime();
  }

  if (bucket === "results") {
    return activity.resultsPublishedAt?.getTime() ?? 0;
  }

  if (bucket === "review") {
    return activity.expectedResultAnnouncementAt.getTime();
  }

  return activity.submissionDeadlineAt.getTime();
}

function getActivityBuckets(activities: Activity[], now: Date): ActivityBucket[] {
  const buckets: ActivityBucket[] = [
    {
      id: "open",
      title: "Accepting submissions / 接受投稿中",
      description: "Read the rules before submitting. / 投稿前請先查看規則。",
      activities: [],
    },
    {
      id: "upcoming",
      title: "Starting soon / 即將開始",
      description: "These activities are published but not open yet. / 活動已公布，稍後開始投稿。",
      activities: [],
    },
    {
      id: "results",
      title: "Results published / 結果已公布",
      description: "View completed competition results. / 查看已公布的比賽結果。",
      activities: [],
    },
    {
      id: "review",
      title: "Judging or review / 評審或審核中",
      description: "Submissions are closed while organizers finish judging. / 投稿已截止，主辦方正在處理結果。",
      activities: [],
    },
    {
      id: "closed",
      title: "Closed / 已完結",
      description: "Past activities without published results. / 已完結但未有公開結果的活動。",
      activities: [],
    },
  ];

  const byId = new Map(buckets.map((bucket) => [bucket.id, bucket]));

  for (const activity of activities) {
    byId.get(getActivityBucketId(activity, now))?.activities.push(activity);
  }

  for (const bucket of buckets) {
    bucket.activities.sort((left, right) => {
      const direction = bucket.id === "results" || bucket.id === "review" || bucket.id === "closed" ? -1 : 1;
      return (getBucketSortTime(left, bucket.id) - getBucketSortTime(right, bucket.id)) * direction;
    });
  }

  return buckets.filter((bucket) => bucket.activities.length > 0);
}

function getActivityActions(activity: Activity, now: Date): ActivityAction[] {
  const detailsAction: ActivityAction = {
    href: `/activities/${activity.slug}`,
    label: { en: "View rules & details", zh: "查看規則及詳情" },
    ariaLabel: "View rules & details / 查看規則及詳情",
    variant: "primary",
  };

  if (activity.resultsPublishedAt && activity.mode === "competition") {
    return [
      {
        href: `/activities/${activity.slug}/results`,
        label: { en: "View results", zh: "查看結果" },
        ariaLabel: "View results / 查看結果",
        variant: "primary",
      },
      {
        ...detailsAction,
        label: { en: "View activity details", zh: "查看活動詳情" },
        ariaLabel: "View activity details / 查看活動詳情",
        variant: "secondary",
      },
    ];
  }

  if (isSubmissionOpen(activity, now)) {
    return [
      detailsAction,
      {
        href: `/activities/${activity.slug}/submit`,
        label: { en: "Submit card", zh: "提交卡牌" },
        ariaLabel: "Submit card / 提交卡牌",
        variant: "secondary",
      },
    ];
  }

  return [detailsAction];
}

function isSubmissionOpen(activity: Activity, now: Date): boolean {
  return now >= activity.submissionStartAt && now <= activity.submissionDeadlineAt;
}

export default async function ActivitiesPage() {
  const activities = await listPublishedActivities();
  const now = new Date();
  const buckets = getActivityBuckets(activities, now);

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

        {buckets.length ? (
          <div className="grid gap-8" aria-label="Activities">
            {buckets.map((bucket) => (
              <section className="grid gap-4 border-t-2 border-[var(--line)] pt-6 first:border-t-0 first:pt-0" key={bucket.id}>
                <div className="grid gap-1">
                  <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]">{bucket.title}</h2>
                  <p className="text-sm leading-6 text-[var(--ink-muted)]">{bucket.description}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {bucket.activities.map((activity) => {
                    const status = getActivityStatus(activity, now);
                    const mode = formatMode(activity.mode);
                    const actions = getActivityActions(activity, now);
                    const detailHref = `/activities/${activity.slug}`;

                    return (
                      <article
                        className="paper-surface flex min-h-[21rem] flex-col justify-between overflow-hidden rounded-lg border-2 border-[var(--line)] transition hover:-translate-y-1 ink-shadow-sm"
                        key={activity.id}
                      >
                        <div className="flex flex-col gap-4 p-5">
                          {activity.coverImagePublicUrl ? (
                            <Link
                              aria-label={`View ${activity.title} details`}
                              className="-mx-5 -mt-5 block aspect-[16/10] border-b-2 border-[var(--line)] bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-[rgb(255_209_102_/_0.65)]"
                              href={detailHref}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt={`${activity.title} cover image`}
                                className="h-full w-full object-cover"
                                src={activity.coverImagePublicUrl}
                              />
                            </Link>
                          ) : null}

                          <div className="flex items-start justify-between gap-3">
                            <StatusBadge label={status.label} tone={status.tone} />
                            <span className="rounded-full border-2 border-[var(--line)] bg-white px-2.5 py-1 text-xs font-black text-[var(--ink)]">
                              <BilingualText en={mode.en} zh={mode.zh} />
                            </span>
                          </div>

                          <div className="grid gap-2">
                            <h3 className="text-2xl font-black leading-8 text-[var(--ink)]">
                              <Link className="transition hover:text-zinc-700" href={detailHref}>
                                {activity.title}
                              </Link>
                            </h3>
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

                        <div className="mx-5 mb-5 mt-1 grid gap-2">
                          {actions.map((action) => (
                            <Link
                              aria-label={action.ariaLabel}
                              className={
                                action.variant === "primary"
                                  ? "focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
                                  : "focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--sun)]"
                              }
                              href={action.href}
                              key={action.href}
                            >
                              <BilingualText en={action.label.en} zh={action.label.zh} />
                            </Link>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-6 text-[var(--ink-muted)] ink-shadow-sm">
            <BilingualText en="No activities are available yet." zh="暫時未有可參加的活動。" />
          </section>
        )}
      </div>
    </main>
  );
}
