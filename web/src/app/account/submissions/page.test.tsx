import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AccountSubmissionsPage from "./page";

const mocks = vi.hoisted(() => ({
  listParticipantSubmissions: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/auth/rbac", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/db/submission-repository", () => ({
  listParticipantSubmissions: mocks.listParticipantSubmissions,
}));

describe("AccountSubmissionsPage", () => {
  it("shows account navigation and the active signed-in user", async () => {
    mocks.requireUser.mockResolvedValue({
      id: "user-1",
      email: "participant@example.com",
      displayName: "Participant One",
      roles: ["participant"],
    });
    mocks.listParticipantSubmissions.mockResolvedValue([]);

    render(await AccountSubmissionsPage());

    expect(screen.getByRole("link", { name: "Back to activities / 返回活動列表" })).toHaveAttribute("href", "/activities");
    expect(screen.getByText("Signed in")).toBeInTheDocument();
    expect(screen.getByText("已登入")).toBeInTheDocument();
    expect(screen.getByText("Participant One")).toBeInTheDocument();
    expect(screen.getByText("participant@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out / 登出" })).toBeInTheDocument();
  });
});
