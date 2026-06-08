import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { BilingualText } from "@/components/ui/bilingual-text";
import type { SessionUser } from "@/lib/auth/session";

type AccountPageHeaderProps = {
  actions?: ReactNode;
  activeSection: "results" | "submissions";
  description: {
    en: string;
    zh: string;
  };
  title: {
    en: string;
    zh: string;
  };
  user: SessionUser;
};

const navLinkClassName =
  "focus-ink inline-flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]";

const activeNavLinkClassName =
  "focus-ink inline-flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white";

export function AccountPageHeader({ actions, activeSection, description, title, user }: AccountPageHeaderProps) {
  return (
    <header className="grid gap-5">
      <nav aria-label="Account navigation" className="flex flex-wrap gap-2">
        <Link aria-label="Back to activities / 返回活動列表" className={navLinkClassName} href="/activities">
          <BilingualText en="Back to activities" zh="返回活動列表" />
        </Link>
        <Link
          aria-label="My submissions / 我的投稿"
          aria-current={activeSection === "submissions" ? "page" : undefined}
          className={activeSection === "submissions" ? activeNavLinkClassName : navLinkClassName}
          href="/account/submissions"
        >
          <BilingualText en="My submissions" zh="我的投稿" />
        </Link>
        <Link
          aria-label="Published results / 已公布結果"
          aria-current={activeSection === "results" ? "page" : undefined}
          className={activeSection === "results" ? activeNavLinkClassName : navLinkClassName}
          href="/account/results"
        >
          <BilingualText en="Published results" zh="已公布結果" />
        </Link>
      </nav>

      <section
        aria-label="Current signed-in account"
        className="flex flex-col gap-3 rounded-lg border-2 border-[var(--line)] bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-[var(--ink-muted)]">
            <BilingualText en="Signed in" zh="已登入" />
          </p>
          <p className="mt-1 truncate text-base font-black text-[var(--ink)]">{user.displayName}</p>
          <p className="truncate text-sm font-bold text-[var(--ink-muted)]">{user.email}</p>
        </div>
        <SignOutForm
          buttonClassName="focus-ink min-h-11 rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
        />
      </section>

      <div className="grid gap-2">
        <p className="w-fit rounded-full border-2 border-[var(--line)] bg-[var(--sky)] px-3 py-1 text-xs font-black uppercase text-[var(--ink)]">
          <BilingualText en="Account" zh="帳戶" />
        </p>
        <h1 className="text-4xl font-black tracking-normal text-[var(--ink)]">
          <BilingualText en={title.en} zh={title.zh} />
        </h1>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          {description.en}
          <span className="block" lang="zh-HK">
            {description.zh}
          </span>
        </p>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </header>
  );
}
