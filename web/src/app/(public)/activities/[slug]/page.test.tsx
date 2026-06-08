import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActivityDetailPage from "./page";

const mocks = vi.hoisted(() => ({
  getActivityBySlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

vi.mock("@/lib/db/activity-repository", () => ({
  getActivityBySlug: mocks.getActivityBySlug,
}));

describe("ActivityDetailPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("summarizes entry requirements before long rules", async () => {
    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"));
    mocks.getActivityBySlug.mockResolvedValue({
      id: "activity-1",
      slug: "summer-cards",
      title: "Summer Cards",
      description: "Draw a card.",
      mode: "grading",
      rulesMarkdown: "Long rules",
      submissionStartAt: new Date("2026-06-01T12:00:00.000Z"),
      submissionDeadlineAt: new Date("2026-06-30T12:00:00.000Z"),
      judgingDeadlineAt: new Date("2026-07-15T12:00:00.000Z"),
      expectedResultAnnouncementAt: new Date("2026-07-30T12:00:00.000Z"),
      perParticipantSubmissionLimit: 2,
      maxImagesPerSubmission: 3,
      reviewRequired: true,
      anonymousJudging: false,
      paymentRequired: true,
      paymentInstructions: "PayMe 1234",
      paymentChargingMode: "per_participant",
      coverImagePublicUrl: null,
      resultsPublishedAt: null,
      groups: [{ id: "open", name: "Open", displayOrder: 1 }],
      criteria: [{ id: "craft", name: "Craft", description: "Quality", displayOrder: 1 }],
    });

    render(
      await ActivityDetailPage({
        params: Promise.resolve({ slug: "summer-cards" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Entry summary / 參加摘要" })).toBeInTheDocument();
    expect(screen.getByText("Accepting submissions / 正在接受投稿")).toBeInTheDocument();
    expect(screen.getByText("2 submissions per participant / 每人 2 份")).toBeInTheDocument();
    expect(screen.getByText("Up to 3 images / 最多 3 張圖片")).toBeInTheDocument();
    expect(screen.getByText("Payment required / 需要付款")).toBeInTheDocument();
    expect(screen.getByText("Organizer review / 主辦方審核")).toBeInTheDocument();
  });
});
