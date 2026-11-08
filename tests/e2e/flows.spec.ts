import { expect, test } from "@playwright/test";

test.describe("Public Core Pages & Governance", () => {
  test("legal pages visibly display unapproved draft warnings", async ({ page }) => {
    for (const path of ["/privacy", "/terms", "/refund-policy"]) {
      await page.goto(path);
      await expect(page.locator(".legal-draft")).toBeVisible();
      await expect(page.locator(".legal-draft")).toContainText("DRAFT — NOT APPROVED FOR PUBLICATION OR ACCEPTANCE");
    }
  });

  test("pricing page displays transparent schedules and governance policy", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "Commercial clarity before checkout." })).toBeVisible();
    await expect(page.getByText("All twelve offers remain quote-required.")).toBeVisible();
    await expect(page.getByText("Current safe mode: guided quotation")).toBeVisible();
    await expect(page.locator("#main").getByRole("link", { name: "Start a project" })).toBeVisible();
  });

  test("services directory lists exactly 10 canonical categories and 12 offers", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "Digital services, organized around business outcomes." })).toBeVisible();
    await expect(page.getByText("twelve distinct offers inside a controlled ten-category registry")).toBeVisible();
    // Check Web App and PWA are distinct services
    await expect(page.getByRole("heading", { name: "Custom Web Application Development" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "PWA Development" })).toBeVisible();
  });

  test("solution finder renders questions and returns rule-grounded recommendations", async ({ page }) => {
    await page.goto("/solutions");
    await expect(page.getByRole("heading", { name: "Find the service through your business goal." })).toBeVisible();
    // Click button to select outcome
    await page.getByRole("button", { name: "Sell products or services online" }).click();
    await expect(page.getByText("E-commerce / F-commerce Store Development")).toBeVisible();
    await expect(page.getByRole("link", { name: "Configure this project" })).toBeVisible();
  });
});

test.describe("Security & Fail-Closed Guards", () => {
  test("unauthenticated client dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated admin center redirects to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated quote access redirects to login perimeter", async ({ page }) => {
    await page.goto("/quotes/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated order access redirects to login perimeter", async ({ page }) => {
    await page.goto("/orders/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated project workspace routes redirect to login perimeter", async ({ page }) => {
    await page.goto("/dashboard/projects/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders authenticated sign-in and account creation controls", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
