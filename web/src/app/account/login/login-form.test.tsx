import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("LoginForm", () => {
  it("shows a sign-out control when another session is already active", () => {
    render(
      <LoginForm
        currentUser={{
          displayName: "Admin",
          email: "lobiuhoyeah@gmail.com",
          roles: ["admin"],
        }}
      />,
    );

    expect(screen.getByText("Signed in as lobiuhoyeah@gmail.com")).toBeInTheDocument();

    const signOutButton = screen.getByRole("button", { name: "Sign out / 登出" });
    const signOutForm = signOutButton.closest("form");

    expect(signOutForm).toHaveAttribute("action", "/account/logout");
    expect(signOutForm).toHaveAttribute("method", "post");
    expect(screen.getByRole("link", { name: "Continue to admin / 進入後台" })).toHaveAttribute("href", "/admin");
  });
});
