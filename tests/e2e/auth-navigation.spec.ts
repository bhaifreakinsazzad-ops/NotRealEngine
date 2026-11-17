import { expect, test } from "@playwright/test";

test("admin sign-in retains its original destination", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?.*next=%2Fadmin/);
  await expect(page.locator('input[name="next"]')).toHaveValue("/admin");
});

test("malicious login return URL is rejected", async ({ page }) => {
  await page.goto("/login?next=%2F%2Fevil.example");
  await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
});

test("expired recovery access does not show a password-change form", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("heading", { name: "Reset access" })).toBeVisible();
});
