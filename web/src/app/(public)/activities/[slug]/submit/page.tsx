import Link from "next/link";
import { notFound } from "next/navigation";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { readSessionUser } from "@/lib/auth/session";
import { getActivityBySlug } from "@/lib/db/activity-repository";
import { countParticipantSubmissions } from "@/lib/db/submission-repository";
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
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function isSubmissionOpen(activity: Activity, now: Date): boolean {
  return now >= activity.submissionStartAt && now <= activity.submissionDeadlineAt;
}

function getUnavailableMessage(activity: Activity, now: Date): string | null {
  if (now < activity.submissionStartAt) {
    return `Submissions open ${formatDate(activity.submissionStartAt)}.`;
  }

  if (now > activity.submissionDeadlineAt) {
    return `The submission deadline passed ${formatDate(activity.submissionDeadlineAt)}.`;
  }

  return null;
}

function LoginRequired({ slug }: { slug: string }) {
  return (
    <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto grid w-full max-w-xl gap-6">
        <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href={`/activities/${slug}`}>
          Back to activity
        </Link>
        <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">Sign in to submit</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Submissions are tied to your CardEvent account so organizers can track review and payment status.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              className="flex min-h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              href="/account/login"
            >
              Sign in
            </Link>
            <Link
              className="flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
              href="/account/register"
            >
              Create account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
        {step}
      </span>
      <h2 className="text-lg font-semibold tracking-normal text-zinc-950">{title}</h2>
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
      <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8 pb-28">
        <div className="mx-auto grid w-full max-w-2xl gap-6">
          <header className="grid gap-4">
            <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href={`/activities/${slug}`}>
              Back to activity
            </Link>
            <div className="grid gap-2">
              <p className="text-sm font-medium uppercase tracking-normal text-zinc-500">Submit card</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-normal text-zinc-950">{activity.title}</h1>
              <p className="text-sm leading-6 text-zinc-600">
                {remainingSubmissions} of {activity.perParticipantSubmissionLimit} submissions remaining.
              </p>
            </div>
          </header>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          {unavailableMessage ? (
            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">Submissions unavailable</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{unavailableMessage}</p>
            </section>
          ) : null}

          {remainingSubmissions === 0 ? (
            <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">Submission limit reached</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                You have used the available submissions for this activity.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                href="/account/submissions"
              >
                View your submissions
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
            <section className="grid gap-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <SectionHeading step="1" title="Card details" />
              <FormField id="cardName" label="Card name">
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
                <FormField id="groupId" label="Group">
                  {({ id, describedBy, invalid }) => (
                    <select
                      aria-describedby={describedBy}
                      aria-invalid={invalid}
                      className={inputClassName}
                      id={id}
                      name="groupId"
                      required
                    >
                      <option value="">Choose group</option>
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

            <section className="grid gap-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <SectionHeading step="2" title="Image upload" />
              <FormField
                hint={`JPG, PNG, or WebP. Up to ${activity.maxImagesPerSubmission} images, ${Math.floor(
                  maxSubmissionImageBytes / 1024 / 1024,
                )} MB each.`}
                id="images"
                label="Card images"
              >
                {({ id, describedBy, invalid }) => (
                  <input
                    accept={acceptedImageMimeTypes.join(",")}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    className={`${inputClassName} py-2 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-900`}
                    id={id}
                    multiple
                    name="images"
                    required
                    type="file"
                  />
                )}
              </FormField>
            </section>

            <section className="grid gap-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <SectionHeading step="3" title="Optional fields" />
              <FormField id="gameOrSeries" label="Game or series">
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
              <FormField id="characterOrType" label="Character or type">
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
              <FormField id="authorDisplayName" label="Display name on submission">
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
              <FormField id="description" label="Description">
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

            <section className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <SectionHeading step="4" title="Payment proof" />
              {activity.paymentRequired ? (
                <div className="grid gap-3 text-sm leading-6 text-zinc-600">
                  <p>Payment is required for this activity. Your submission will be marked pending payment.</p>
                  {activity.paymentInstructions ? (
                    <p className="whitespace-pre-wrap rounded-md bg-zinc-100 p-3 text-zinc-700">
                      {activity.paymentInstructions}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-600">No payment proof is required for this activity.</p>
              )}
            </section>

            <section className="grid gap-3 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <SectionHeading step="5" title="Review and submit" />
              <dl className="grid gap-3 text-sm leading-6 text-zinc-600">
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-zinc-900">Review status</dt>
                  <dd>{activity.reviewRequired ? "Pending organizer review" : "No review required"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-medium text-zinc-900">Deadline</dt>
                  <dd className="text-right">{formatDate(activity.submissionDeadlineAt)}</dd>
                </div>
              </dl>
            </section>
          </form>
        </div>
      </main>

      <BottomActionBar>
        <Button className="flex-1" disabled={!canSubmit} form="submission-form" type="submit">
          Submit card
        </Button>
        <Link
          className="flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          href={`/activities/${slug}`}
        >
          Activity
        </Link>
      </BottomActionBar>
    </>
  );
}
