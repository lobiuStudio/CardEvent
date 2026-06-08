import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ActivitiesPage from "./page";

const mocks = vi.hoisted(() => ({
  listPublishedActivities: vi.fn(),
}));

vi.mock("@/lib/db/activity-repository", () => ({
  listPublishedActivities: mocks.listPublishedActivities,
}));

function activity(overrides: Record<string, unknown>) {
  return {
    id: "activity-1",
    slug: "activity-1",
    title: "Activity",
    description: "Description",
    mode: "grading",
    submissionStartAt: new Date("2026-06-01T12:00:00.000Z"),
    submissionDeadlineAt: new Date("2026-06-30T12:00:00.000Z"),
    judgingDeadlineAt: new Date("2026-07-15T12:00:00.000Z"),
    expectedResultAnnouncementAt: new Date("2026-07-30T12:00:00.000Z"),
    resultsPublishedAt: null,
    coverImagePublicUrl: null,
    groups: [],
    criteria: [],
    ...overrides,
  };
}

describe("ActivitiesPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups participant-facing activities by the next action", async () => {
    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"));
    mocks.listPublishedActivities.mockResolvedValue([
      activity({
        id: "results",
        slug: "results",
        title: "Published Winner",
        mode: "competition",
        resultsPublishedAt: new Date("2026-06-07T12:00:00.000Z"),
      }),
      activity({
        id: "future",
        slug: "future",
        title: "Future Jam",
        submissionStartAt: new Date("2026-07-01T12:00:00.000Z"),
        submissionDeadlineAt: new Date("2026-07-30T12:00:00.000Z"),
      }),
      activity({
        id: "open",
        slug: "open",
        title: "Open Cards",
        coverImagePublicUrl: "/uploads/open-cover.png",
      }),
    ]);

    render(await ActivitiesPage());

    expect(screen.getByRole("heading", { name: "Accepting submissions / 接受投稿中" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Starting soon / 即將開始" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Results published / 結果已公布" })).toBeInTheDocument();

    const bodyText = document.body.textContent ?? "";
    expect(bodyText.indexOf("Open Cards")).toBeLessThan(bodyText.indexOf("Future Jam"));
    expect(bodyText.indexOf("Future Jam")).toBeLessThan(bodyText.indexOf("Published Winner"));

    const openCard = screen.getByRole("heading", { name: "Open Cards" }).closest("article");
    expect(openCard).not.toBeNull();
    const openCardQueries = within(openCard as HTMLElement);

    expect(openCardQueries.getByRole("link", { name: "View Open Cards details" })).toHaveAttribute("href", "/activities/open");
    expect(openCardQueries.getByRole("link", { name: "View rules & details / 查看規則及詳情" })).toHaveAttribute(
      "href",
      "/activities/open",
    );
    expect(openCardQueries.getByRole("link", { name: "Submit card / 提交卡牌" })).toHaveAttribute(
      "href",
      "/activities/open/submit",
    );

    const resultsCard = screen.getByRole("heading", { name: "Published Winner" }).closest("article");
    expect(resultsCard).not.toBeNull();
    const resultsCardQueries = within(resultsCard as HTMLElement);

    expect(resultsCardQueries.getByRole("link", { name: "View results / 查看結果" })).toHaveAttribute(
      "href",
      "/activities/results/results",
    );
    expect(resultsCardQueries.queryByRole("link", { name: "Submit card / 提交卡牌" })).not.toBeInTheDocument();
  });
});
