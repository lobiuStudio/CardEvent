import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminPageProps = {
  searchParams: Promise<{
    created?: string | string[];
  }>;
};

type StatusTone = "neutral" | "success" | "warning" | "danger";

async function listRecentActivities() {
  return prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          groups: true,
          criteria: true,
          submissions: true,
        },
      },
    },
    take: 12,
  });
}

async function getPendingAdminQueueCounts() {
  const [submissions, payments] = await Promise.all([
    prisma.submission.count({
      where: {
        deletedAt: null,
        reviewStatus: "pending",
        activity: {
          reviewRequired: true,
        },
      },
    }),
    prisma.paymentProof.count({
      where: {
        status: "pending",
      },
    }),
  ]);

  return { submissions, payments };
}

type AdminActivity = Awaited<ReturnType<typeof listRecentActivities>>[number];

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

function getActivityStatus(activity: AdminActivity, now: Date): { label: string; tone: StatusTone } {
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

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const created = readParam(params.created);
  const [activities, queueCounts] = await Promise.all([listRecentActivities(), getPendingAdminQueueCounts()]);
  const now = new Date();

  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Admin</h1>
            <p className="text-base leading-7 text-zinc-600">Manage activities, submissions, judges, and users.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              href="/admin/activities/new"
            >
              New activity
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              href="/admin/users"
            >
              Users
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              href="/admin/submissions"
            >
              Reviews ({queueCounts.submissions})
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              href="/admin/payments"
            >
              Payments ({queueCounts.payments})
            </Link>
          </div>
        </header>

        {created ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            Activity created: {created}
          </p>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 p-5">
            <h2 className="text-xl font-semibold text-zinc-950">Recent activities</h2>
          </div>

          {activities.length ? (
            <div className="divide-y divide-zinc-200">
              {activities.map((activity) => {
                const status = getActivityStatus(activity, now);

                return (
                  <article className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center" key={activity.id}>
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={status.label} tone={status.tone} />
                        <span className="text-xs font-medium uppercase tracking-normal text-zinc-500">
                          {activity.mode}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-950">{activity.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">{activity.description}</p>
                      </div>
                      <dl className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-zinc-900">Deadline</dt>
                          <dd className="mt-0.5">{formatDate(activity.submissionDeadlineAt)}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-900">Structure</dt>
                          <dd className="mt-0.5">
                            {activity._count.groups} groups, {activity._count.criteria} criteria
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-zinc-900">Submissions</dt>
                          <dd className="mt-0.5">{activity._count.submissions}</dd>
                        </div>
                      </dl>
                    </div>

                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                      href={`/activities/${activity.slug}`}
                    >
                      View
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="p-5 text-sm text-zinc-600">No activities have been created yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
