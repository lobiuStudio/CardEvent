import { expect, test } from "@playwright/test";

test("loads the CardEvent home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "CardEvent" })).toBeVisible();
  await expect(page.getByText("手繪卡牌評審及比賽平台")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse activities / 瀏覽活動" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in / 登入" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Admin dashboard / 管理後台" })).toBeVisible();
});
