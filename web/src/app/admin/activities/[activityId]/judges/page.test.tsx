import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminJudgesPage from "./page";

const mocks = vi.hoisted(() => ({
  activityFindUnique: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/auth/rbac", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    activity: {
      findUnique: mocks.activityFindUnique,
    },
  },
}));

describe("AdminJudgesPage", () => {
  it("shows saved invitation links so admins can resend them later", async () => {
    process.env.APP_BASE_URL = "https://cardevent.test";
    mocks.activityFindUnique.mockResolvedValue({
      id: "activity-1",
      slug: "summer-cards",
      title: "Summer Cards",
      judgeInvitations: [
        {
          id: "invitation-1",
          email: "judge@example.com",
          rawToken: "saved-token",
          acceptedAt: null,
          expiresAt: new Date("2026-07-01T00:00:00.000Z"),
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        },
      ],
      judgeMemberships: [],
    });

    render(
      await AdminJudgesPage({
        params: Promise.resolve({ activityId: "activity-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    const invitationLink = screen.getByRole("link", {
      name: "https://cardevent.test/judge/invite/saved-token",
    });

    expect(invitationLink).toHaveAttribute("href", "https://cardevent.test/judge/invite/saved-token");
  });
});
