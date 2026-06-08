// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireRole } from "./rbac";

const mocks = vi.hoisted(() => ({
  readSessionUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("./session", () => ({
  readSessionUser: mocks.readSessionUser,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

describe("role guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a signed-in user without the required role to login so they can switch accounts", async () => {
    mocks.readSessionUser.mockResolvedValue({
      id: "participant-1",
      email: "participant@example.test",
      displayName: "Participant",
      roles: ["participant"],
    });

    await expect(requireRole("admin")).rejects.toThrow("redirect:/account/login");
    expect(mocks.redirect).toHaveBeenCalledWith("/account/login");
  });
});
