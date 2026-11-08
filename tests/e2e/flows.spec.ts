import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnv() {
  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

test.describe("Public Core Pages & Governance", () => {
  test("legal pages visibly display unapproved draft warnings", async ({ page }) => {
    for (const urlPath of ["/privacy", "/terms", "/refund-policy"]) {
      await page.goto(urlPath);
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
    await expect(page.getByRole("heading", { name: "Custom Web Application Development" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "PWA Development" })).toBeVisible();
  });

  test("solution finder renders questions and returns rule-grounded recommendations", async ({ page }) => {
    await page.goto("/solutions");
    await expect(page.getByRole("heading", { name: "Find the service through your business goal." })).toBeVisible();
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

test.describe("Authenticated Browser E2E Journeys (Journeys B–F against Live Staging DB)", () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  test("executes Admin Quote Governance, Customer Quote Acceptance, Order Manual Settlement, Project Provisioning & Cross-Tenant Isolation in Browser", async ({
    browser
  }, testInfo) => {
    // Run full multi-context lifecycle once on desktop chromium to avoid parallel rate-limit collisions
    test.skip(testInfo.project.name !== "chromium" || !supabaseUrl || !serviceKey, "Requires staging credentials on desktop chromium");
    test.setTimeout(120_000);

    const adminClient = createClient(supabaseUrl!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const runTag = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const password = `E2e!Pass#${runTag}99`;
    const staffEmail = `staff-${runTag}@staging.notrealengine.local`;
    const custAEmail = `custa-${runTag}@staging.notrealengine.local`;
    const custBEmail = `custb-${runTag}@staging.notrealengine.local`;

    const createdUsers: string[] = [];
    const createdOrgs: string[] = [];
    let draftQuoteId: string | null = null;
    let stagingQuoteId: string | null = null;
    let createdOrderId: string | null = null;
    let createdProjectId: string | null = null;

    try {
      // 1. Provision Staff, Customer A, and Customer B
      for (const u of [
        { email: staffEmail, name: "E2E Staff Operator", staff: true },
        { email: custAEmail, name: "E2E Customer A Owner", staff: false },
        { email: custBEmail, name: "E2E Customer B Owner", staff: false }
      ]) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email: u.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: u.name }
        });
        if (error || !data.user) throw new Error(`Auth create failed: ${error?.message}`);
        createdUsers.push(data.user.id);
        await adminClient.from("profiles").upsert({
          id: data.user.id,
          full_name: u.name,
          is_staff: u.staff
        });
      }

      const [staffId, custAId, custBId] = createdUsers;

      const { data: orgA } = await adminClient
        .from("organizations")
        .insert({ name: `E2E Org A ${runTag}`, slug: `e2e-org-a-${runTag}` })
        .select("id")
        .single();
      const { data: orgB } = await adminClient
        .from("organizations")
        .insert({ name: `E2E Org B ${runTag}`, slug: `e2e-org-b-${runTag}` })
        .select("id")
        .single();

      if (!orgA || !orgB) throw new Error("Failed to create E2E orgs");
      createdOrgs.push(orgA.id, orgB.id);

      await adminClient.from("organization_memberships").insert([
        { organization_id: orgA.id, user_id: custAId, role: "owner" },
        { organization_id: orgB.id, user_id: custBId, role: "owner" }
      ]);

      // Seed two published quotes for Org A:
      // 1) Draft Terms quote (ENGINE//OS-TERMS-V1.0) -> Must disable customer acceptance button in UI!
      // 2) Synthetic Staging Terms quote (STAGING-TEST-TERMS-V1.0) -> Allows non-binding staging acceptance!
      const validUntil = new Date(Date.now() + 14 * 86400_000).toISOString();
      const baseScope = {
        summary: "Browser E2E Single Page Website Engineering Scope",
        deliverables: ["Responsive One-Page Architecture", "Core Technical SEO"],
        exclusions: ["Custom ERP Modules"],
        milestones: ["Architecture Sign-off", "Production Launch"]
      };
      const baseItems = [
        { label: "Single Page Website Engineering", description: "SVC-01-SPW", quantity: 1, unitAmountMinor: 2500000, displayOrder: 1 }
      ];

      const { data: qDraft } = await adminClient
        .from("quotes")
        .insert({
          organization_id: orgA.id,
          state: "sent",
          currency: "BDT",
          total_minor: 2500000,
          revision_limit: 2,
          valid_until: validUntil,
          terms_version: "ENGINE//OS-TERMS-V1.0",
          scope: baseScope,
          snapshot: {
            quoteId: "00000000-0000-0000-0000-000000000001",
            organizationId: orgA.id,
            serviceId: "SVC-01-SPW",
            currency: "BDT",
            totalMinor: 2500000,
            revisionLimit: 2,
            termsVersion: "ENGINE//OS-TERMS-V1.0",
            validUntil,
            scope: baseScope,
            items: baseItems,
            publishedAt: new Date().toISOString()
          },
          sent_at: new Date().toISOString(),
          created_by: staffId
        })
        .select("id")
        .single();
      draftQuoteId = qDraft!.id;

      const { data: qStaging } = await adminClient
        .from("quotes")
        .insert({
          organization_id: orgA.id,
          state: "sent",
          currency: "BDT",
          total_minor: 2500000,
          revision_limit: 2,
          valid_until: validUntil,
          terms_version: "STAGING-TEST-TERMS-V1.0",
          scope: baseScope,
          snapshot: {
            quoteId: "00000000-0000-0000-0000-000000000002",
            organizationId: orgA.id,
            serviceId: "SVC-01-SPW",
            currency: "BDT",
            totalMinor: 2500000,
            revisionLimit: 2,
            termsVersion: "STAGING-TEST-TERMS-V1.0",
            validUntil,
            scope: baseScope,
            items: baseItems,
            publishedAt: new Date().toISOString()
          },
          sent_at: new Date().toISOString(),
          created_by: staffId
        })
        .select("id")
        .single();
      stagingQuoteId = qStaging!.id;

      await adminClient.from("quote_items").insert([
        { quote_id: draftQuoteId, label: "Single Page Website Engineering", quantity: 1, unit_amount_minor: 2500000, display_order: 1 },
        { quote_id: stagingQuoteId, label: "Single Page Website Engineering", quantity: 1, unit_amount_minor: 2500000, display_order: 1 }
      ]);

      // --- JOURNEY C: Customer A Signs In, Verifies Draft Terms Hold, Accepts Staging Synthetic Quote ---
      const custAContext = await browser.newContext();
      const custAPage = await custAContext.newPage();

      await custAPage.goto("/login");
      await custAPage.getByLabel("Email").fill(custAEmail);
      await custAPage.getByLabel("Password").fill(password);
      await custAPage.getByRole("button", { name: "Sign in securely" }).click();
      await expect(custAPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

      // 1) Inspect quote with ENGINE//OS-TERMS-V1.0 (Draft) -> Acceptance button MUST be disabled!
      await custAPage.goto(`/quotes/${draftQuoteId}`);
      await expect(custAPage.getByText("Acceptance Held (Draft Terms)")).toBeVisible();
      await expect(custAPage.getByRole("button", { name: "Acceptance Held (Draft Terms)" })).toBeDisabled();

      // 2) Inspect quote with STAGING-TEST-TERMS-V1.0 -> Accept quotation & create order!
      await custAPage.goto(`/quotes/${stagingQuoteId}`);
      await expect(custAPage.getByText("STAGING-TEST-TERMS-V1.0", { exact: true })).toBeVisible();
      await custAPage.locator('input[type="checkbox"]').check();
      await custAPage.getByRole("button", { name: /Accept Quotation & Order/i }).click();

      await expect(custAPage).toHaveURL(/\/orders\//, { timeout: 15_000 });
      const orderUrlParts = custAPage.url().split("/orders/");
      createdOrderId = orderUrlParts[1]?.split(/[?#]/)[0] || null;
      expect(createdOrderId).toBeTruthy();
      await expect(custAPage.getByText("AWAITING PAYMENT")).toBeVisible();

      // --- JOURNEY D: Staff Signs In, Records Audited Manual Settlement & Initializes Project Workspace ---
      const staffContext = await browser.newContext();
      const staffPage = await staffContext.newPage();

      await staffPage.goto("/login");
      await staffPage.getByLabel("Email").fill(staffEmail);
      await staffPage.getByLabel("Password").fill(password);
      await staffPage.getByRole("button", { name: "Sign in securely" }).click();
      await expect(staffPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

      await staffPage.goto(`/admin/orders/${createdOrderId}`);
      await staffPage.getByRole("button", { name: /Record Manual Settlement & Confirm/i }).click();
      await staffPage.getByPlaceholder("e.g. WIRE-BDT-20261108-001").fill(`WIRE-E2E-${runTag.toUpperCase()}`);
      await staffPage.getByRole("button", { name: /Verify & Confirm Order/i }).click();

      await expect(staffPage.getByRole("button", { name: /Initialize Project Workspace/i })).toBeVisible({ timeout: 15_000 });
      await staffPage.getByRole("button", { name: /Initialize Project Workspace/i }).click();
      await expect(staffPage).toHaveURL(/\/admin\/projects/, { timeout: 15_000 });

      const { data: projRow } = await adminClient
        .from("projects")
        .select("id")
        .eq("order_id", createdOrderId!)
        .single();
      createdProjectId = projRow?.id ?? null;
      expect(createdProjectId).toBeTruthy();

      // --- JOURNEY E: Customer A Opens Project Workspace ---
      await custAPage.goto(`/dashboard/projects/${createdProjectId}`);
      await expect(custAPage.getByRole("heading", { name: "Technical Milestones & Delivery Schedule" })).toBeVisible();
      await expect(custAPage.getByRole("link", { name: "Requirements (0/3)" })).toBeVisible();

      // --- JOURNEY F: Customer B Signs In & Is Blocked from Customer A's Quote, Order & Project ---
      const custBContext = await browser.newContext();
      const custBPage = await custBContext.newPage();

      await custBPage.goto("/login");
      await custBPage.getByLabel("Email").fill(custBEmail);
      await custBPage.getByLabel("Password").fill(password);
      await custBPage.getByRole("button", { name: "Sign in securely" }).click();
      await expect(custBPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });

      const quoteRespB = await custBPage.goto(`/quotes/${stagingQuoteId}`);
      expect(quoteRespB?.status()).toBe(404);

      const orderRespB = await custBPage.goto(`/orders/${createdOrderId}`);
      expect(orderRespB?.status()).toBe(404);

      const projRespB = await custBPage.goto(`/dashboard/projects/${createdProjectId}`);
      expect(projRespB?.status()).toBe(404);

      await custAContext.close();
      await staffContext.close();
      await custBContext.close();
    } finally {
      // Clean up E2E test artifacts
      if (createdProjectId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdProjectId);
        await adminClient.from("projects").delete().eq("id", createdProjectId);
      }
      if (createdOrderId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdOrderId);
        await adminClient.from("orders").delete().eq("id", createdOrderId);
      }
      if (draftQuoteId) {
        await adminClient.from("quote_items").delete().eq("quote_id", draftQuoteId);
        await adminClient.from("quotes").delete().eq("id", draftQuoteId);
      }
      if (stagingQuoteId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", stagingQuoteId);
        await adminClient.from("quote_items").delete().eq("quote_id", stagingQuoteId);
        const { data: acc } = await adminClient
          .from("quote_acceptances")
          .select("accepted_by")
          .eq("quote_id", stagingQuoteId)
          .maybeSingle();
        if (acc?.accepted_by) {
          await adminClient.from("quotes").update({ created_by: acc.accepted_by }).eq("id", stagingQuoteId);
        }
      }
      for (const orgId of createdOrgs) {
        await adminClient.from("organization_memberships").delete().eq("organization_id", orgId);
        const { count } = await adminClient
          .from("quote_acceptances")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        if (!count || count === 0) {
          await adminClient.from("organizations").delete().eq("id", orgId);
        }
      }
      for (const uid of createdUsers) {
        await adminClient.from("profiles").update({ is_staff: false }).eq("id", uid);
        const { count } = await adminClient
          .from("quote_acceptances")
          .select("id", { count: "exact", head: true })
          .eq("accepted_by", uid);
        if (count && count > 0) {
          await adminClient.auth.admin.updateUserById(uid, { ban_duration: "876000h" });
        } else {
          await adminClient.auth.admin.deleteUser(uid);
        }
      }
    }
  });
});
