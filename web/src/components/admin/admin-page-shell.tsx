import type { ReactNode } from "react";
import Link from "next/link";
import { SignOutForm } from "@/components/auth/sign-out-form";

type AdminPageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  children: ReactNode;
};

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/activities/new", label: "New activity" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/submissions", label: "Reviews" },
  { href: "/admin/payments", label: "Payments" },
];

export function AdminPageShell({
  actions,
  backHref,
  backLabel = "Back to admin / 返回後台",
  children,
  description,
  eyebrow = "Admin workspace",
  title,
}: AdminPageShellProps) {
  return (
    <main className="min-h-dvh flex-1 bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_44%,#ecfeff_100%)] px-4 py-6 text-zinc-950 sm:px-6">
      <div className="mx-auto grid min-w-0 w-full max-w-7xl gap-6">
        <nav
          className="sticky top-0 z-10 -mx-4 border-b border-white/70 bg-white/82 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6"
          aria-label="Admin navigation"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  className="inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <SignOutForm
              buttonClassName="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 lg:w-auto"
            />
          </div>
        </nav>

        <header className="grid gap-5 border-b border-zinc-200/70 pb-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="grid gap-3">
            {backHref ? (
              <Link className="w-fit text-sm font-semibold text-zinc-600 transition hover:text-zinc-950" href={backHref}>
                {backLabel}
              </Link>
            ) : null}
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">{eyebrow}</p>
              <h1 className="text-3xl font-black tracking-normal text-zinc-950 sm:text-4xl">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">{description}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-col gap-2 sm:flex-row md:justify-end">{actions}</div> : null}
        </header>

        {children}
      </div>
    </main>
  );
}
