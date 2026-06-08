import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DeleteActivityForm } from "@/components/admin/delete-activity-form";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminPageProps = {
  searchParams: Promise<{
    created?: string | string[];
    deleted?: string | string[];
    error?: string | string[];
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
  const [submissions, payments, users] = await Promise.all([
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
    prisma.user.count(),
  ]);

  return { payments, submissions, users };
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
  const deleted = readParam(params.deleted);
  const error = readParam(params.error);
  const [activities, queueCounts] = await Promise.all([listRecentActivities(), getPendingAdminQueueCounts()]);
  const now = new Date();

  return (
    <AdminPageShell
      title="Admin"
      description="Activity operations, approvals, payments, judges, and access."
      actions={
        <>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            href="/admin/activities/new"
          >
            New activity
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
            href="/admin/users"
          >
            Users
          </Link>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-500">Activities</p>
          <p className="mt-3 text-3xl font-black text-zinc-950">{activities.length}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Recent items shown below</p>
        </article>
        <article className="rounded-lg border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-500">Pending reviews</p>
          <p className="mt-3 text-3xl font-black text-zinc-950">{queueCounts.submissions}</p>
          <Link className="mt-2 inline-flex text-sm font-semibold text-zinc-700 hover:text-zinc-950" href="/admin/submissions">
            Open reviews
          </Link>
        </article>
        <article className="rounded-lg border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-500">Payment proofs</p>
          <p className="mt-3 text-3xl font-black text-zinc-950">{queueCounts.payments}</p>
          <Link className="mt-2 inline-flex text-sm font-semibold text-zinc-700 hover:text-zinc-950" href="/admin/payments">
            Open payments
          </Link>
        </article>
        <article className="rounded-lg border border-white/80 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-500">Users</p>
          <p className="mt-3 text-3xl font-black text-zinc-950">{queueCounts.users}</p>
          <Link className="mt-2 inline-flex text-sm font-semibold text-zinc-700 hover:text-zinc-950" href="/admin/users">
            Manage users
          </Link>
        </article>
      </section>

      {created ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          Activity created: {created}
        </p>
      ) : null}

      {deleted ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          Activity deleted: {deleted}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-white/80 bg-white shadow-sm">
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

                  <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                      href={`/activities/${activity.slug}?from=admin`}
                    >
                      View
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                      href={`/admin/activities/${activity.id}/judges`}
                    >
                      Judges
                    </Link>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                      href={`/admin/activities/${activity.id}/results`}
                    >
                      Results
                    </Link>
                    <DeleteActivityForm activityId={activity.id} activityTitle={activity.title} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="p-5 text-sm text-zinc-600">No activities have been created yet.</p>
        )}
      </section>
    </AdminPageShell>
  );
}
