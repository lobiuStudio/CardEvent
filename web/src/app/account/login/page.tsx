"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AuthResponse = {
  error?: string;
  redirectTo?: string;
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200";

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
    <main className="flex min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Sign in</h1>
          <p className="mt-2 text-base text-zinc-600">Access your CardEvent account.</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-900" htmlFor="email">
              Email
            </label>
            <input className={inputClassName} id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-900" htmlFor="password">
              Password
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
            className="min-h-11 w-full rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
