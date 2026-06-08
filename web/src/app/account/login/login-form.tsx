"use client";

import { Suspense, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { BilingualText } from "@/components/ui/bilingual-text";
import { getSafeReturnPath } from "@/lib/auth/redirect";
import { bilingualLabel } from "@/lib/i18n/bilingual";

type CurrentUser = {
  email: string;
  displayName: string;
  roles: string[];
};

type LoginFormProps = {
  currentUser: CurrentUser | null;
};

type AuthResponse = {
  error?: string;
  redirectTo?: string;
};

const inputClassName =
  "min-h-12 w-full rounded-md border-2 border-[var(--line)] bg-white px-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--line)] focus:ring-4 focus:ring-[rgb(255_209_102_/_0.55)]";

const secondaryButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]";

function getCurrentUserHomeHref(user: CurrentUser): string {
  if (user.roles.includes("admin")) {
    return "/admin";
  }

  if (user.roles.includes("judge")) {
    return "/judge";
  }

  return "/account/submissions";
}

function getCurrentUserHomeLabel(user: CurrentUser): string {
  if (user.roles.includes("admin")) {
    return "Continue to admin / 進入後台";
  }

  if (user.roles.includes("judge")) {
    return "Continue to judge dashboard / 進入評審頁";
  }

  return "Continue to account / 進入帳戶";
}

function ActiveSessionPanel({ currentUser }: { currentUser: CurrentUser }) {
  return (
    <section className="paper-surface mb-5 grid gap-3 rounded-lg border-2 border-[var(--line)] p-4 text-sm ink-shadow-sm">
      <div>
        <p className="font-black text-[var(--ink)]">Signed in as {currentUser.email}</p>
        <p className="mt-1 leading-6 text-[var(--ink-muted)]">
          Use this account, or sign out first if you want to switch accounts.
          <span className="block" lang="zh-HK">
            你而家已經登入咗呢個帳戶；如果要轉帳戶，先按登出。
          </span>
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Link className={secondaryButtonClassName} href={getCurrentUserHomeHref(currentUser)}>
          {getCurrentUserHomeLabel(currentUser)}
        </Link>
        <SignOutForm
          buttonClassName="min-h-11 w-full rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
        />
      </div>
    </section>
  );
}

function LoginFormContent({ currentUser }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const returnTo = getSafeReturnPath(searchParams.get("returnTo"));
  const registerHref = returnTo ? `/account/register?returnTo=${encodeURIComponent(returnTo)}` : "/account/register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as AuthResponse | null;

      if (!response.ok) {
        setError(payload?.error ?? "Login failed.");
        return;
      }

      if (payload?.redirectTo) {
        router.push(payload.redirectTo);
        router.refresh();
        return;
      }

      setError("Login completed, but the next page was not returned.");
    } catch {
      setError("Login failed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="cardevent-shell flex min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <Link className="mb-5 inline-flex text-sm font-bold text-[var(--ink-muted)] hover:text-[var(--ink)]" href="/">
            <BilingualText en="Back to home" zh="返回首頁" />
          </Link>
          <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">
            <BilingualText en="Sign in" zh="登入" />
          </h1>
          <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
            Access your CardEvent account.
            <span className="block" lang="zh-HK">
              登入你的 CardEvent 帳戶。
            </span>
          </p>
        </div>

        {currentUser ? <ActiveSessionPanel currentUser={currentUser} /> : null}

        <form className="paper-surface flex flex-col gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm" onSubmit={handleSubmit} noValidate>
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--ink)]" htmlFor="email">
              <BilingualText en="Email" zh="電郵" />
            </label>
            <input className={inputClassName} id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-[var(--ink)]" htmlFor="password">
              <BilingualText en="Password" zh="密碼" />
            </label>
            <input
              className={inputClassName}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <p className="min-h-6 text-sm text-red-700" role="alert" aria-live="polite">
            {error}
          </p>

          <button
            className="focus-ink min-h-12 w-full rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-base font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? bilingualLabel({ en: "Signing in...", zh: "登入中..." }) : bilingualLabel({ en: "Sign in", zh: "登入" })}
          </button>
          <Link className="text-center text-sm font-bold text-[var(--ink-muted)] hover:text-[var(--ink)]" href={registerHref}>
            <BilingualText en="Create a participant account" zh="建立參加者帳戶" />
          </Link>
        </form>
      </section>
    </main>
  );
}

export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense>
      <LoginFormContent {...props} />
    </Suspense>
  );
}
