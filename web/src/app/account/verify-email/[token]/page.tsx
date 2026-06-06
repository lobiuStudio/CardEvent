import Link from "next/link";
import { consumeEmailVerificationToken } from "@/lib/auth/email-verification";

export const runtime = "nodejs";

type VerifyEmailPageProps = {
  params: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({ params }: VerifyEmailPageProps) {
  const { token } = await params;
  const state = await consumeEmailVerificationToken(token);
  const isSuccess = state.status === "success";

  return (
    <main className="flex min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center">
        <div className="rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
          <p className={`text-sm font-semibold ${isSuccess ? "text-green-700" : "text-red-700"}`}>
            {isSuccess ? "Verified" : "Not verified"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-zinc-950">{state.title}</h1>
          <p className="mt-4 text-base leading-7 text-zinc-700">{state.message}</p>
          {isSuccess ? (
            <Link
              className="mt-8 flex min-h-11 w-full items-center justify-center rounded-md bg-zinc-950 px-4 text-base font-semibold text-white transition hover:bg-zinc-800"
              href="/activities"
            >
              Go to activities
            </Link>
          ) : (
            <Link
              className="mt-8 flex min-h-11 w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-base font-semibold text-zinc-950 transition hover:bg-zinc-100"
              href="/account/login"
            >
              Go to sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
