import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentProofUploadForm } from "./payment-proof-upload-form";

describe("PaymentProofUploadForm", () => {
  it("posts per-card proof uploads with the submission id", () => {
    render(
      <PaymentProofUploadForm
        activityId="activity-1"
        chargingMode="per_card"
        submissionId="submission-1"
      />,
    );

    const form = screen.getByRole("form", { name: "Upload payment proof / 上載付款證明" });

    expect(form).toHaveAttribute("action", "/api/activities/activity-1/payment-proof");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute("enctype", "multipart/form-data");
    expect(screen.getByLabelText("Payment proof image / 付款證明圖片")).toHaveAttribute("name", "proof");
    expect(screen.getByDisplayValue("submission-1")).toHaveAttribute("name", "submissionId");
  });

  it("posts per-participant proof uploads without a submission id", () => {
    render(<PaymentProofUploadForm activityId="activity-1" chargingMode="per_participant" />);

    expect(screen.queryByDisplayValue("submission-1")).not.toBeInTheDocument();
    expect(screen.getByText("This proof covers your activity payment.")).toBeInTheDocument();
  });
});
