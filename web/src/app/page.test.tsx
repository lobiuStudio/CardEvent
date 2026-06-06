import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home page", () => {
  it("shows bilingual CardEvent preview entry points", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "CardEvent" })).toBeInTheDocument();
    expect(screen.getByText("手繪卡牌評審及比賽平台")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse activities / 瀏覽活動" })).toHaveAttribute("href", "/activities");
    expect(screen.getByRole("link", { name: "Sign in / 登入" })).toHaveAttribute("href", "/account/login");
    expect(screen.getByRole("link", { name: "Admin dashboard / 管理後台" })).toHaveAttribute("href", "/admin");
  });
});
