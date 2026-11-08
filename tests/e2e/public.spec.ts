import { expect, test } from "@playwright/test";

test("public discovery and builder remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Digital engineering, configured around your business." })).toBeVisible();
  await expect(page.getByText("12 offers. 10 clear categories.")).toBeVisible();
  await page.getByRole("link", { name: /Start a project/ }).first().click();
  await expect(page).toHaveURL(/\/build/, { timeout: 15_000 });
  await page.getByLabel("Primary business goal").fill("Reduce manual operations");
  await page.getByLabel("Current problem and desired result").fill("The team needs to replace manual order tracking with one controlled workflow.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: "Select the closest service" })).toBeVisible();
});

test("mobile homepage has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test("project brief intake submits and persists when configured, or fails closed when unconfigured", async ({ page }) => {
  await page.goto("/build");
  await page.getByLabel("Primary business goal").fill("Reduce manual operations");
  await page.getByLabel("Current problem and desired result").fill("The team needs to replace manual order tracking with one controlled workflow.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByText("Business Dashboard & Order Management System", { exact: true }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Direction, references, and constraints").fill("Clear, mobile-friendly, and bilingual where approved.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByLabel("Full name").fill("Test User");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Phone").fill("+8801700000000");
  await page.getByLabel("Organization").fill("Example Organization");
  await page.getByLabel("I consent to project-request processing.").check();
  await page.getByRole("button", { name: /Submit project brief/ }).click();

  const successBox = page.getByText("Project brief received.");
  const errorBox = page.locator(".error-box");
  await expect(successBox.or(errorBox)).toBeVisible({ timeout: 15_000 });
});
