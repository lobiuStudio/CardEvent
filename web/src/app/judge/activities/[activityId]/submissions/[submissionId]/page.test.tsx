import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JudgeScoringPage from "./page";

const mocks = vi.hoisted(() => ({
  findMembership: vi.fn(),
  findScores: vi.fn(),
  findSubmission: vi.fn(),
  listJudgeEligibleSubmissions: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
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
      findUnique: mocks.findMembership,
    },
    submission: {
      findFirst: mocks.findSubmission,
    },
    score: {
      findMany: mocks.findScores,
    },
  },
}));

describe("JudgeScoringPage", () => {
  it("offers save-and-next and leaves enough room for the sticky action bar", async () => {
    mocks.requireRole.mockResolvedValue({ id: "judge-1", email: "judge@example.test" });
    mocks.findMembership.mockResolvedValue({ id: "membership-1" });
    mocks.listJudgeEligibleSubmissions.mockResolvedValue([
      { id: "submission-0", cardName: "Previous Card" },
      { id: "submission-1", cardName: "First Card" },
      { id: "submission-2", cardName: "Second Card" },
    ]);
    mocks.findScores.mockResolvedValue([
      { criterionId: "creativity", submissionId: "submission-0", value: 8 },
    ]);
    mocks.findSubmission.mockResolvedValue({
      id: "submission-1",
      cardName: "First Card",
      deletedAt: null,
      reviewStatus: "not_required",
      paymentStatus: "not_required",
      activity: {
        title: "Judge Cup",
        reviewRequired: false,
        paymentRequired: false,
        criteria: [{ id: "creativity", name: "Creativity", description: "Original idea." }],
      },
      group: null,
      images: [],
      scores: [],
      judgeComments: [],
    });

    const { container } = render(
      await JudgeScoringPage({
        params: Promise.resolve({ activityId: "activity-1", submissionId: "submission-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const saveAndNext = screen.getByRole("button", { name: "Save and next" });
    expect(saveAndNext).toHaveAttribute("name", "nextSubmissionId");
    expect(saveAndNext).toHaveAttribute("value", "submission-2");
    expect(screen.getByText("Submission 2 of 3 / 第 2 份，共 3 份")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Judging workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Scoring context" })).toBeInTheDocument();
    expect(screen.getByText("Average so far / 暫時平均")).toBeInTheDocument();
    expect(screen.getByText("Creativity: 8.0 / 10")).toBeInTheDocument();
    expect(screen.getByText("Previous scored card: Previous Card")).toBeInTheDocument();
    expect(container.querySelector("main")).toHaveClass("pb-44");
  });
});
