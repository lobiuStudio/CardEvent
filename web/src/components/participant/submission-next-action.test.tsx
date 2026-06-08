import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmissionNextAction } from "./submission-next-action";

describe("SubmissionNextAction", () => {
  it("shows a payment checklist when proof is still needed", () => {
    render(
      <SubmissionNextAction
        activityId="activity-1"
        chargingMode="per_participant"
        paymentInstructions="FPS 123456"
        paymentRequired
        paymentStatus="pending"
        reviewStatus="not_required"
      />,
    );

    expect(screen.getByRole("heading", { name: "Next step / 下一步" })).toBeInTheDocument();
    expect(screen.getByText("Upload payment proof / 上載付款證明")).toBeInTheDocument();
    expect(screen.getByText("1. Card submitted / 已提交作品")).toBeInTheDocument();
    expect(screen.getByText("2. Upload proof / 上載證明")).toBeInTheDocument();
    expect(screen.getByText("3. Organizer confirms payment / 主辦方確認付款")).toBeInTheDocument();
    expect(screen.getByText("FPS 123456")).toBeInTheDocument();
  });
});
