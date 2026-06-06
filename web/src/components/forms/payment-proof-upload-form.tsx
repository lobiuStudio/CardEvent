import { Button } from "@/components/ui/button";
import { BilingualText } from "@/components/ui/bilingual-text";
import { bilingualLabel } from "@/lib/i18n/bilingual";
import { acceptedImageMimeTypes, maxSubmissionImageBytes } from "@/lib/validation/submission";

type PaymentProofUploadFormProps =
  | {
      activityId: string;
      chargingMode: "per_card";
      submissionId: string;
    }
  | {
      activityId: string;
      chargingMode: "per_participant";
      submissionId?: never;
    };

export function PaymentProofUploadForm(props: PaymentProofUploadFormProps) {
  const hint =
    props.chargingMode === "per_card"
      ? "This proof covers this card submission."
      : "This proof covers your activity payment.";

  return (
    <form
      action={`/api/activities/${props.activityId}/payment-proof`}
      aria-label={bilingualLabel({ en: "Upload payment proof", zh: "上載付款證明" })}
      className="grid gap-3 rounded-md border-2 border-[var(--line)] bg-white p-3"
      encType="multipart/form-data"
      method="post"
    >
      {props.chargingMode === "per_card" ? <input name="submissionId" type="hidden" value={props.submissionId} /> : null}
      <div className="grid gap-1.5">
        <label className="text-sm font-black text-[var(--ink)]" htmlFor={`proof-${props.activityId}-${props.submissionId ?? "activity"}`}>
          <BilingualText en="Payment proof image" zh="付款證明圖片" />
        </label>
        <input
          accept={acceptedImageMimeTypes.join(",")}
          className="min-h-12 w-full rounded-md border-2 border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] file:mr-3 file:rounded-md file:border-2 file:border-[var(--line)] file:bg-[var(--sun)] file:px-3 file:py-2 file:text-sm file:font-black file:text-[var(--ink)]"
          id={`proof-${props.activityId}-${props.submissionId ?? "activity"}`}
          name="proof"
          required
          type="file"
        />
        <p className="text-xs font-medium leading-5 text-[var(--ink-muted)]">
          {hint}
          <span className="block" lang="zh-HK">
            支援 JPG、PNG 或 WebP，檔案上限 {Math.floor(maxSubmissionImageBytes / 1024 / 1024)}MB。
          </span>
        </p>
      </div>
      <Button type="submit">
        <BilingualText en="Upload proof" zh="上載證明" />
      </Button>
    </form>
  );
}
