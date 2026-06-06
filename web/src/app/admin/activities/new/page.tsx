import type { ReactNode } from "react";
import Link from "next/link";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/rbac";

export const runtime = "nodejs";

type NewActivityPageProps = {
  searchParams: Promise<{
    error?: string | string[];
  }>;
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200";

const textareaClassName =
  "min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200";

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function Section({
  id,
  step,
  title,
  children,
}: {
  id: string;
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby={id}>
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white">
          {step}
        </span>
        <h2 className="text-xl font-semibold text-zinc-950" id={id}>
          {title}
        </h2>
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

function fieldProps({
  describedBy,
  invalid,
}: {
  describedBy?: string;
  invalid: boolean;
}): {
  "aria-describedby"?: string;
  "aria-invalid": boolean;
} {
  return {
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
  };
}

export default async function NewActivityPage({ searchParams }: NewActivityPageProps) {
  await requireRole("admin");

  const params = await searchParams;
  const error = readParam(params.error);

  return (
    <>
      <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8 pb-28">
        <div className="mx-auto grid w-full max-w-3xl gap-8">
          <header className="grid gap-4">
            <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href="/admin">
              Back to admin
            </Link>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">New Activity</h1>
              <p className="text-base leading-7 text-zinc-600">Create the public page, submission window, and judging setup.</p>
            </div>
          </header>

          <form className="grid gap-6" id="activity-form" action="/api/admin/activities" method="post">
            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <Section id="basics" step="1" title="Basics">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="title" label="Title">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="title"
                      maxLength={120}
                      required
                    />
                  )}
                </FormField>

                <FormField id="slug" label="Slug" hint="Lowercase letters, numbers, and hyphens.">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="slug"
                      pattern="[a-z0-9-]+"
                      minLength={3}
                      maxLength={80}
                      required
                    />
                  )}
                </FormField>
              </div>

              <FormField id="mode" label="Mode">
                {({ id, describedBy, invalid }) => (
                  <select
                    {...fieldProps({ describedBy, invalid })}
                    className={inputClassName}
                    defaultValue="grading"
                    id={id}
                    name="mode"
                    required
                  >
                    <option value="grading">Grading</option>
                    <option value="competition">Competition</option>
                  </select>
                )}
              </FormField>

              <FormField id="description" label="Description">
                {({ id, describedBy, invalid }) => (
                  <textarea
                    {...fieldProps({ describedBy, invalid })}
                    className={textareaClassName}
                    id={id}
                    name="description"
                    maxLength={1000}
                    required
                  />
                )}
              </FormField>
            </Section>

            <Section id="dates" step="2" title="Dates">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="submissionStartAt" label="Submissions open">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="submissionStartAt"
                      type="datetime-local"
                      required
                    />
                  )}
                </FormField>

                <FormField id="submissionDeadlineAt" label="Submission deadline">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="submissionDeadlineAt"
                      type="datetime-local"
                      required
                    />
                  )}
                </FormField>

                <FormField id="judgingDeadlineAt" label="Judging deadline">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="judgingDeadlineAt"
                      type="datetime-local"
                      required
                    />
                  )}
                </FormField>

                <FormField id="expectedResultAnnouncementAt" label="Expected results">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="expectedResultAnnouncementAt"
                      type="datetime-local"
                      required
                    />
                  )}
                </FormField>
              </div>
            </Section>

            <Section id="submission-settings" step="3" title="Submission Settings">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="perParticipantSubmissionLimit" label="Participant limit">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      defaultValue={3}
                      id={id}
                      max={20}
                      min={1}
                      name="perParticipantSubmissionLimit"
                      type="number"
                      required
                    />
                  )}
                </FormField>

                <FormField id="maxImagesPerSubmission" label="Images per submission">
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      defaultValue={4}
                      id={id}
                      max={10}
                      min={1}
                      name="maxImagesPerSubmission"
                      type="number"
                      required
                    />
                  )}
                </FormField>
              </div>

              <div className="grid gap-3">
                <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium text-zinc-900">
                  <input className="size-5 accent-zinc-950" defaultChecked name="reviewRequired" type="checkbox" value="true" />
                  Review required
                </label>
                <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium text-zinc-900">
                  <input className="size-5 accent-zinc-950" defaultChecked name="anonymousJudging" type="checkbox" value="true" />
                  Anonymous judging
                </label>
              </div>
            </Section>

            <Section id="payment" step="4" title="Payment">
              <label className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 text-sm font-medium text-zinc-900">
                <input className="size-5 accent-zinc-950" name="paymentRequired" type="checkbox" value="true" />
                Payment required
              </label>

              <FormField id="paymentChargingMode" label="Charging mode">
                {({ id, describedBy, invalid }) => (
                  <select
                    {...fieldProps({ describedBy, invalid })}
                    className={inputClassName}
                    defaultValue="per_card"
                    id={id}
                    name="paymentChargingMode"
                    required
                  >
                    <option value="per_card">Per card</option>
                    <option value="per_participant">Per participant</option>
                  </select>
                )}
              </FormField>

              <FormField id="paymentInstructions" label="Payment instructions">
                {({ id, describedBy, invalid }) => (
                  <textarea
                    {...fieldProps({ describedBy, invalid })}
                    className={textareaClassName}
                    id={id}
                    name="paymentInstructions"
                    maxLength={2000}
                  />
                )}
              </FormField>
            </Section>

            <Section id="groups" step="5" title="Groups">
              <div className="grid gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <FormField id={`groupName-${index}`} key={index} label={`Group ${index + 1}`}>
                    {({ id, describedBy, invalid }) => (
                      <input
                        {...fieldProps({ describedBy, invalid })}
                        className={inputClassName}
                        id={id}
                        maxLength={80}
                        name="groupName"
                        required={index === 0}
                      />
                    )}
                  </FormField>
                ))}
              </div>
            </Section>

            <Section id="criteria" step="6" title="Criteria">
              <div className="grid gap-4">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div className="grid gap-3 rounded-md border border-zinc-200 p-3" key={index}>
                    <FormField id={`criterionName-${index}`} label={`Criterion ${index + 1}`}>
                      {({ id, describedBy, invalid }) => (
                        <input
                          {...fieldProps({ describedBy, invalid })}
                          className={inputClassName}
                          id={id}
                          maxLength={80}
                          name="criterionName"
                          required={index === 0}
                        />
                      )}
                    </FormField>

                    <FormField id={`criterionDescription-${index}`} label="Description">
                      {({ id, describedBy, invalid }) => (
                        <textarea
                          {...fieldProps({ describedBy, invalid })}
                          className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                          id={id}
                          maxLength={500}
                          name="criterionDescription"
                        />
                      )}
                    </FormField>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="rules" step="7" title="Rules">
              <FormField id="rulesMarkdown" label="Rules Markdown">
                {({ id, describedBy, invalid }) => (
                  <textarea
                    {...fieldProps({ describedBy, invalid })}
                    className="min-h-72 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                    id={id}
                    name="rulesMarkdown"
                    required
                  />
                )}
              </FormField>
            </Section>
          </form>
        </div>
      </main>

      <BottomActionBar>
        <Button className="flex flex-1 items-center justify-center" form="activity-form" type="submit">
          Create activity
        </Button>
        <Link
          className="flex min-h-11 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
          href="/admin"
        >
          Cancel
        </Link>
      </BottomActionBar>
    </>
  );
}
