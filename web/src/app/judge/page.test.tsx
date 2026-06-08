import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import JudgePage from "./page";

const mocks = vi.hoisted(() => ({
  findMemberships: vi.fn(),
  findScores: vi.fn(),
  listJudgeEligibleSubmissions: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/auth/rbac", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/db/judge-repository", () => ({
  listJudgeEligibleSubmissions: mocks.listJudgeEligibleSubmissions,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    judgeMembership: {
      findMany: mocks.findMemberships,
    },
    score: {
      findMany: mocks.findScores,
    },
  },
}));

describe("JudgePage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prioritizes unscored submissions and shows judging progress", async () => {
    vi.setSystemTime(new Date("2026-06-08T12:00:00.000Z"));
    mocks.requireRole.mockResolvedValue({ id: "judge-1", email: "judge@example.test" });
    mocks.findMemberships.mockResolvedValue([
      {
        id: "membership-1",
        activityId: "activity-1",
        activity: {
          title: "Judge Cup",
          judgingDeadlineAt: new Date("2026-06-10T12:00:00.000Z"),
          criteria: [{ id: "creativity" }, { id: "finish" }],
        },
      },
    ]);
    mocks.listJudgeEligibleSubmissions.mockResolvedValue([
      { id: "submission-1", cardName: "Scored Card" },
      { id: "submission-2", cardName: "Needs Work" },
    ]);
    mocks.findScores.mockResolvedValue([
      { criterionId: "creativity", submissionId: "submission-1" },
      { criterionId: "finish", submissionId: "submission-1" },
    ]);

    render(await JudgePage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("progressbar", { name: "Judge Cup judging progress" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("1 remaining / 尚餘 1 份")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next unscored: Needs Work" })).toHaveAttribute(
      "href",
      "/judge/activities/activity-1/submissions/submission-2",
    );

    const bodyText = document.body.textContent ?? "";
    expect(bodyText.indexOf("Needs Work")).toBeLessThan(bodyText.indexOf("Scored Card"));
  });
});
