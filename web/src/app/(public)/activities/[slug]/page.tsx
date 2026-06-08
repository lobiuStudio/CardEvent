import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked, type Token, type Tokens } from "marked";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { BilingualText } from "@/components/ui/bilingual-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActivityBySlug } from "@/lib/db/activity-repository";
import { bilingualLabel, formatBilingualDate, type BilingualCopy } from "@/lib/i18n/bilingual";

export const runtime = "nodejs";

type Activity = NonNullable<Awaited<ReturnType<typeof getActivityBySlug>>>;
type StatusTone = "neutral" | "success" | "warning" | "danger";

type ActivityPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    from?: string | string[];
  }>;
};

function formatMode(mode: string): BilingualCopy {
  return mode === "competition" ? { en: "Competition", zh: "比賽" } : { en: "Grading", zh: "評審" };
}

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatChargingMode(mode: string): BilingualCopy {
  return mode === "per_participant" ? { en: "Per participant", zh: "按參加者" } : { en: "Per card", zh: "按卡牌" };
}

function getActivityStatus(activity: Activity, now: Date): { label: string; tone: StatusTone } {
  if (activity.resultsPublishedAt) {
    return { label: bilingualLabel({ en: "Results published", zh: "結果已公布" }), tone: "success" };
  }

  if (now < activity.submissionStartAt) {
    return { label: bilingualLabel({ en: "Opening soon", zh: "即將開始" }), tone: "neutral" };
  }

  if (now <= activity.submissionDeadlineAt) {
    return { label: bilingualLabel({ en: "Open", zh: "接受投稿" }), tone: "success" };
  }

  if (now <= activity.judgingDeadlineAt) {
    return { label: bilingualLabel({ en: "Judging", zh: "評審中" }), tone: "warning" };
  }

  if (now <= activity.expectedResultAnnouncementAt) {
    return { label: bilingualLabel({ en: "Results pending", zh: "等待結果" }), tone: "warning" };
  }

  return { label: bilingualLabel({ en: "Closed", zh: "已截止" }), tone: "neutral" };
}

function isSubmissionOpen(activity: Activity, now: Date): boolean {
  return now >= activity.submissionStartAt && now <= activity.submissionDeadlineAt;
}

function getSafeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return href;
  }

  if (href.startsWith("#")) {
    return href;
  }

  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}

function hasInlineTokens(token: Token): token is Token & { tokens: Token[] } {
  return Array.isArray((token as { tokens?: unknown }).tokens);
}

function renderInlineTokens(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case "text":
      case "escape": {
        const textToken = token as Tokens.Text | Tokens.Escape;
        return hasInlineTokens(textToken) ? renderInlineTokens(textToken.tokens, key) : textToken.text;
      }
      case "strong": {
        const strongToken = token as Tokens.Strong;
        return <strong key={key}>{renderInlineTokens(strongToken.tokens, key)}</strong>;
      }
      case "em": {
        const emToken = token as Tokens.Em;
        return <em key={key}>{renderInlineTokens(emToken.tokens, key)}</em>;
      }
      case "codespan": {
        const codeToken = token as Tokens.Codespan;
        return (
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.92em] text-zinc-950" key={key}>
            {codeToken.text}
          </code>
        );
      }
      case "del": {
        const delToken = token as Tokens.Del;
        return <del key={key}>{renderInlineTokens(delToken.tokens, key)}</del>;
      }
      case "br":
        return <br key={key} />;
      case "link": {
        const linkToken = token as Tokens.Link;
        const safeHref = getSafeHref(linkToken.href);
        const content = renderInlineTokens(linkToken.tokens, key);

        if (!safeHref) {
          return <span key={key}>{content}</span>;
        }

        return (
          <a className="font-medium text-zinc-950 underline underline-offset-4" href={safeHref} key={key}>
            {content}
          </a>
        );
      }
      case "image":
      case "html":
        return token.type === "image" && "text" in token && token.text ? <span key={key}>{token.text}</span> : null;
      default:
        if (hasInlineTokens(token)) {
          return renderInlineTokens(token.tokens, key);
        }

        return "text" in token ? token.text : null;
    }
  });
}

function renderTableCell(cell: Tokens.TableCell, keyPrefix: string): ReactNode {
  return <>{renderInlineTokens(cell.tokens, keyPrefix)}</>;
}

function renderListItem(item: Tokens.ListItem, keyPrefix: string): ReactNode {
  return (
    <li className="pl-1 [&>p]:my-0" key={keyPrefix}>
      {renderBlockTokens(item.tokens, keyPrefix)}
    </li>
  );
}

function renderHeading(token: Tokens.Heading, key: string): ReactNode {
  const content = renderInlineTokens(token.tokens, key);

  if (token.depth <= 2) {
    return (
      <h2 className="mt-8 text-2xl font-semibold tracking-normal text-zinc-950 first:mt-0" key={key}>
        {content}
      </h2>
    );
  }

  if (token.depth === 3) {
    return (
      <h3 className="mt-6 text-xl font-semibold tracking-normal text-zinc-950 first:mt-0" key={key}>
        {content}
      </h3>
    );
  }

  return (
    <h4 className="mt-5 text-lg font-semibold tracking-normal text-zinc-950 first:mt-0" key={key}>
      {content}
    </h4>
  );
}

function renderBlockTokens(tokens: Token[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    switch (token.type) {
      case "space":
        return null;
      case "heading": {
        const headingToken = token as Tokens.Heading;
        return renderHeading(headingToken, key);
      }
      case "paragraph": {
        const paragraphToken = token as Tokens.Paragraph;
        return (
          <p className="text-base leading-7 text-zinc-700" key={key}>
            {renderInlineTokens(paragraphToken.tokens, key)}
          </p>
        );
      }
      case "list": {
        const listToken = token as Tokens.List;
        const items = listToken.items.map((item, itemIndex) => renderListItem(item, `${key}-${itemIndex}`));

        return listToken.ordered ? (
          <ol className="grid list-decimal gap-2 pl-5 text-base leading-7 text-zinc-700" key={key}>
            {items}
          </ol>
        ) : (
          <ul className="grid list-disc gap-2 pl-5 text-base leading-7 text-zinc-700" key={key}>
            {items}
          </ul>
        );
      }
      case "code": {
        const codeToken = token as Tokens.Code;
        return (
          <pre className="overflow-x-auto rounded-md bg-zinc-950 p-4 text-sm leading-6 text-zinc-50" key={key}>
            <code>{codeToken.text}</code>
          </pre>
        );
      }
      case "blockquote": {
        const blockquoteToken = token as Tokens.Blockquote;
        return (
          <blockquote className="border-l-4 border-zinc-300 pl-4" key={key}>
            {renderBlockTokens(blockquoteToken.tokens, key)}
          </blockquote>
        );
      }
      case "table": {
        const tableToken = token as Tokens.Table;
        return (
          <div className="overflow-x-auto" key={key}>
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  {tableToken.header.map((cell, cellIndex) => (
                    <th className="px-3 py-2 font-semibold text-zinc-950" key={`${key}-head-${cellIndex}`}>
                      {renderTableCell(cell, `${key}-head-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {tableToken.rows.map((row, rowIndex) => (
                  <tr key={`${key}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td className="px-3 py-2 text-zinc-700" key={`${key}-row-${rowIndex}-${cellIndex}`}>
                        {renderTableCell(cell, `${key}-row-${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "hr":
        return <hr className="border-zinc-200" key={key} />;
      case "html":
        return null;
      default:
        if (hasInlineTokens(token)) {
          return (
            <p className="text-base leading-7 text-zinc-700" key={key}>
              {renderInlineTokens(token.tokens, key)}
            </p>
          );
        }

        return null;
    }
  });
}

function MarkdownRules({ markdown }: { markdown: string }) {
  return <div className="grid gap-4">{renderBlockTokens(marked.lexer(markdown), "rules")}</div>;
}

function SectionTitle({ en, id, zh }: BilingualCopy & { id?: string }) {
  return (
    <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]" id={id}>
      <BilingualText en={en} zh={zh} />
    </h2>
  );
}

function getEntryStatusSummary(activity: Activity, now: Date): string {
  if (isSubmissionOpen(activity, now)) {
    return "Accepting submissions / 正在接受投稿";
  }

  if (now < activity.submissionStartAt) {
    return "Opening soon / 即將開始投稿";
  }

  if (activity.resultsPublishedAt) {
    return "Results published / 結果已公布";
  }

  return "Submissions closed / 投稿已截止";
}

function EntrySummary({ activity, now }: { activity: Activity; now: Date }) {
  const summaryItems = [
    {
      label: "Status / 狀態",
      value: getEntryStatusSummary(activity, now),
      toneClassName: "bg-[var(--mint)]",
    },
    {
      label: "Entry limit / 投稿上限",
      value: `${activity.perParticipantSubmissionLimit} submissions per participant / 每人 ${activity.perParticipantSubmissionLimit} 份`,
      toneClassName: "bg-[var(--sun)]",
    },
    {
      label: "Images / 圖片",
      value: `Up to ${activity.maxImagesPerSubmission} images / 最多 ${activity.maxImagesPerSubmission} 張圖片`,
      toneClassName: "bg-[var(--sky)]",
    },
    {
      label: "Payment / 付款",
      value: activity.paymentRequired ? "Payment required / 需要付款" : "No payment required / 無需付款",
      toneClassName: "bg-white",
    },
    {
      label: "Review / 審核",
      value: activity.reviewRequired ? "Organizer review / 主辦方審核" : "No organizer review / 無需主辦方審核",
      toneClassName: "bg-white",
    },
  ];

  return (
    <section className="border-t-2 border-[var(--line)] py-7" aria-labelledby="entry-summary">
      <div className="grid gap-2">
        <h2 className="text-2xl font-black tracking-normal text-[var(--ink)]" id="entry-summary">
          Entry summary / 參加摘要
        </h2>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">
          Key requirements before reading the full rules. / 閱讀完整規則前，先確認主要參加條件。
        </p>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-2">
        {summaryItems.map((item) => (
          <div
            className={`rounded-lg border-2 border-[var(--line)] p-4 ${item.toneClassName}`}
            key={item.label}
          >
            <dt className="text-xs font-black uppercase text-[var(--ink-muted)]">{item.label}</dt>
            <dd className="mt-2 text-base font-black leading-6 text-[var(--ink)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function ActivityDetailPage({ params, searchParams }: ActivityPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ from: undefined })]);
  const activity = await getActivityBySlug(slug);

  if (!activity) {
    notFound();
  }

  const now = new Date();
  const status = getActivityStatus(activity, now);
  const submissionsOpen = isSubmissionOpen(activity, now);
  const mode = formatMode(activity.mode);
  const chargingMode = formatChargingMode(activity.paymentChargingMode);
  const fromAdmin = readParam(query.from) === "admin";
  const backHref = fromAdmin ? "/admin" : "/activities";
  const backLabel = fromAdmin
    ? { en: "Back to admin", zh: "返回後台" }
    : { en: "Back to activities", zh: "返回活動列表" };

  return (
    <>
      <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 pb-28 text-[var(--ink)] sm:px-6">
        <div className="mx-auto grid w-full max-w-5xl gap-8">
          <header className="grid gap-6 py-4 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div className="grid gap-5">
              <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href={backHref}>
                <BilingualText en={backLabel.en} zh={backLabel.zh} />
              </Link>
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={status.label} tone={status.tone} />
                  <span className="rounded-full border-2 border-[var(--line)] bg-white px-2.5 py-1 text-xs font-black text-[var(--ink)]">
                    <BilingualText en={mode.en} zh={mode.zh} />
                  </span>
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-normal text-[var(--ink)] md:text-6xl">
                  {activity.title}
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[var(--ink-muted)]">{activity.description}</p>
              </div>
            </div>

            <div className="grid gap-4">
              {activity.coverImagePublicUrl ? (
                <div className="paper-surface overflow-hidden rounded-lg border-2 border-[var(--line)] ink-shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${activity.title} cover image`}
                    className="aspect-[4/3] w-full object-cover"
                    src={activity.coverImagePublicUrl}
                  />
                </div>
              ) : null}

              <aside className="paper-surface rounded-lg border-2 border-[var(--line)] p-4 ink-shadow-sm">
                <p className="text-xs font-black uppercase text-[var(--ink-muted)]">
                  <BilingualText en="Submission window" zh="投稿時段" />
                </p>
                <p className="mt-3 text-2xl font-black leading-tight text-[var(--ink)]">
                  {submissionsOpen ? (
                    <BilingualText en="Now open" zh="現正開放" />
                  ) : (
                    <BilingualText en="Not open" zh="未開放" />
                  )}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                  {formatBilingualDate(activity.submissionDeadlineAt, "full")}
                </p>
              </aside>
            </div>
          </header>

          <EntrySummary activity={activity} now={now} />

          <section className="border-t-2 border-[var(--line)] py-7" aria-labelledby="deadlines">
            <SectionTitle en="Deadlines" id="deadlines" zh="重要日期" />
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="paper-surface rounded-lg border-2 border-[var(--line)] p-4">
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Submissions open" zh="投稿開始" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {formatBilingualDate(activity.submissionStartAt, "full")}
                </dd>
              </div>
              <div className="paper-surface rounded-lg border-2 border-[var(--line)] p-4">
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Submission deadline" zh="投稿截止" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {formatBilingualDate(activity.submissionDeadlineAt, "full")}
                </dd>
              </div>
              <div className="paper-surface rounded-lg border-2 border-[var(--line)] p-4">
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Judging deadline" zh="評審截止" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {formatBilingualDate(activity.judgingDeadlineAt, "full")}
                </dd>
              </div>
              <div className="paper-surface rounded-lg border-2 border-[var(--line)] p-4">
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Expected results" zh="預計公布結果" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {formatBilingualDate(activity.expectedResultAnnouncementAt, "full")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border-t-2 border-[var(--line)] py-7" aria-labelledby="rules">
            <SectionTitle en="Rules" id="rules" zh="活動規則" />
            <div className="paper-surface mt-5 rounded-lg border-2 border-[var(--line)] p-5">
              <MarkdownRules markdown={activity.rulesMarkdown} />
            </div>
          </section>

          <section className="grid gap-5 border-t-2 border-[var(--line)] py-7 md:grid-cols-2">
            <div>
              <SectionTitle en="Groups" zh="組別" />
              <ul className="mt-4 grid gap-2">
                {activity.groups.map((group) => (
                  <li
                    className="rounded-md border-2 border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm font-black text-[var(--ink)]"
                    key={group.id}
                  >
                    {group.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionTitle en="Criteria" zh="評分準則" />
              <ul className="mt-4 grid gap-3">
                {activity.criteria.map((criterion) => (
                  <li className="paper-surface grid gap-1 rounded-lg border-2 border-[var(--line)] px-3 py-2" key={criterion.id}>
                    <span className="text-sm font-black text-[var(--ink)]">{criterion.name}</span>
                    {criterion.description ? (
                      <span className="text-sm leading-6 text-[var(--ink-muted)]">{criterion.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="border-t-2 border-[var(--line)] py-7" aria-labelledby="settings">
            <SectionTitle en="Submission settings" id="settings" zh="投稿設定" />
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Participant limit" zh="每人投稿上限" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {activity.perParticipantSubmissionLimit} submissions / {activity.perParticipantSubmissionLimit} 份投稿
                </dd>
              </div>
              <div>
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Images per submission" zh="每份投稿圖片數量" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {activity.maxImagesPerSubmission} images / {activity.maxImagesPerSubmission} 張圖片
                </dd>
              </div>
              <div>
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Review" zh="審核" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {activity.reviewRequired ? bilingualLabel({ en: "Required", zh: "需要審核" }) : bilingualLabel({ en: "Not required", zh: "不需要審核" })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-black text-[var(--ink)]">
                  <BilingualText en="Judging" zh="評審身份" />
                </dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                  {activity.anonymousJudging ? bilingualLabel({ en: "Anonymous", zh: "匿名評審" }) : bilingualLabel({ en: "Named", zh: "具名評審" })}
                </dd>
              </div>
            </dl>
          </section>

          {activity.paymentRequired ? (
            <section className="border-t-2 border-[var(--line)] py-7" aria-labelledby="payment">
              <SectionTitle en="Payment" id="payment" zh="付款" />
              <dl className="mt-5 grid gap-4">
                <div>
                  <dt className="text-sm font-black text-[var(--ink)]">
                    <BilingualText en="Charging mode" zh="收費模式" />
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">
                    <BilingualText en={chargingMode.en} zh={chargingMode.zh} />
                  </dd>
                </div>
                {activity.paymentInstructions ? (
                  <div>
                    <dt className="text-sm font-black text-[var(--ink)]">
                      <BilingualText en="Instructions" zh="付款指示" />
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-muted)]">
                      {activity.paymentInstructions}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>
      </main>

      <BottomActionBar>
        {activity.resultsPublishedAt && activity.mode === "competition" ? (
          <Link
            className="focus-ink flex min-h-11 flex-1 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            href={`/activities/${activity.slug}/results`}
          >
            <BilingualText en="View results" zh="查看結果" />
          </Link>
        ) : submissionsOpen ? (
          <Link
            className="focus-ink flex min-h-11 flex-1 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            href={`/activities/${activity.slug}/submit`}
          >
            <BilingualText en="Submit card" zh="提交卡牌" />
          </Link>
        ) : (
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-md border-2 border-[var(--line)] bg-zinc-200 px-4 text-sm font-bold text-zinc-600">
            <BilingualText en="Submissions unavailable" zh="暫停投稿" />
          </span>
        )}
        <Link
          className="focus-ink flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
          href={backHref}
        >
          <BilingualText en={fromAdmin ? "Admin" : "Activities"} zh={fromAdmin ? "後台" : "活動"} />
        </Link>
      </BottomActionBar>
    </>
  );
}
