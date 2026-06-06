"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BilingualText } from "@/components/ui/bilingual-text";
import { bilingualLabel } from "@/lib/i18n/bilingual";

type AuthResponse = {
  error?: string;
  redirectTo?: string;
};

const inputClassName =
  "min-h-12 w-full rounded-md border-2 border-[var(--line)] bg-white px-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--line)] focus:ring-4 focus:ring-[rgb(255_209_102_/_0.55)]";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        <form className="paper-surface flex flex-col gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm" onSubmit={handleSubmit} noValidate>
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
          <Link className="text-center text-sm font-bold text-[var(--ink-muted)] hover:text-[var(--ink)]" href="/account/register">
            <BilingualText en="Create a participant account" zh="建立參加者帳戶" />
          </Link>
        </form>
      </section>
    </main>
  );
}
