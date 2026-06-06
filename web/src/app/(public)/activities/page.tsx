import Link from "next/link";
import { MobileCardList } from "@/components/mobile/mobile-card-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { listPublishedActivities } from "@/lib/db/activity-repository";

export const runtime = "nodejs";

type Activity = Awaited<ReturnType<typeof listPublishedActivities>>[number];
type StatusTone = "neutral" | "success" | "warning" | "danger";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMode(mode: string): string {
  return mode === "competition" ? "Competition" : "Grading";
}

function getActivityStatus(activity: Activity, now: Date): { label: string; tone: StatusTone } {
  if (activity.resultsPublishedAt) {
    return { label: "Results published", tone: "success" };
  }

  if (now < activity.submissionStartAt) {
    return { label: "Opening soon", tone: "neutral" };
  }

  if (now <= activity.submissionDeadlineAt) {
    return { label: "Open", tone: "success" };
  }

  if (now <= activity.judgingDeadlineAt) {
    return { label: "Judging", tone: "warning" };
  }

  if (now <= activity.expectedResultAnnouncementAt) {
    return { label: "Results pending", tone: "warning" };
  }

  return { label: "Closed", tone: "neutral" };
}

export default async function ActivitiesPage() {
  const activities = await listPublishedActivities();
  const now = new Date();

  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-normal text-zinc-500">CardEvent</p>
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Activities</h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            Open grading and competition activities for card submissions.
          </p>
        </header>

        {activities.length ? (
          <MobileCardList>
            {activities.map((activity) => {
              const status = getActivityStatus(activity, now);

              return (
                <article
                  className="flex min-h-[19rem] flex-col justify-between rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
                  key={activity.id}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <StatusBadge label={status.label} tone={status.tone} />
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                        {formatMode(activity.mode)}
                      </span>
                    </div>

                    <div className="grid gap-2">
                      <h2 className="text-xl font-semibold leading-7 text-zinc-950">{activity.title}</h2>
                      <p className="line-clamp-3 text-sm leading-6 text-zinc-600">{activity.description}</p>
                    </div>

                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="font-medium text-zinc-900">Submissions open</dt>
                        <dd className="mt-0.5 text-zinc-600">{formatDate(activity.submissionStartAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-900">Submission deadline</dt>
                        <dd className="mt-0.5 text-zinc-600">{formatDate(activity.submissionDeadlineAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  <Link
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
                    href={`/activities/${activity.slug}`}
                  >
                    View activity
                  </Link>
                </article>
              );
            })}
          </MobileCardList>
        ) : (
          <section className="rounded-md border border-zinc-200 bg-white p-6 text-zinc-700 shadow-sm">
            No activities are available yet.
          </section>
        )}
      </div>
    </main>
  );
}
