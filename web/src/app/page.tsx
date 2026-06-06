import Link from "next/link";
import { BilingualText } from "@/components/ui/bilingual-text";
import { bilingualLabel, type BilingualCopy } from "@/lib/i18n/bilingual";

type PreviewLink = {
  href: string;
  label: BilingualCopy;
  eyebrow: BilingualCopy;
  title: BilingualCopy;
  description: BilingualCopy;
  colorClassName: string;
};

const previewLinks: PreviewLink[] = [
  {
    href: "/activities",
    label: { en: "Browse activities", zh: "瀏覽活動" },
    eyebrow: { en: "Public", zh: "公開頁面" },
    title: { en: "Activities", zh: "活動列表" },
    description: {
      en: "Explore live grading and competition pages with clear deadlines, rules, and submission entry points.",
      zh: "查看公開評審及比賽活動，包含截止日期、規則及投稿入口。",
    },
    colorClassName: "bg-[var(--mint)]",
  },
  {
    href: "/account/login",
    label: { en: "Sign in", zh: "登入" },
    eyebrow: { en: "Participant", zh: "參加者" },
    title: { en: "Account", zh: "帳戶中心" },
    description: {
      en: "Register or sign in to submit card artwork and track review status from a mobile-first account area.",
      zh: "註冊或登入後提交卡牌作品，並在手機優先的帳戶頁追蹤審核狀態。",
    },
    colorClassName: "bg-[var(--sky)]",
  },
  {
    href: "/admin",
    label: { en: "Admin dashboard", zh: "管理後台" },
    eyebrow: { en: "Organizer", zh: "主辦方" },
    title: { en: "Workspace", zh: "管理工作區" },
    description: {
      en: "Create activities, manage users, and handle submission review and payment queues.",
      zh: "建立活動、管理用戶，並處理投稿審核及付款隊列。",
    },
    colorClassName: "bg-[var(--coral)]",
  },
];

function HeroCardDeck() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-[21rem]" aria-hidden="true">
      <div className="absolute left-3 top-8 h-[78%] w-[70%] rotate-[-8deg] rounded-lg border-2 border-[var(--line)] bg-[var(--sun)] ink-shadow-sm" />
      <div className="absolute right-3 top-3 h-[78%] w-[70%] rotate-[7deg] rounded-lg border-2 border-[var(--line)] bg-[var(--paper-tint)] ink-shadow-sm" />
      <div className="paper-surface absolute inset-x-7 bottom-3 top-0 grid overflow-hidden rounded-lg border-2 border-[var(--line)] ink-shadow">
        <div className="holo-strip h-3" />
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="h-3 w-20 rounded-full bg-[var(--line)]" />
            <span className="size-9 rounded-full border-2 border-[var(--line)] bg-[var(--mint)]" />
          </div>
          <div className="card-art-grid min-h-40 rounded-md border-2 border-[var(--line)]" />
          <div className="grid gap-2">
            <span className="h-3 w-28 rounded-full bg-[var(--line)]" />
            <span className="h-2 w-full rounded-full bg-zinc-300" />
            <span className="h-2 w-5/6 rounded-full bg-zinc-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="cardevent-shell min-h-dvh flex-1 overflow-hidden text-[var(--ink)]">
      <section className="mx-auto grid min-h-[78dvh] w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="grid gap-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border-2 border-[var(--line)] bg-[var(--paper)] px-3 py-1 text-xs font-semibold uppercase text-[var(--ink)] ink-shadow-sm">
              MVP Preview
            </span>
            <span
              className="rounded-full border-2 border-[var(--line)] bg-[var(--mint)] px-3 py-1 text-xs font-semibold text-[var(--ink)]"
              lang="zh-HK"
            >
              手繪卡牌評審及比賽平台
            </span>
          </div>

          <div className="grid gap-4">
            <h1 className="max-w-3xl text-5xl font-black leading-none tracking-normal text-[var(--ink)] sm:text-7xl">
              CardEvent
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--ink-muted)] sm:text-xl">
              A crafted, bilingual home for hand-drawn card competitions.
              <span className="block" lang="zh-HK">
                為手繪卡牌比賽而設的中英文活動、投稿及評審平台。
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-zinc-800"
              href="/activities"
            >
              <BilingualText en="Open activities" zh="打開活動" />
            </Link>
            <Link
              className="focus-ink inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--paper)] px-5 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5 ink-shadow-sm"
              href="/account/login"
            >
              <BilingualText en="Try demo login" zh="試用登入" />
            </Link>
          </div>
        </div>

        <HeroCardDeck />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-10 sm:px-6 md:grid-cols-3">
        {previewLinks.map((item) => (
          <article
            className="paper-surface flex min-h-[18rem] flex-col justify-between rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm"
            key={item.href}
          >
            <div className="grid gap-4">
              <div
                className={`flex min-h-10 w-fit items-center rounded-full border-2 border-[var(--line)] px-3 text-xs font-black uppercase text-[var(--ink)] ${item.colorClassName}`}
              >
                <BilingualText en={item.eyebrow.en} zh={item.eyebrow.zh} />
              </div>
              <div className="grid gap-2">
                <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]">
                  <BilingualText en={item.title.en} zh={item.title.zh} />
                </h2>
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  {item.description.en}
                  <span className="mt-1 block" lang="zh-HK">
                    {item.description.zh}
                  </span>
                </p>
              </div>
            </div>
            <Link
              className="focus-ink mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--sun)]"
              href={item.href}
            >
              {bilingualLabel(item.label)}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
