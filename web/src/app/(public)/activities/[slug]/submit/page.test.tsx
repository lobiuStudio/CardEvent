import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SubmitActivityPage from "./page";

const mocks = vi.hoisted(() => ({
  getActivityBySlug: vi.fn(),
  readSessionUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("not found");
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  readSessionUser: mocks.readSessionUser,
}));

vi.mock("@/lib/db/activity-repository", () => ({
  getActivityBySlug: mocks.getActivityBySlug,
}));

vi.mock("@/lib/db/submission-repository", () => ({
  countParticipantSubmissions: vi.fn(),
}));

describe("SubmitActivityPage", () => {
  it("keeps participants on the submission flow after login or registration", async () => {
    mocks.readSessionUser.mockResolvedValue(null);
    mocks.getActivityBySlug.mockResolvedValue({
      id: "activity-1",
      slug: "summer-cards",
    });

    render(
      await SubmitActivityPage({
        params: Promise.resolve({ slug: "summer-cards" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("link", { name: /Sign in.*登入/ })).toHaveAttribute(
      "href",
      "/account/login?returnTo=%2Factivities%2Fsummer-cards%2Fsubmit",
    );
    expect(screen.getByRole("link", { name: /Create account.*建立帳戶/ })).toHaveAttribute(
      "href",
      "/account/register?returnTo=%2Factivities%2Fsummer-cards%2Fsubmit",
    );
  });
});
