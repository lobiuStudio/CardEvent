import Link from "next/link";
import { readSessionUser } from "@/lib/auth/session";
import {
  hashJudgeInvitationToken,
  JudgeInvitationAlreadyAcceptedError,
  JudgeInvitationExpiredError,
  JudgeInvitationNotFoundError,
} from "@/lib/db/judge-repository";
import { prisma } from "@/lib/db/prisma";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export const runtime = "nodejs";

type JudgeInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

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

function errorMessage(error: string): string {
  if (error === JudgeInvitationNotFoundError.name) {
    return "This judge invitation does not exist.";
  }

  if (error === JudgeInvitationExpiredError.name) {
    return "This judge invitation has expired.";
  }

  if (error === JudgeInvitationAlreadyAcceptedError.name) {
    return "This judge invitation has already been accepted.";
  }

  return error;
}

export default async function JudgeInvitePage({ params, searchParams }: JudgeInvitePageProps) {
  const [{ token }, query, user] = await Promise.all([params, searchParams, readSessionUser()]);
  const error = readParam(query.error);
  const invitation = await prisma.judgeInvitation.findUnique({
    where: {
      tokenHash: hashJudgeInvitationToken(token),
    },
    include: {
      activity: {
        select: {
          title: true,
          description: true,
          judgingDeadlineAt: true,
        },
      },
    },
  });
  const returnTo = `/judge/invite/${token}`;

  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <header className="grid gap-3">
          <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href="/">
            Back to home
          </Link>
          <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">Judge invitation</h1>
        </header>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            {errorMessage(error)}
          </p>
        ) : null}

        {!invitation ? (
          <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <StatusBadge label="Invalid" tone="danger" />
            <h2 className="mt-4 text-2xl font-black text-[var(--ink)]">Invitation not found</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
              Ask the organizer for a new judge invitation link.
            </p>
          </section>
        ) : (
          <section className="paper-surface grid gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={invitation.acceptedAt ? "Accepted" : invitation.expiresAt <= new Date() ? "Expired" : "Open"}
                tone={invitation.acceptedAt ? "success" : invitation.expiresAt <= new Date() ? "danger" : "warning"}
              />
              <span className="text-sm font-bold text-[var(--ink-muted)]">
                Expires {formatDate(invitation.expiresAt)}
              </span>
            </div>
            <div className="grid gap-2">
              <h2 className="text-2xl font-black text-[var(--ink)]">{invitation.activity.title}</h2>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">{invitation.activity.description}</p>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                Judging deadline: {formatDate(invitation.activity.judgingDeadlineAt)}
              </p>
            </div>

            {user ? (
              <form action={`/api/judge/invitations/${token}/accept`} method="post">
                <Button className="w-full" disabled={Boolean(invitation.acceptedAt) || invitation.expiresAt <= new Date()} type="submit">
                  Accept judge invitation
                </Button>
              </form>
            ) : (
              <div className="grid gap-3">
                <Link
                  className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white"
                  href={`/account/login?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  Sign in to accept
                </Link>
                <Link
                  className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)]"
                  href={`/account/register?returnTo=${encodeURIComponent(returnTo)}`}
                >
                  Create account to accept
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
