"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomActionBar } from "@/components/mobile/bottom-action-bar";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";

type CriterionValue = {
  name: string;
  description: string;
};

type ActivityFormValues = {
  title: string;
  slug: string;
  mode: "grading" | "competition";
  description: string;
  submissionStartAt: string;
  submissionDeadlineAt: string;
  judgingDeadlineAt: string;
  expectedResultAnnouncementAt: string;
  perParticipantSubmissionLimit: string;
  maxImagesPerSubmission: string;
  reviewRequired: boolean;
  anonymousJudging: boolean;
  paymentRequired: boolean;
  paymentChargingMode: "per_card" | "per_participant";
  paymentInstructions: string;
  groups: string[];
  criteria: CriterionValue[];
  rulesMarkdown: string;
};

type ActivityResponse = {
  activityId?: string;
  slug?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const inputClassName =
  "min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500 aria-invalid:ring-red-100";

const textareaClassName =
  "min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500 aria-invalid:ring-red-100";

const compactTextareaClassName =
  "min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500 aria-invalid:ring-red-100";

const defaultValues: ActivityFormValues = {
  title: "",
  slug: "",
  mode: "grading",
  description: "",
  submissionStartAt: "",
  submissionDeadlineAt: "",
  judgingDeadlineAt: "",
  expectedResultAnnouncementAt: "",
  perParticipantSubmissionLimit: "3",
  maxImagesPerSubmission: "4",
  reviewRequired: true,
  anonymousJudging: true,
  paymentRequired: false,
  paymentChargingMode: "per_card",
  paymentInstructions: "",
  groups: ["Open", "", "", ""],
  criteria: [
    { name: "Artwork", description: "" },
    { name: "Originality", description: "" },
    { name: "Theme fit", description: "" },
    { name: "", description: "" },
    { name: "", description: "" },
  ],
  rulesMarkdown: "## Rules\n\n- Submit original hand-drawn card artwork.\n- Upload JPG, PNG, or WebP images.\n",
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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

function Section({
  id,
  step,
  title,
  summary,
  children,
}: {
  id: string;
  step: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby={id}>
      <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-4">
        <span className="flex size-9 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
          {step}
        </span>
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold tracking-normal text-zinc-950" id={id}>
            {title}
          </h2>
          <p className="text-sm leading-6 text-zinc-600">{summary}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

function ToggleField({
  checked,
  label,
  name,
  onChange,
}: {
  checked: boolean;
  label: string;
  name: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900">
      <input
        checked={checked}
        className="size-5 accent-zinc-950"
        name={name}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
        value="true"
      />
      <span>{label}</span>
    </label>
  );
}

export function NewActivityForm() {
  const router = useRouter();
  const [values, setValues] = useState<ActivityFormValues>(defaultValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [coverFileName, setCoverFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const errorList = useMemo(() => Object.values(fieldErrors).filter(Boolean), [fieldErrors]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  function updateValue<Key extends keyof ActivityFormValues>(key: Key, value: ActivityFormValues[Key]) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  function updateTitle(title: string) {
    setValues((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.title;
      if (!slugTouched) {
        delete next.slug;
      }
      return next;
    });
  }

  function updateGroup(index: number, value: string) {
    setValues((current) => ({
      ...current,
      groups: current.groups.map((group, groupIndex) => (groupIndex === index ? value : group)),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.groups;
      delete next[`groupName.${index}`];
      return next;
    });
  }

  function updateCriterion(index: number, field: keyof CriterionValue, value: string) {
    setValues((current) => ({
      ...current,
      criteria: current.criteria.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, [field]: value } : criterion,
      ),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.criteria;
      delete next[`criterion${field === "name" ? "Name" : "Description"}.${index}`];
      return next;
    });
  }

  function updateCoverImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFileName(file?.name ?? "");
    setCoverPreviewUrl(file ? URL.createObjectURL(file) : "");
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.coverImage;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/activities", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as ActivityResponse | null;

      if (!response.ok) {
        setFormError(payload?.error ?? "Activity could not be created.");
        setFieldErrors(payload?.fieldErrors ?? {});
        return;
      }

      router.push(`/admin?created=${encodeURIComponent(payload?.slug ?? values.slug)}`);
      router.refresh();
    } catch {
      setFormError("Activity could not be created. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <main className="min-h-dvh flex-1 bg-zinc-50 px-4 py-8 pb-28">
        <div className="mx-auto grid w-full max-w-5xl gap-7">
          <header className="grid gap-4">
            <Link className="text-sm font-medium text-zinc-600 transition hover:text-zinc-950" href="/admin">
              Back to admin / 返回後台
            </Link>
            <div className="grid gap-2">
              <h1 className="text-3xl font-semibold tracking-normal text-zinc-950">Create activity / 建立活動</h1>
              <p className="max-w-3xl text-base leading-7 text-zinc-600">
                Set up the public activity page, submission rules, review flow, and optional poster image in one form.
              </p>
            </div>
          </header>

          <form className="grid gap-5" id="activity-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800" role="alert">
                <p className="font-semibold">{formError}</p>
                {errorList.length ? (
                  <ul className="mt-2 list-disc pl-5">
                    {errorList.slice(0, 6).map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <Section
              id="activity-basics"
              step="01"
              title="Public page / 公開頁面"
              summary="Name, URL, short description, and poster shown to participants."
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
                <div className="grid gap-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField id="title" label="Activity name / 活動名稱" error={fieldErrors.title}>
                      {({ id, describedBy, invalid }) => (
                        <input
                          {...fieldProps({ describedBy, invalid })}
                          className={inputClassName}
                          id={id}
                          maxLength={120}
                          name="title"
                          onChange={(event) => updateTitle(event.currentTarget.value)}
                          required
                          value={values.title}
                        />
                      )}
                    </FormField>

                    <FormField
                      id="slug"
                      label="Public URL slug / 活動網址"
                      hint="Use lowercase English letters, numbers, and hyphens."
                      error={fieldErrors.slug}
                    >
                      {({ id, describedBy, invalid }) => (
                        <input
                          {...fieldProps({ describedBy, invalid })}
                          className={inputClassName}
                          id={id}
                          maxLength={80}
                          minLength={3}
                          name="slug"
                          onChange={(event) => {
                            setSlugTouched(true);
                            updateValue("slug", slugify(event.currentTarget.value));
                          }}
                          pattern="[a-z0-9-]+"
                          required
                          value={values.slug}
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField id="mode" label="Activity type / 活動類型" error={fieldErrors.mode}>
                    {({ id, describedBy, invalid }) => (
                      <select
                        {...fieldProps({ describedBy, invalid })}
                        className={inputClassName}
                        id={id}
                        name="mode"
                        onChange={(event) => updateValue("mode", event.currentTarget.value as ActivityFormValues["mode"])}
                        required
                        value={values.mode}
                      >
                        <option value="grading">Grading / 評審活動</option>
                        <option value="competition">Competition / 比賽活動</option>
                      </select>
                    )}
                  </FormField>

                  <FormField
                    id="description"
                    label="Short introduction / 活動簡介"
                    hint="This appears on the public activity page."
                    error={fieldErrors.description}
                  >
                    {({ id, describedBy, invalid }) => (
                      <textarea
                        {...fieldProps({ describedBy, invalid })}
                        className={textareaClassName}
                        id={id}
                        maxLength={1000}
                        name="description"
                        onChange={(event) => updateValue("description", event.currentTarget.value)}
                        required
                        value={values.description}
                      />
                    )}
                  </FormField>
                </div>

                <FormField
                  id="coverImage"
                  label="Poster / Cover image / 活動封面"
                  hint="JPG, PNG, or WebP. Keep text readable on mobile."
                  error={fieldErrors.coverImage}
                >
                  {({ id, describedBy, invalid }) => (
                    <div className="grid gap-3">
                      <label
                        className="flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-center text-sm font-medium text-zinc-600 transition hover:border-zinc-500 hover:bg-white"
                        htmlFor={id}
                      >
                        {coverPreviewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt="" className="h-full w-full object-cover" src={coverPreviewUrl} />
                        ) : (
                          <span className="px-4">Upload cover / 上傳封面</span>
                        )}
                      </label>
                      <input
                        {...fieldProps({ describedBy, invalid })}
                        accept="image/jpeg,image/png,image/webp"
                        className="text-sm text-zinc-700 file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:text-sm file:font-semibold file:text-white"
                        id={id}
                        name="coverImage"
                        onChange={updateCoverImage}
                        type="file"
                      />
                      {coverFileName ? <span className="text-xs font-medium text-zinc-600">{coverFileName}</span> : null}
                    </div>
                  )}
                </FormField>
              </div>
            </Section>

            <Section id="activity-schedule" step="02" title="Schedule / 時間表" summary="Dates must move forward in order.">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="submissionStartAt" label="Submissions open / 開始投稿" error={fieldErrors.submissionStartAt}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="submissionStartAt"
                      onChange={(event) => updateValue("submissionStartAt", event.currentTarget.value)}
                      required
                      type="datetime-local"
                      value={values.submissionStartAt}
                    />
                  )}
                </FormField>

                <FormField id="submissionDeadlineAt" label="Submission deadline / 投稿截止" error={fieldErrors.submissionDeadlineAt}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="submissionDeadlineAt"
                      onChange={(event) => updateValue("submissionDeadlineAt", event.currentTarget.value)}
                      required
                      type="datetime-local"
                      value={values.submissionDeadlineAt}
                    />
                  )}
                </FormField>

                <FormField id="judgingDeadlineAt" label="Judging deadline / 評審截止" error={fieldErrors.judgingDeadlineAt}>
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="judgingDeadlineAt"
                      onChange={(event) => updateValue("judgingDeadlineAt", event.currentTarget.value)}
                      required
                      type="datetime-local"
                      value={values.judgingDeadlineAt}
                    />
                  )}
                </FormField>

                <FormField
                  id="expectedResultAnnouncementAt"
                  label="Expected result date / 預計公佈結果"
                  error={fieldErrors.expectedResultAnnouncementAt}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="expectedResultAnnouncementAt"
                      onChange={(event) => updateValue("expectedResultAnnouncementAt", event.currentTarget.value)}
                      required
                      type="datetime-local"
                      value={values.expectedResultAnnouncementAt}
                    />
                  )}
                </FormField>
              </div>
            </Section>

            <Section
              id="submission-settings"
              step="03"
              title="Submission settings / 投稿設定"
              summary="Control participant limits and the review workflow."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  id="perParticipantSubmissionLimit"
                  label="Max submissions per participant / 每人最多投稿"
                  error={fieldErrors.perParticipantSubmissionLimit}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      max={20}
                      min={1}
                      name="perParticipantSubmissionLimit"
                      onChange={(event) => updateValue("perParticipantSubmissionLimit", event.currentTarget.value)}
                      required
                      type="number"
                      value={values.perParticipantSubmissionLimit}
                    />
                  )}
                </FormField>

                <FormField
                  id="maxImagesPerSubmission"
                  label="Max images per submission / 每份投稿最多圖片"
                  error={fieldErrors.maxImagesPerSubmission}
                >
                  {({ id, describedBy, invalid }) => (
                    <input
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      max={10}
                      min={1}
                      name="maxImagesPerSubmission"
                      onChange={(event) => updateValue("maxImagesPerSubmission", event.currentTarget.value)}
                      required
                      type="number"
                      value={values.maxImagesPerSubmission}
                    />
                  )}
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleField
                  checked={values.reviewRequired}
                  label="Admin review before approval / 投稿需先審核"
                  name="reviewRequired"
                  onChange={(checked) => updateValue("reviewRequired", checked)}
                />
                <ToggleField
                  checked={values.anonymousJudging}
                  label="Hide participant names from judges / 匿名評審"
                  name="anonymousJudging"
                  onChange={(checked) => updateValue("anonymousJudging", checked)}
                />
              </div>
            </Section>

            <Section id="payment" step="04" title="Payment / 付款" summary="Leave payment off for free activities.">
              <ToggleField
                checked={values.paymentRequired}
                label="Require payment / 需要付款"
                name="paymentRequired"
                onChange={(checked) => updateValue("paymentRequired", checked)}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <FormField id="paymentChargingMode" label="Charging mode / 收費方式" error={fieldErrors.paymentChargingMode}>
                  {({ id, describedBy, invalid }) => (
                    <select
                      {...fieldProps({ describedBy, invalid })}
                      className={inputClassName}
                      id={id}
                      name="paymentChargingMode"
                      onChange={(event) =>
                        updateValue("paymentChargingMode", event.currentTarget.value as ActivityFormValues["paymentChargingMode"])
                      }
                      required
                      value={values.paymentChargingMode}
                    >
                      <option value="per_card">Per card / 每張卡</option>
                      <option value="per_participant">Per participant / 每位參加者</option>
                    </select>
                  )}
                </FormField>
              </div>

              <FormField
                id="paymentInstructions"
                label="Payment instructions / 付款指示"
                hint="Required only when payment is on."
                error={fieldErrors.paymentInstructions}
              >
                {({ id, describedBy, invalid }) => (
                  <textarea
                    {...fieldProps({ describedBy, invalid })}
                    className={textareaClassName}
                    id={id}
                    maxLength={2000}
                    name="paymentInstructions"
                    onChange={(event) => updateValue("paymentInstructions", event.currentTarget.value)}
                    value={values.paymentInstructions}
                  />
                )}
              </FormField>
            </Section>

            <Section
              id="groups-criteria"
              step="05"
              title="Groups and judging / 組別及評分"
              summary="Use one group if everyone joins the same pool. Add at least one judging criterion."
            >
              {fieldErrors.groups ? <p className="text-sm font-medium text-red-700">{fieldErrors.groups}</p> : null}
              <div className="grid gap-5 md:grid-cols-2">
                {values.groups.map((group, index) => (
                  <FormField
                    error={fieldErrors[`groupName.${index}`]}
                    id={`groupName-${index}`}
                    key={index}
                    label={`Group ${index + 1} / 組別 ${index + 1}`}
                  >
                    {({ id, describedBy, invalid }) => (
                      <input
                        {...fieldProps({ describedBy, invalid })}
                        className={inputClassName}
                        id={id}
                        maxLength={80}
                        name="groupName"
                        onChange={(event) => updateGroup(index, event.currentTarget.value)}
                        required={index === 0}
                        value={group}
                      />
                    )}
                  </FormField>
                ))}
              </div>

              {fieldErrors.criteria ? <p className="text-sm font-medium text-red-700">{fieldErrors.criteria}</p> : null}
              <div className="grid gap-4">
                {values.criteria.map((criterion, index) => (
                  <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3" key={index}>
                    <FormField
                      error={fieldErrors[`criterionName.${index}`]}
                      id={`criterionName-${index}`}
                      label={`Criterion ${index + 1} / 評分準則 ${index + 1}`}
                    >
                      {({ id, describedBy, invalid }) => (
                        <input
                          {...fieldProps({ describedBy, invalid })}
                          className={inputClassName}
                          id={id}
                          maxLength={80}
                          name="criterionName"
                          onChange={(event) => updateCriterion(index, "name", event.currentTarget.value)}
                          required={index === 0}
                          value={criterion.name}
                        />
                      )}
                    </FormField>

                    <FormField
                      error={fieldErrors[`criterionDescription.${index}`]}
                      id={`criterionDescription-${index}`}
                      label="Description / 說明"
                    >
                      {({ id, describedBy, invalid }) => (
                        <textarea
                          {...fieldProps({ describedBy, invalid })}
                          className={compactTextareaClassName}
                          id={id}
                          maxLength={500}
                          name="criterionDescription"
                          onChange={(event) => updateCriterion(index, "description", event.currentTarget.value)}
                          value={criterion.description}
                        />
                      )}
                    </FormField>
                  </div>
                ))}
              </div>
            </Section>

            <Section id="rules" step="06" title="Rules / 活動規則" summary="Shown on the public activity page. Markdown is supported.">
              <FormField id="rulesMarkdown" label="Rules text / 規則內容" error={fieldErrors.rulesMarkdown}>
                {({ id, describedBy, invalid }) => (
                  <textarea
                    {...fieldProps({ describedBy, invalid })}
                    className="min-h-72 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-base text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 aria-invalid:border-red-500 aria-invalid:ring-red-100"
                    id={id}
                    name="rulesMarkdown"
                    onChange={(event) => updateValue("rulesMarkdown", event.currentTarget.value)}
                    required
                    value={values.rulesMarkdown}
                  />
                )}
              </FormField>
            </Section>
          </form>
        </div>
      </main>

      <BottomActionBar>
        <Button className="flex flex-1 items-center justify-center" disabled={isSubmitting} form="activity-form" type="submit">
          {isSubmitting ? "Creating... / 建立中..." : "Create activity / 建立活動"}
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
