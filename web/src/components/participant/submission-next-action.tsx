import { PaymentProofUploadForm } from "@/components/forms/payment-proof-upload-form";

type SubmissionNextActionProps = {
  activityId: string;
  chargingMode: "per_card" | "per_participant";
  paymentInstructions?: string | null;
  paymentRequired: boolean;
  paymentStatus: string;
  reviewStatus: string;
  submissionId?: string;
};

function getNextAction(props: SubmissionNextActionProps): { label: string; detail: string } {
  if (props.paymentRequired && props.paymentStatus === "pending") {
    return {
      label: "Upload payment proof / 上載付款證明",
      detail: "Your card is submitted. Upload payment proof so the organizer can confirm it. / 作品已提交，請上載付款證明讓主辦方確認。",
    };
  }

  if (props.paymentRequired && props.paymentStatus === "rejected") {
    return {
      label: "Payment proof rejected / 付款證明未通過",
      detail: "Please upload a clearer or correct payment proof. / 請重新上載清晰或正確的付款證明。",
    };
  }

  if (props.reviewStatus === "pending") {
    return {
      label: "Waiting for organizer review / 等待主辦方審核",
      detail: "The organizer is checking your submission before it moves to judging. / 主辦方正在審核你的作品。",
    };
  }

  if (props.reviewStatus === "rejected") {
    return {
      label: "Review rejected / 審核未通過",
      detail: "This submission will not continue to judging. / 此作品不會進入評審。",
    };
  }

  return {
    label: "Waiting for results / 等待結果",
    detail: "No action is needed right now. / 目前無需操作。",
  };
}

function PaymentProofForm(props: SubmissionNextActionProps) {
  if (!props.paymentRequired || !["pending", "rejected"].includes(props.paymentStatus)) {
    return null;
  }

  if (props.chargingMode === "per_card") {
    return props.submissionId ? (
      <PaymentProofUploadForm activityId={props.activityId} chargingMode="per_card" submissionId={props.submissionId} />
    ) : null;
  }

  return <PaymentProofUploadForm activityId={props.activityId} chargingMode="per_participant" />;
}

export function SubmissionNextAction(props: SubmissionNextActionProps) {
  const action = getNextAction(props);
  const needsPaymentProof = props.paymentRequired && ["pending", "rejected"].includes(props.paymentStatus);

  return (
    <section className="grid gap-3 rounded-lg border-2 border-[var(--line)] bg-[var(--sky)] p-4">
      <div className="grid gap-1">
        <h3 className="text-lg font-black tracking-normal text-[var(--ink)]">Next step / 下一步</h3>
        <p className="text-base font-black leading-6 text-[var(--ink)]">{action.label}</p>
        <p className="text-sm leading-6 text-[var(--ink-muted)]">{action.detail}</p>
      </div>

      {needsPaymentProof ? (
        <ul className="grid gap-2 text-sm font-bold leading-6 text-[var(--ink)]">
          <li className="rounded-md border-2 border-[var(--line)] bg-white px-3 py-2">1. Card submitted / 已提交作品</li>
          <li className="rounded-md border-2 border-[var(--line)] bg-white px-3 py-2">2. Upload proof / 上載證明</li>
          <li className="rounded-md border-2 border-[var(--line)] bg-white px-3 py-2">
            3. Organizer confirms payment / 主辦方確認付款
          </li>
        </ul>
      ) : null}

      {needsPaymentProof && props.paymentInstructions ? (
        <div className="whitespace-pre-wrap rounded-md border-2 border-[var(--line)] bg-white p-3 text-sm leading-6 text-[var(--ink-muted)]">
          {props.paymentInstructions}
        </div>
      ) : null}

      <PaymentProofForm {...props} />
    </section>
  );
}
