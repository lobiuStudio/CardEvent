import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type AdminJudgesPageProps = {
  params: Promise<{
    activityId: string;
  }>;
  searchParams: Promise<{
    created?: string | string[];
    error?: string | string[];
  }>;
};

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

function invitationUrl(rawToken: string): string {
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "") || "";
  return `${baseUrl}/judge/invite/${rawToken}`;
}

export default async function AdminJudgesPage({ params, searchParams }: AdminJudgesPageProps) {
  await requireRole("admin");

  const [{ activityId }, query] = await Promise.all([params, searchParams]);
  const created = readParam(query.created);
  const error = readParam(query.error);
  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    include: {
      judgeInvitations: {
        orderBy: {
          createdAt: "desc",
        },
      },
      judgeMemberships: {
        include: {
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!activity) {
    return (
      <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-950">Activity not found</h1>
          <Link className="mt-4 inline-flex text-sm font-medium text-zinc-600" href="/admin">
            Back to admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AdminPageShell
      title="Judge invitations"
      description={activity.title}
      backHref="/admin"
      actions={
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          href={`/activities/${activity.slug}?from=admin`}
        >
          View public page
        </Link>
      }
    >
        {created ? (
          <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <p className="font-semibold">Invitation link created</p>
            <a className="mt-2 block break-all font-medium underline" href={invitationUrl(created)}>
              {invitationUrl(created)}
            </a>
          </section>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-950">Create invitation</h2>
          <form className="mt-5 grid gap-4" action={`/api/admin/activities/${activity.id}/judge-invitations`} method="post">
            <FormField id="email" label="Judge email" hint="Optional. Leave blank for a reusable private link until accepted.">
              {({ id, describedBy, invalid }) => (
                <input
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  className={inputClassName}
                  id={id}
                  name="email"
                  type="email"
                />
              )}
            </FormField>
            <Button type="submit">Create invitation link</Button>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Accepted judges</h2>
            <p className="mt-1 text-sm text-zinc-600">{activity.judgeMemberships.length} judges attached.</p>
            <div className="mt-5 grid gap-3">
              {activity.judgeMemberships.length ? (
                activity.judgeMemberships.map((membership) => (
                  <div className="rounded-md bg-zinc-100 p-3 text-sm" key={membership.id}>
                    <p className="font-medium text-zinc-950">{membership.user.displayName}</p>
                    <p className="text-zinc-600">{membership.user.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No judges have accepted yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Recent invitations</h2>
            <div className="mt-5 grid gap-3">
              {activity.judgeInvitations.length ? (
                activity.judgeInvitations.map((invitation) => (
                  <div className="grid gap-2 rounded-md bg-zinc-100 p-3 text-sm" key={invitation.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={invitation.acceptedAt ? "Accepted" : invitation.expiresAt <= new Date() ? "Expired" : "Open"}
                        tone={invitation.acceptedAt ? "success" : invitation.expiresAt <= new Date() ? "danger" : "warning"}
                      />
                      {invitation.email ? <span className="text-zinc-600">{invitation.email}</span> : null}
                    </div>
                    <p className="text-zinc-600">Expires {formatDate(invitation.expiresAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No invitations have been created yet.</p>
              )}
            </div>
          </article>
        </section>
    </AdminPageShell>
  );
}
