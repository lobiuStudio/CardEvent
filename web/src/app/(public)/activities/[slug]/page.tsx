import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked, type Token, type Tokens } from "marked";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { getActivityBySlug } from "@/lib/db/activity-repository";

export const runtime = "nodejs";

type Activity = NonNullable<Awaited<ReturnType<typeof getActivityBySlug>>>;
type StatusTone = "neutral" | "success" | "warning" | "danger";

type ActivityPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function formatMode(mode: string): string {
  return mode === "competition" ? "Competition" : "Grading";
}

function formatChargingMode(mode: string): string {
  return mode === "per_participant" ? "Per participant" : "Per card";
}

function getActivityStatus(activity: Activity, now: Date): { label: string; tone: StatusTone } {
  if (activity.resultsPublishedAt) {
    return { label: "Results published", tone: "success" };
  }

  if (now < activity.submissionStartAt) {
    return { label: "Opening soon", tone: "neutral" };
  }

  if (now <= activity.submissionDeadlineAt) {
    return { label: "Open", tone: "success" };
  }

  if (now <= activity.judgingDeadlineAt) {
    return { label: "Judging", tone: "warning" };
  }

  if (now <= activity.expectedResultAnnouncementAt) {
    return { label: "Results pending", tone: "warning" };
  }

  return { label: "Closed", tone: "neutral" };
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

export default async function ActivityDetailPage({ params }: ActivityPageProps) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) {
    notFound();
  }

  const now = new Date();
  const status = getActivityStatus(activity, now);
  const submissionsOpen = isSubmissionOpen(activity, now);

  return (
    <>
      <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8 pb-28">
        <div className="mx-auto grid w-full max-w-4xl gap-8">
          <header className="grid gap-5">
            <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href="/activities">
              Back to activities
            </Link>
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={status.label} tone={status.tone} />
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {formatMode(activity.mode)}
                </span>
              </div>
              <h1 className="text-3xl font-semibold leading-tight tracking-normal text-zinc-950 md:text-4xl">
                {activity.title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-zinc-600">{activity.description}</p>
            </div>
          </header>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby="deadlines">
            <h2 className="text-xl font-semibold text-zinc-950" id="deadlines">
              Deadlines
            </h2>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-zinc-900">Submissions open</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">{formatDate(activity.submissionStartAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Submission deadline</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">{formatDate(activity.submissionDeadlineAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Judging deadline</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">{formatDate(activity.judgingDeadlineAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Expected results</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">
                  {formatDate(activity.expectedResultAnnouncementAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby="rules">
            <h2 className="text-xl font-semibold text-zinc-950" id="rules">
              Rules
            </h2>
            <div className="mt-5">
              <MarkdownRules markdown={activity.rulesMarkdown} />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-950">Groups</h2>
              <ul className="mt-4 grid gap-2">
                {activity.groups.map((group) => (
                  <li className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800" key={group.id}>
                    {group.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-zinc-950">Criteria</h2>
              <ul className="mt-4 grid gap-3">
                {activity.criteria.map((criterion) => (
                  <li className="grid gap-1 rounded-md bg-zinc-100 px-3 py-2" key={criterion.id}>
                    <span className="text-sm font-medium text-zinc-900">{criterion.name}</span>
                    {criterion.description ? (
                      <span className="text-sm leading-6 text-zinc-600">{criterion.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby="settings">
            <h2 className="text-xl font-semibold text-zinc-950" id="settings">
              Submission Settings
            </h2>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-zinc-900">Participant limit</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.perParticipantSubmissionLimit} submissions
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Images per submission</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">{activity.maxImagesPerSubmission} images</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Review</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.reviewRequired ? "Required" : "Not required"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-zinc-900">Judging</dt>
                <dd className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.anonymousJudging ? "Anonymous" : "Named"}
                </dd>
              </div>
            </dl>
          </section>

          {activity.paymentRequired ? (
            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby="payment">
              <h2 className="text-xl font-semibold text-zinc-950" id="payment">
                Payment
              </h2>
              <dl className="mt-5 grid gap-4">
                <div>
                  <dt className="text-sm font-medium text-zinc-900">Charging mode</dt>
                  <dd className="mt-1 text-sm leading-6 text-zinc-600">
                    {formatChargingMode(activity.paymentChargingMode)}
                  </dd>
                </div>
                {activity.paymentInstructions ? (
                  <div>
                    <dt className="text-sm font-medium text-zinc-900">Instructions</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-600">
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
        {submissionsOpen ? (
          <Link
            className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            href={`/activities/${activity.slug}/submit`}
          >
            Submit card
          </Link>
        ) : (
          <span className="flex min-h-11 flex-1 items-center justify-center rounded-md bg-zinc-200 px-4 text-sm font-medium text-zinc-600">
            Submissions unavailable
          </span>
        )}
        <Link
          className="flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          href="/activities"
        >
          Activities
        </Link>
      </BottomActionBar>
    </>
  );
}
