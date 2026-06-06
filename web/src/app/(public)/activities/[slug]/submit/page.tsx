import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { FormField } from "@/components/forms/form-field";
import { BilingualText } from "@/components/ui/bilingual-text";
import { Button } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getActivityBySlug } from "@/lib/db/activity-repository";
import { countParticipantSubmissions } from "@/lib/db/submission-repository";
import { bilingualLabel, formatBilingualDate, type BilingualCopy } from "@/lib/i18n/bilingual";
import { acceptedImageMimeTypes, maxSubmissionImageBytes } from "@/lib/validation/submission";

export const runtime = "nodejs";

type SubmitPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

type Activity = NonNullable<Awaited<ReturnType<typeof getActivityBySlug>>>;

const inputClassName =
  "min-h-12 w-full rounded-md border-2 border-[var(--line)] bg-white px-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--line)] focus:ring-4 focus:ring-[rgb(255_209_102_/_0.55)] aria-invalid:border-red-500";

function isSubmissionOpen(activity: Activity, now: Date): boolean {
  return now >= activity.submissionStartAt && now <= activity.submissionDeadlineAt;
}

function getUnavailableMessage(activity: Activity, now: Date): string | null {
  if (now < activity.submissionStartAt) {
    return `${bilingualLabel({ en: "Submissions open", zh: "投稿開始" })}: ${formatBilingualDate(
      activity.submissionStartAt,
      "full",
    )}`;
  }

  if (now > activity.submissionDeadlineAt) {
    return `${bilingualLabel({ en: "The submission deadline passed", zh: "投稿已截止" })}: ${formatBilingualDate(
      activity.submissionDeadlineAt,
      "full",
    )}`;
  }

  return null;
}

function LoginRequired({ slug }: { slug: string }) {
  return (
    <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href={`/activities/${slug}`}>
          <BilingualText en="Back to activity" zh="返回活動" />
        </Link>
        <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
          <h1 className="text-3xl font-black tracking-normal text-[var(--ink)]">
            <BilingualText en="Sign in to submit" zh="登入後投稿" />
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            Submissions are tied to your CardEvent account so organizers can track review and payment status.
            <span className="block" lang="zh-HK">
              投稿會連結到你的 CardEvent 帳戶，方便主辦方追蹤審核及付款狀態。
            </span>
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              className="focus-ink flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-[var(--line)] px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
              href="/account/login"
            >
              <BilingualText en="Sign in" zh="登入" />
            </Link>
            <Link
              className="focus-ink flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
              href="/account/register"
            >
              <BilingualText en="Create account" zh="建立帳戶" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ step, title }: { step: string; title: BilingualCopy }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--line)] bg-[var(--sun)] text-sm font-black text-[var(--ink)]">
        {step}
      </span>
      <h2 className="text-lg font-black tracking-normal text-[var(--ink)]">
        <BilingualText en={title.en} zh={title.zh} />
      </h2>
    </div>
  );
}

export default async function SubmitActivityPage({ params, searchParams }: SubmitPageProps) {
  const { slug } = await params;
  const [{ error }, activity, user] = await Promise.all([
    searchParams ?? Promise.resolve({ error: undefined }),
    getActivityBySlug(slug),
    readSessionUser(),
  ]);

  if (!activity) {
    notFound();
  }

  if (!user) {
    return <LoginRequired slug={slug} />;
  }

  const now = new Date();
  const unavailableMessage = getUnavailableMessage(activity, now);
  const submissionCount = await countParticipantSubmissions(activity.id, user.id);
  const remainingSubmissions = Math.max(activity.perParticipantSubmissionLimit - submissionCount, 0);
  const canSubmit = isSubmissionOpen(activity, now) && remainingSubmissions > 0;

  return (
    <>
      <main className="cardevent-shell min-h-dvh flex-1 px-4 py-8 pb-28 text-[var(--ink)]">
        <div className="mx-auto grid w-full max-w-2xl gap-6">
          <header className="grid gap-4">
            <Link className="text-sm font-bold text-[var(--ink-muted)] transition hover:text-[var(--ink)]" href={`/activities/${slug}`}>
              <BilingualText en="Back to activity" zh="返回活動" />
            </Link>
            <div className="grid gap-2">
              <p className="w-fit rounded-full border-2 border-[var(--line)] bg-[var(--mint)] px-3 py-1 text-xs font-black uppercase text-[var(--ink)]">
                <BilingualText en="Submit card" zh="提交卡牌" />
              </p>
              <h1 className="text-4xl font-black leading-tight tracking-normal text-[var(--ink)]">{activity.title}</h1>
              <p className="text-sm leading-6 text-[var(--ink-muted)]">
                {remainingSubmissions} of {activity.perParticipantSubmissionLimit} submissions remaining / 尚餘{" "}
                {remainingSubmissions} 份投稿名額，共 {activity.perParticipantSubmissionLimit} 份。
              </p>
            </div>
          </header>

          {error ? (
            <div className="rounded-lg border-2 border-red-700 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          {unavailableMessage ? (
            <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <h2 className="text-lg font-black text-[var(--ink)]">
                <BilingualText en="Submissions unavailable" zh="暫停投稿" />
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{unavailableMessage}</p>
            </section>
          ) : null}

          {remainingSubmissions === 0 ? (
            <section className="paper-surface rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <h2 className="text-lg font-black text-[var(--ink)]">
                <BilingualText en="Submission limit reached" zh="已達投稿上限" />
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                You have used the available submissions for this activity.
                <span className="block" lang="zh-HK">
                  你已用完此活動的投稿名額。
                </span>
              </p>
              <Link
                className="focus-ink mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
                href="/account/submissions"
              >
                <BilingualText en="View your submissions" zh="查看我的投稿" />
              </Link>
            </section>
          ) : null}

          <form
            action={`/api/activities/${activity.id}/submissions`}
            className="grid gap-4"
            encType="multipart/form-data"
            id="submission-form"
            method="post"
          >
            <section className="paper-surface grid gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <SectionHeading step="1" title={{ en: "Card details", zh: "卡牌資料" }} />
              <FormField id="cardName" label={bilingualLabel({ en: "Card name", zh: "卡牌名稱" })}>
                {({ id, describedBy, invalid }) => (
                  <input
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={inputClassName}
                    id={id}
                    maxLength={120}
                    name="cardName"
                    required
                  />
                )}
              </FormField>
              {activity.groups.length ? (
                <FormField id="groupId" label={bilingualLabel({ en: "Group", zh: "組別" })}>
                  {({ id, describedBy, invalid }) => (
                    <select
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={inputClassName}
                      id={id}
                      name="groupId"
                      required
                    >
                      <option value="">Choose group / 選擇組別</option>
                      {activity.groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  )}
                </FormField>
              ) : null}
            </section>

            <section className="paper-surface grid gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <SectionHeading step="2" title={{ en: "Image upload", zh: "上載圖片" }} />
              <FormField
                hint={`JPG, PNG, or WebP. Up to ${activity.maxImagesPerSubmission} images, ${Math.floor(
                  maxSubmissionImageBytes / 1024 / 1024,
                )} MB each. / 支援 JPG、PNG 或 WebP；最多 ${activity.maxImagesPerSubmission} 張，每張 ${Math.floor(
                  maxSubmissionImageBytes / 1024 / 1024,
                )}MB。`}
                id="images"
                label={bilingualLabel({ en: "Card images", zh: "卡牌圖片" })}
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    accept={acceptedImageMimeTypes.join(",")}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={`${inputClassName} py-2 file:mr-3 file:rounded-md file:border-2 file:border-[var(--line)] file:bg-[var(--sun)] file:px-3 file:py-2 file:text-sm file:font-black file:text-[var(--ink)]`}
                    id={id}
                    multiple
                    name="images"
                    required
                    type="file"
                  />
                )}
              </FormField>
            </section>

            <section className="paper-surface grid gap-5 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <SectionHeading step="3" title={{ en: "Optional fields", zh: "選填資料" }} />
              <FormField id="gameOrSeries" label={bilingualLabel({ en: "Game or series", zh: "遊戲或系列" })}>
                {({ id, describedBy, invalid }) => (
                  <input
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={inputClassName}
                    id={id}
                    maxLength={120}
                    name="gameOrSeries"
                  />
                )}
              </FormField>
              <FormField id="characterOrType" label={bilingualLabel({ en: "Character or type", zh: "角色或類型" })}>
                {({ id, describedBy, invalid }) => (
                  <input
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={inputClassName}
                    id={id}
                    maxLength={120}
                    name="characterOrType"
                  />
                )}
              </FormField>
              <FormField id="authorDisplayName" label={bilingualLabel({ en: "Display name on submission", zh: "投稿顯示名稱" })}>
                {({ id, describedBy, invalid }) => (
                  <input
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={inputClassName}
                    id={id}
                    maxLength={120}
                    name="authorDisplayName"
                  />
                )}
              </FormField>
              <FormField id="description" label={bilingualLabel({ en: "Description", zh: "作品描述" })}>
                {({ id, describedBy, invalid }) => (
                  <textarea
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={`${inputClassName} min-h-32 py-3 leading-6`}
                    id={id}
                    maxLength={1000}
                    name="description"
                  />
                )}
              </FormField>
            </section>

            <section className="paper-surface grid gap-3 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <SectionHeading step="4" title={{ en: "Payment proof", zh: "付款證明" }} />
              {activity.paymentRequired ? (
                <div className="grid gap-3 text-sm leading-6 text-[var(--ink-muted)]">
                  <p>
                    Payment is required for this activity. Your submission will be marked pending payment.
                    <span className="block" lang="zh-HK">
                      此活動需要付款，你的投稿會標記為等待付款確認。
                    </span>
                  </p>
                  {activity.paymentInstructions ? (
                    <p className="whitespace-pre-wrap rounded-md border-2 border-[var(--line)] bg-white p-3 text-[var(--ink-muted)]">
                      {activity.paymentInstructions}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--ink-muted)]">
                  No payment proof is required for this activity.
                  <span className="block" lang="zh-HK">
                    此活動無需付款證明。
                  </span>
                </p>
              )}
            </section>

            <section className="paper-surface grid gap-3 rounded-lg border-2 border-[var(--line)] p-5 ink-shadow-sm">
              <SectionHeading step="5" title={{ en: "Review and submit", zh: "確認並提交" }} />
              <dl className="grid gap-3 text-sm leading-6 text-[var(--ink-muted)]">
                <div className="flex justify-between gap-4">
                  <dt className="font-black text-[var(--ink)]">
                    <BilingualText en="Review status" zh="審核狀態" />
                  </dt>
                  <dd>
                    {activity.reviewRequired
                      ? bilingualLabel({ en: "Pending organizer review", zh: "等待主辦方審核" })
                      : bilingualLabel({ en: "No review required", zh: "無需審核" })}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-black text-[var(--ink)]">
                    <BilingualText en="Deadline" zh="截止日期" />
                  </dt>
                  <dd className="text-right">{formatBilingualDate(activity.submissionDeadlineAt, "full")}</dd>
                </div>
              </dl>
            </section>
          </form>
        </div>
      </main>

      <BottomActionBar>
        <Button className="flex-1" disabled={!canSubmit} form="submission-form" type="submit">
          <BilingualText en="Submit card" zh="提交卡牌" />
        </Button>
        <Link
          className="focus-ink flex min-h-11 items-center justify-center rounded-md border-2 border-[var(--line)] bg-white px-4 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--sun)]"
          href={`/activities/${slug}`}
        >
          <BilingualText en="Activity" zh="活動" />
        </Link>
      </BottomActionBar>
    </>
  );
}
