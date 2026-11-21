import { expect, test } from "@playwright/test";

test("public discovery and v5 builder remain usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Designed to impress/i })).toBeVisible();
  await expect(page.getByText(/22 official services/i)).toBeVisible();
  await page.getByRole("link", { name: /Start a project/i }).first().click();
  await expect(page).toHaveURL(/\/build/, { timeout: 15_000 });
  await page.getByLabel("Primary goal").fill("Reduce manual operations");
  await page
    .getByLabel(/Current workflow, challenges/i)
    .fill("The team needs to replace manual order tracking with one controlled workflow.");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByRole("heading", { name: /Select a canonical v5 service/i })).toBeVisible();
});

test("mobile homepage has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(overflow).toBe(false);
});

test("small mobile homepage stays inside 320px viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(320);
});

test("NRE LAB free tools and NRE PULSE render cleanly without login", async ({ page }) => {
  await page.goto("/labs");
  await expect(page.getByRole("heading", { name: /Plan your build/i })).toBeVisible();
  await page.getByRole("button", { name: /Generate Structured Output/i }).click();
  await expect(page.getByText(/RESULT · DETERMINISTIC-RULES-V1/i)).toBeVisible({ timeout: 10_000 });

  await page.goto("/pulse");
  await expect(page.getByRole("heading", { name: /Human-led · Expert-backed · AI-assisted/i })).toBeVisible();
  await expect(page.getByText("M07")).toBeVisible();
});
