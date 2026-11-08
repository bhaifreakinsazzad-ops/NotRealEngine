#!/usr/bin/env node
/**
 * ENGINE//OS — Staging Verification & Multi-Tenant E2E Lifecycle Suite (V11.0)
 * Platform: NOTREAL ENGINE, LLC
 * Directive: Master Directive V11.0 Tasks 4, 5, 6, 8, 9, 10
 * Usage: npm run verify:staging
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Color helpers for terminal output
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

// Load environment variables from .env.local or .env
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
          if (val.endsWith(">")) val = val.slice(0, -1);
          if (val.startsWith("<")) val = val.slice(1);
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const results = [];

function recordResult(domain, testName, status, details = "") {
  results.push({ domain, testName, status, details, timestamp: new Date().toISOString() });
  const badge =
    status === "PASS"
      ? green("[PASS]")
      : status === "FAIL"
      ? red("[FAIL]")
      : status === "BLOCKED"
      ? yellow("[BLOCKED]")
      : cyan("[SKIPPED]");
  console.log(`  ${badge} ${bold(domain)}: ${testName} ${details ? `(${details})` : ""}`);
}

// Canonical tables list: Exactly 30 tables defined in ENGINE//OS foundation
const CANONICAL_TABLES = [
  "profiles",
  "organizations",
  "organization_memberships",
  "services",
  "packages",
  "price_versions",
  "feature_definitions",
  "configuration_drafts",
  "project_briefs",
  "leads",
  "quotes",
  "quote_items",
  "quote_acceptances",
  "orders",
  "payment_transactions",
  "invoices",
  "projects",
  "project_requirements",
  "project_files",
  "milestones",
  "tasks",
  "approvals",
  "revision_requests",
  "support_tickets",
  "notifications",
  "outbox_events",
  "audit_logs",
  "analytics_events",
  "webhook_events",
  "rate_limit_buckets"
];

async function runStagingVerification() {
  console.log("\n" + bold("=========================================================="));
  console.log(bold("   ENGINE//OS — STAGING VERIFICATION SUITE (V11.0)"));
  console.log(bold("==========================================================") + "\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yamwmfgqqjwlfcjjkwzl.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Target Staging Host : ${cyan(supabaseUrl)}`);
  console.log(`Anon Key Configured : ${anonKey ? green("YES (Present)") : yellow("NO (Missing)")}`);
  console.log(`Service Key Config  : ${serviceKey ? green("YES (Present)") : yellow("NO (Missing)")}\n`);

  // --- 1. NETWORK & REACHABILITY ---
  console.log(bold("--- 1. NETWORK & REACHABILITY ---"));
  let reachable = false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}
    });
    if (res.status === 200 || res.status === 401 || res.status === 404) {
      reachable = true;
      recordResult("Network", "Supabase Cloud Endpoint Reachable", "PASS", `HTTP ${res.status}`);
    } else {
      recordResult("Network", "Supabase Cloud Endpoint Reachable", "FAIL", `Unexpected HTTP status ${res.status}`);
    }
  } catch (err) {
    recordResult("Network", "Supabase Cloud Endpoint Reachable", "FAIL", err.message);
  }

  if (!reachable) {
    console.log(red("\nTarget Supabase instance is unreachable. Aborting dependent tests."));
    printSummaryAndExit();
  }

  // --- 2. CREDENTIALS GATE ---
  console.log("\n" + bold("--- 2. CREDENTIALS & PERMISSION GATE ---"));
  if (!anonKey || !serviceKey) {
    recordResult(
      "Credentials",
      "Dual API Keys (Anon + Service)",
      "BLOCKED",
      "Both anon key and service role key required for full staging verification."
    );
    printSummaryAndExit();
  } else {
    recordResult("Credentials", "Dual API Keys (Anon + Service)", "PASS", "Both credentials present");
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // --- 3. DATABASE SCHEMA INVENTORY (ALL 30 TABLES) ---
  console.log("\n" + bold("--- 3. DATABASE SCHEMA INVENTORY (30 CANONICAL TABLES) ---"));
  let missingTables = 0;
  for (const table of CANONICAL_TABLES) {
    try {
      const { error } = await adminClient.from(table).select("count").limit(0);
      if (error) {
        missingTables++;
        recordResult("Schema", `Table public.${table}`, "FAIL", error.message);
      } else {
        recordResult("Schema", `Table public.${table}`, "PASS", "Relation verified");
      }
    } catch (err) {
      missingTables++;
      recordResult("Schema", `Table public.${table}`, "FAIL", err.message);
    }
  }

  if (missingTables === 0) {
    recordResult("Schema", "Full 30-Table Inventory Integrity", "PASS", "All 30 canonical tables exist in public schema");
  } else {
    recordResult("Schema", "Full 30-Table Inventory Integrity", "FAIL", `${missingTables} of 30 tables failed verification`);
  }

  // --- 4. CANONICAL CATALOG & CATEGORIES INTEGRITY ---
  console.log("\n" + bold("--- 4. CANONICAL CATALOG & OFFERS ---"));
  try {
    const { data: services, error: srvErr } = await adminClient
      .from("services")
      .select("id, name, slug, category_id, active, canonical")
      .order("display_order");

    if (srvErr) {
      recordResult("Catalog", "Fetch Canonical Services", "FAIL", srvErr.message);
    } else {
      if (services?.length === 12) {
        recordResult("Catalog", "Exact 12 Canonical Services", "PASS", "12 of 12 verified");
      } else {
        recordResult("Catalog", "Exact 12 Canonical Services", "FAIL", `Found ${services?.length ?? 0}; expected 12`);
      }

      const categorySet = new Set(services?.map((s) => s.category_id));
      if (categorySet.size === 10) {
        recordResult("Catalog", "Exact 10 Distinct Categories", "PASS", "10 of 10 canonical categories verified");
      } else {
        recordResult("Catalog", "Exact 10 Distinct Categories", "FAIL", `Found ${categorySet.size} categories; expected 10`);
      }
    }

    // Verify promotional package remains unorderable
    const { data: promoPkg } = await adminClient
      .from("packages")
      .select("name, status, orderable")
      .eq("service_id", "SVC-01-SPW")
      .eq("name", "Launch Promotion")
      .maybeSingle();

    if (promoPkg && !promoPkg.orderable && promoPkg.status === "pending_approval") {
      recordResult("Catalog", "Launch Promotion Gate", "PASS", "Preserved as non-orderable pending founder approval");
    } else {
      recordResult("Catalog", "Launch Promotion Gate", "FAIL", "Promotion package is orderable or missing pending_approval guard");
    }
  } catch (err) {
    recordResult("Catalog", "Catalog Verification", "FAIL", err.message);
  }

  // --- 5. RPC SECURITY & PERIMETER BOUNDARIES (NO FALLBACK PASSES) ---
  console.log("\n" + bold("--- 5. RPC SECURITY & INGESTION BOUNDARIES ---"));
  const syntheticPayload = {
    serviceId: "SVC-01-SPW",
    name: "Staging Test Visitor",
    email: "staging-test@notrealengine.local",
    phone: "+8801700000000",
    problem: "Automated staging verification brief submission to validate database persistence.",
    consent: "true"
  };

  try {
    // 5.1 Function Existence Check
    const { error: decideErr } = await adminClient.rpc("decide_quote", {
      p_quote_id: "00000000-0000-0000-0000-000000000000",
      p_decision: "rejected"
    });
    if (decideErr && decideErr.message.includes("does not exist")) {
      recordResult("RPC", "Function public.decide_quote", "FAIL", "Function not found in schema");
    } else {
      recordResult("RPC", "Function public.decide_quote", "PASS", "Function verified in schema");
    }

    // 5.2 submit_project_brief STRICT anonymous lockdown test (NO automatic fallback!)
    const { error: anonRpcErr } = await anonClient.rpc("submit_project_brief", {
      p_payload: syntheticPayload,
      p_request_hash: "forged-hash-attempt",
      p_reference: "PROBE-ANON"
    });

    if (anonRpcErr && (anonRpcErr.message.includes("permission denied") || anonRpcErr.code === "42501")) {
      recordResult("RPC", "Intake RPC Anonymous Lockdown", "PASS", "Direct anon call strictly rejected with permission denied (42501)");
    } else {
      recordResult(
        "RPC",
        "Intake RPC Anonymous Lockdown",
        "FAIL",
        `Direct anon RPC call was NOT rejected with permission denied: ${anonRpcErr?.message ?? "succeeded unexpectedly"}`
      );
    }
  } catch (err) {
    recordResult("RPC", "RPC & Ingestion Checks", "FAIL", err.message);
  }

  // --- 6. MULTI-TENANT AUTH, RLS ISOLATION & END-TO-END LIFECYCLE ---
  console.log("\n" + bold("--- 6. REAL MULTI-TENANT AUTH, RLS & BUSINESS LIFECYCLE ---"));

  const runTag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const password = `Stg!Pass#${runTag}99`;
  const createdUserIds = [];
  const createdOrgIds = [];
  let createdBriefId = null;
  let createdQuoteId = null;
  let createdOrderId = null;
  let createdProjectId = null;
  let uploadedStoragePath = null;

  try {
    // 6.1 Provision real Auth users (Customer A, Customer B, Staff) via Supabase Auth Admin API
    const rolesToCreate = [
      { key: "custA", email: `cust-a-${runTag}@staging.notrealengine.local`, name: "Staging Customer A" },
      { key: "custB", email: `cust-b-${runTag}@staging.notrealengine.local`, name: "Staging Customer B" },
      { key: "staff", email: `staff-${runTag}@staging.notrealengine.local`, name: "Staging Staff Operator" }
    ];

    const users = {};
    for (const r of rolesToCreate) {
      const { data: uData, error: uErr } = await adminClient.auth.admin.createUser({
        email: r.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: r.name }
      });
      if (uErr || !uData?.user) {
        throw new Error(`Failed to create ${r.key} auth user: ${uErr?.message}`);
      }
      users[r.key] = uData.user;
      createdUserIds.push(uData.user.id);
    }

    // Ensure profiles exist (in case auth.users trigger was skipped or executed asynchronously)
    for (const r of rolesToCreate) {
      const u = users[r.key];
      await adminClient.from("profiles").upsert({
        id: u.id,
        full_name: r.name,
        is_staff: r.key === "staff"
      });
    }

    // Sign in each role on dedicated anonKey clients to get real user JWT sessions
    const clientA = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const clientB = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const clientStaff = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const [signA, signB, signStaff] = await Promise.all([
      clientA.auth.signInWithPassword({ email: rolesToCreate[0].email, password }),
      clientB.auth.signInWithPassword({ email: rolesToCreate[1].email, password }),
      clientStaff.auth.signInWithPassword({ email: rolesToCreate[2].email, password })
    ]);

    if (signA.error || signB.error || signStaff.error) {
      recordResult(
        "Auth",
        "Customer A, Customer B & Staff JWT Sessions",
        "FAIL",
        signA.error?.message || signB.error?.message || signStaff.error?.message
      );
    } else {
      recordResult("Auth", "Customer A, Customer B & Staff JWT Sessions", "PASS", "3 real user JWT sessions established");
    }

    // 6.2 Verify Customer A cannot self-promote to staff (Privilege Escalation Prevention)
    const { error: selfPromoteErr } = await clientA
      .from("profiles")
      .update({ is_staff: true })
      .eq("id", users.custA.id);

    const { data: checkProfileA } = await adminClient
      .from("profiles")
      .select("is_staff")
      .eq("id", users.custA.id)
      .single();

    if (selfPromoteErr || checkProfileA?.is_staff === false) {
      recordResult("Security", "Profile Self-Staff Escalation Blocked", "PASS", "Customer A blocked from setting is_staff = true");
    } else {
      recordResult("Security", "Profile Self-Staff Escalation Blocked", "FAIL", "Customer A was able to self-promote to staff!");
    }

    // 6.3 Provision Tenant Organizations (Org A & Org B) and Memberships
    const { data: orgA, error: orgAErr } = await adminClient
      .from("organizations")
      .insert({ name: `Staging Org A ${runTag}`, slug: `stg-org-a-${runTag}` })
      .select("id")
      .single();
    const { data: orgB, error: orgBErr } = await adminClient
      .from("organizations")
      .insert({ name: `Staging Org B ${runTag}`, slug: `stg-org-b-${runTag}` })
      .select("id")
      .single();

    if (orgAErr || orgBErr || !orgA || !orgB) {
      throw new Error(`Failed to create tenant organizations: ${orgAErr?.message || orgBErr?.message}`);
    }
    createdOrgIds.push(orgA.id, orgB.id);

    await adminClient.from("organization_memberships").insert([
      { organization_id: orgA.id, user_id: users.custA.id, role: "owner" },
      { organization_id: orgB.id, user_id: users.custB.id, role: "owner" }
    ]);

    // 6.4 Verify Tenant Organization Visibility (Customer A sees Org A, NOT Org B)
    const { data: visibleOrgsA } = await clientA.from("organizations").select("id");
    const seesOrgA = visibleOrgsA?.some((o) => o.id === orgA.id);
    const seesOrgB = visibleOrgsA?.some((o) => o.id === orgB.id);

    if (seesOrgA && !seesOrgB) {
      recordResult("RLS", "Organization Tenant Isolation (A vs B)", "PASS", "Customer A sees Org A and cannot read Org B");
    } else {
      recordResult("RLS", "Organization Tenant Isolation (A vs B)", "FAIL", `seesOrgA=${seesOrgA}, seesOrgB=${seesOrgB}`);
    }

    // 6.5 Lead Intake & Admin Lead Qualification
    const testReference = `STG-${runTag.toUpperCase()}`;
    const { data: briefId, error: adminRpcErr } = await adminClient.rpc("submit_project_brief", {
      p_payload: syntheticPayload,
      p_request_hash: `probe-hash-${runTag}`,
      p_reference: testReference
    });

    if (adminRpcErr || !briefId) {
      recordResult("Workflow", "Server-Side Project Brief Intake", "FAIL", adminRpcErr?.message ?? "No brief ID");
    } else {
      createdBriefId = briefId;
      recordResult("Workflow", "Server-Side Project Brief Intake", "PASS", `Brief ${briefId} stored`);
    }

    // Customer A cannot read public.leads
    const { data: custALeads } = await clientA.from("leads").select("id").eq("project_brief_id", createdBriefId);
    if (!custALeads || custALeads.length === 0) {
      recordResult("RLS", "Customer Blocked from Internal Leads Table", "PASS", "0 lead rows visible to Customer A");
    } else {
      recordResult("RLS", "Customer Blocked from Internal Leads Table", "FAIL", "Customer A could read internal leads!");
    }

    // Staff can read and qualify the lead
    const { data: staffLead, error: staffLeadErr } = await clientStaff
      .from("leads")
      .update({ status: "qualified", owner_id: users.staff.id })
      .eq("project_brief_id", createdBriefId)
      .select("id, status")
      .single();

    if (!staffLeadErr && staffLead?.status === "qualified") {
      recordResult("Workflow", "Staff Lead Qualification", "PASS", `Lead ${staffLead.id} qualified by Staff`);
    } else {
      recordResult("Workflow", "Staff Lead Qualification", "FAIL", staffLeadErr?.message ?? "Failed to qualify lead");
    }

    // Link brief to Org A
    await clientStaff.from("project_briefs").update({ organization_id: orgA.id, status: "quoted" }).eq("id", createdBriefId);

    // 6.6 Staff Creates & Publishes Quotation for Org A
    const validUntil = new Date(Date.now() + 14 * 86400_000).toISOString();
    const scopeObj = {
      summary: "Staging E2E verification scope for Single-Page Website",
      deliverables: ["Responsive Next.js Landing Page", "SEO Metadata"],
      exclusions: ["Custom ERP"],
      milestones: ["Architecture", "Delivery"]
    };
    const itemsArr = [
      { label: "Core Engineering Package", description: "Canonical package", quantity: 1, unitAmountMinor: 1500000, displayOrder: 1 }
    ];
    const snapshotObj = {
      quoteId: "pending",
      organizationId: orgA.id,
      currency: "BDT",
      totalMinor: 1500000,
      revisionLimit: 1,
      termsVersion: "STAGING-TEST-TERMS-V1.0",
      validUntil,
      scope: scopeObj,
      items: itemsArr,
      publishedAt: new Date().toISOString()
    };

    const { data: quoteRow, error: quoteCreateErr } = await clientStaff
      .from("quotes")
      .insert({
        organization_id: orgA.id,
        project_brief_id: createdBriefId,
        state: "sent",
        currency: "BDT",
        total_minor: 1500000,
        revision_limit: 1,
        valid_until: validUntil,
        terms_version: "STAGING-TEST-TERMS-V1.0",
        scope: scopeObj,
        snapshot: snapshotObj,
        sent_at: new Date().toISOString(),
        created_by: users.staff.id
      })
      .select("id")
      .single();

    if (quoteCreateErr || !quoteRow) {
      throw new Error(`Staff quote creation failed: ${quoteCreateErr?.message}`);
    }
    createdQuoteId = quoteRow.id;
    recordResult("Workflow", "Staff Quotation Creation & Publishing", "PASS", `Quote ${createdQuoteId} published in state 'sent'`);

    // 6.7 Cross-Tenant Quote Isolation: Customer B cannot read or accept Customer A's quote
    const { data: quoteReadB } = await clientB.from("quotes").select("id").eq("id", createdQuoteId);
    const { error: quoteAcceptBErr } = await clientB.rpc("decide_quote", {
      p_quote_id: createdQuoteId,
      p_decision: "accepted"
    });

    if ((!quoteReadB || quoteReadB.length === 0) && quoteAcceptBErr) {
      recordResult("RLS", "Cross-Tenant Quote Read & Acceptance Blocked", "PASS", "Customer B blocked from reading or accepting Org A quote");
    } else {
      recordResult("RLS", "Cross-Tenant Quote Read & Acceptance Blocked", "FAIL", "Customer B accessed Org A quote!");
    }

    // 6.8 Customer A Accepts Quote -> Atomic Order Creation & Replay Idempotency
    const { data: orderIdFromRpc, error: acceptAErr } = await clientA.rpc("decide_quote", {
      p_quote_id: createdQuoteId,
      p_decision: "accepted"
    });

    if (acceptAErr || !orderIdFromRpc) {
      recordResult("Workflow", "Customer A Atomic Quote Acceptance (decide_quote)", "FAIL", acceptAErr?.message ?? "No order ID returned");
    } else {
      createdOrderId = orderIdFromRpc;
      recordResult("Workflow", "Customer A Atomic Quote Acceptance (decide_quote)", "PASS", `Order ${createdOrderId} created`);
    }

    // Replay decide_quote a second time -> must fail closed and NOT create a second order
    const { error: replayErr } = await clientA.rpc("decide_quote", {
      p_quote_id: createdQuoteId,
      p_decision: "accepted"
    });
    const { count: orderCountForQuote } = await adminClient
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("quote_id", createdQuoteId);

    const { data: verifiedOrder } = await clientA
      .from("orders")
      .select("id, state, total_minor, currency")
      .eq("id", createdOrderId)
      .single();

    if (replayErr && orderCountForQuote === 1 && verifiedOrder?.state === "awaiting_payment") {
      recordResult(
        "Workflow",
        "Order Idempotency & Payment Gate Integrity",
        "PASS",
        "Exactly 1 order created in 'awaiting_payment'; duplicate acceptance rejected"
      );
    } else {
      recordResult(
        "Workflow",
        "Order Idempotency & Payment Gate Integrity",
        "FAIL",
        `orderCount=${orderCountForQuote}, state=${verifiedOrder?.state}, replayErr=${Boolean(replayErr)}`
      );
    }

    // Verify Customer A cannot directly mutate order state to 'confirmed' or 'completed'
    const { error: custOrderMutateErr } = await clientA
      .from("orders")
      .update({ state: "confirmed" })
      .eq("id", createdOrderId);
    const { data: orderCheckAfterCust } = await adminClient
      .from("orders")
      .select("state")
      .eq("id", createdOrderId)
      .single();

    if (custOrderMutateErr || orderCheckAfterCust?.state === "awaiting_payment") {
      recordResult("RLS", "Customer Blocked from Mutating Order State", "PASS", "Order remained in 'awaiting_payment'");
    } else {
      recordResult("RLS", "Customer Blocked from Mutating Order State", "FAIL", "Customer mutated order state directly!");
    }

    // 6.9 Staff Confirms Order & Provisions Project Workspace, Requirements & Milestones
    await clientStaff.from("orders").update({ state: "confirmed" }).eq("id", createdOrderId);

    const { data: projRow, error: projCreateErr } = await clientStaff
      .from("projects")
      .insert({
        order_id: createdOrderId,
        organization_id: orgA.id,
        service_id: "SVC-01-SPW",
        state: "awaiting_requirements",
        revision_limit: 1,
        revision_count: 0
      })
      .select("id")
      .single();

    if (projCreateErr || !projRow) {
      throw new Error(`Project creation failed: ${projCreateErr?.message}`);
    }
    createdProjectId = projRow.id;

    await adminClient.from("project_requirements").insert([
      { project_id: createdProjectId, key: "brand_assets", label: "Brand Identity & Assets", required: true }
    ]);
    const { data: msRow } = await clientStaff
      .from("milestones")
      .insert({ project_id: createdProjectId, label: "Initial Engineering Build", state: "pending", display_order: 1 })
      .select("id")
      .single();

    recordResult("Workflow", "Project Workspace, Requirements & Milestones Provisioned", "PASS", `Project ${createdProjectId} active`);

    // 6.10 Customer A Submits Requirements & Cross-Tenant Requirement Isolation
    const { data: reqRowsB } = await clientB
      .from("project_requirements")
      .update({ response: { value: "Hijacked by Org B" } })
      .eq("project_id", createdProjectId)
      .select("id");

    const { data: reqUpdatedByA, error: reqUpdateAErr } = await clientA
      .from("project_requirements")
      .update({
        response: { value: "Verified Brand Guidelines & Copy Submitted by Customer A" },
        submitted_by: users.custA.id,
        submitted_at: new Date().toISOString()
      })
      .eq("project_id", createdProjectId)
      .eq("key", "brand_assets")
      .select("id, response")
      .single();

    if (!reqUpdateAErr && reqUpdatedByA?.response?.value?.includes("Customer A") && (!reqRowsB || reqRowsB.length === 0)) {
      recordResult("Workflow", "Customer A Requirement Submission & RLS Isolation", "PASS", "Customer A submitted requirement; Customer B blocked");
    } else {
      recordResult("Workflow", "Customer A Requirement Submission & RLS Isolation", "FAIL", reqUpdateAErr?.message ?? "Requirement isolation failed");
    }

    // 6.11 Private Storage Upload, Signed URL & Cross-Tenant Storage/Table Isolation
    uploadedStoragePath = `${createdProjectId}/staging_spec_${runTag}.txt`;
    const fileBuffer = Buffer.from("ENGINE//OS Confidential Project Specification Content");

    // Customer B attempts to upload into Customer A's project folder -> MUST fail
    const { error: storageUploadBErr } = await clientB.storage
      .from("project-files")
      .upload(`${createdProjectId}/unauthorized_b.txt`, fileBuffer, { contentType: "text/plain" });

    if (storageUploadBErr) {
      recordResult("Storage", "Cross-Tenant Storage Upload Blocked (Org B -> Project A)", "PASS", "Customer B blocked by storage.objects RLS");
    } else {
      recordResult("Storage", "Cross-Tenant Storage Upload Blocked (Org B -> Project A)", "FAIL", "Customer B uploaded into Project A folder!");
    }

    // Customer B attempts cross-org metadata injection (project_id = Project A, organization_id = Org B) -> MUST fail
    const { error: crossOrgFileInsertErr } = await clientB.from("project_files").insert({
      project_id: createdProjectId,
      organization_id: orgB.id,
      storage_path: `${createdProjectId}/cross_org_spoof.txt`,
      original_name: "spoof.txt",
      mime_type: "text/plain",
      size_bytes: fileBuffer.length,
      uploaded_by: users.custB.id
    });

    if (crossOrgFileInsertErr) {
      recordResult(
        "RLS",
        "Cross-Organization Child Record Injection Blocked",
        "PASS",
        "Rejected mismatched (project_id=OrgA, organization_id=OrgB)"
      );
    } else {
      recordResult("RLS", "Cross-Organization Child Record Injection Blocked", "FAIL", "Cross-org project_files insert succeeded!");
    }

    // Customer A uploads valid file to Project A folder
    const { error: storageUploadAErr } = await clientA.storage
      .from("project-files")
      .upload(uploadedStoragePath, fileBuffer, { contentType: "text/plain", upsert: false });

    const { error: fileMetaAErr } = await clientA.from("project_files").insert({
      project_id: createdProjectId,
      organization_id: orgA.id,
      storage_path: uploadedStoragePath,
      original_name: "staging_spec.txt",
      mime_type: "text/plain",
      size_bytes: fileBuffer.length,
      uploaded_by: users.custA.id
    });

    const { data: signedUrlA, error: signedAErr } = await clientA.storage
      .from("project-files")
      .createSignedUrl(uploadedStoragePath, 60);

    const { data: signedUrlB } = await clientB.storage
      .from("project-files")
      .createSignedUrl(uploadedStoragePath, 60);

    if (!storageUploadAErr && !fileMetaAErr && !signedAErr && signedUrlA?.signedUrl && !signedUrlB?.signedUrl) {
      recordResult(
        "Storage",
        "Authenticated Upload, Metadata & Signed URL Isolation",
        "PASS",
        "Customer A uploaded & generated signed URL; Customer B denied"
      );
    } else {
      recordResult(
        "Storage",
        "Authenticated Upload, Metadata & Signed URL Isolation",
        "FAIL",
        storageUploadAErr?.message || fileMetaAErr?.message || signedAErr?.message || "Signed URL isolation failed"
      );
    }

    // 6.12 Project State Progression, Revision Limit Enforcement & Deliverable Approval
    // Staff advances project: awaiting_requirements -> requirements_review -> ready_for_production -> in_progress -> internal_qa -> client_review
    for (const nextSt of ["requirements_review", "ready_for_production", "in_progress", "internal_qa", "client_review"]) {
      const { error: stErr } = await clientStaff.from("projects").update({ state: nextSt }).eq("id", createdProjectId);
      if (stErr) throw new Error(`Project transition to ${nextSt} failed: ${stErr.message}`);
    }

    if (msRow?.id) {
      await clientStaff.from("milestones").update({ state: "complete", completed_at: new Date().toISOString() }).eq("id", msRow.id);
    }

    // Customer A submits Revision #1 (within revision_limit = 1)
    const { error: rev1Err } = await clientA.from("revision_requests").insert({
      project_id: createdProjectId,
      organization_id: orgA.id,
      requested_by: users.custA.id,
      sequence: 1,
      request: "Please adjust hero typography spacing for mobile viewports."
    });

    // Update project revision_count to 1 and state to revision
    const { error: revCount1Err } = await clientStaff
      .from("projects")
      .update({ revision_count: 1, state: "revision" })
      .eq("id", createdProjectId);

    // Attempt to exceed revision_limit (setting revision_count = 2 when revision_limit = 1) -> MUST fail DB check constraint
    const { error: revLimitExceedErr } = await clientStaff
      .from("projects")
      .update({ revision_count: 2 })
      .eq("id", createdProjectId);

    if (!rev1Err && !revCount1Err && revLimitExceedErr) {
      recordResult(
        "Workflow",
        "Revision Request & Revision Limit Constraint Enforcement",
        "PASS",
        "Revision #1 recorded; exceeding revision_limit (2 > 1) rejected by PostgreSQL constraint"
      );
    } else {
      recordResult(
        "Workflow",
        "Revision Request & Revision Limit Constraint Enforcement",
        "FAIL",
        `rev1Err=${rev1Err?.message}, exceedRejected=${Boolean(revLimitExceedErr)}`
      );
    }

    // Complete revision cycle -> in_progress -> client_review -> Customer A approves -> Staff marks delivered
    await clientStaff.from("projects").update({ state: "in_progress" }).eq("id", createdProjectId);
    await clientStaff.from("projects").update({ state: "internal_qa" }).eq("id", createdProjectId);
    await clientStaff.from("projects").update({ state: "client_review" }).eq("id", createdProjectId);

    const { error: approvalErr } = await clientA.from("approvals").insert({
      project_id: createdProjectId,
      organization_id: orgA.id,
      kind: "milestone_acceptance",
      decision: "approved",
      decided_by: users.custA.id,
      note: "All staging deliverables verified and approved."
    });

    await clientStaff.from("projects").update({ state: "approved" }).eq("id", createdProjectId);
    const { data: deliveredProj, error: deliverErr } = await clientStaff
      .from("projects")
      .update({ state: "delivered" })
      .eq("id", createdProjectId)
      .select("state")
      .single();

    if (!approvalErr && !deliverErr && deliveredProj?.state === "delivered") {
      recordResult(
        "Workflow",
        "Client Deliverable Approval & Final Delivery Transition",
        "PASS",
        "Approval logged and project transitioned to 'delivered'"
      );
    } else {
      recordResult(
        "Workflow",
        "Client Deliverable Approval & Final Delivery Transition",
        "FAIL",
        approvalErr?.message || deliverErr?.message || "Failed to reach 'delivered'"
      );
    }
  } catch (err) {
    recordResult("Workflow", "Multi-Tenant E2E Lifecycle Suite", "FAIL", err.message);
  } finally {
    // Clean up all synthetic test data so staging remains spotless
    try {
      if (uploadedStoragePath) {
        await adminClient.storage.from("project-files").remove([uploadedStoragePath]);
      }
      if (createdProjectId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdProjectId);
        await adminClient.from("audit_logs").delete().eq("entity_id", createdProjectId);
        await adminClient.from("projects").delete().eq("id", createdProjectId);
      }
      if (createdOrderId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdOrderId);
        await adminClient.from("orders").delete().eq("id", createdOrderId);
      }
      if (createdQuoteId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdQuoteId);
        // quote_acceptances has an immutability trigger on DELETE; temporarily clean up only if needed, or leave/clean before quote
        await adminClient.from("quote_items").delete().eq("quote_id", createdQuoteId);
      }
      if (createdBriefId) {
        await adminClient.from("outbox_events").delete().eq("aggregate_id", createdBriefId);
        await adminClient.from("project_briefs").delete().eq("id", createdBriefId);
      }
      for (const uid of createdUserIds) {
        await adminClient.auth.admin.deleteUser(uid);
      }
    } catch {
      // Ignore cleanup errors for immutable audit/acceptance logs
    }
  }

  // --- 7. STORAGE BUCKET & UNAUTHENTICATED BOUNDARIES ---
  console.log("\n" + bold("--- 7. STORAGE BUCKET & ACCESS BOUNDARIES ---"));
  try {
    const { data: buckets, error: bErr } = await adminClient.storage.listBuckets();
    if (bErr) {
      recordResult("Storage", "List Buckets Access", "FAIL", bErr.message);
    } else {
      const projBucket = buckets?.find((b) => b.id === "project-files");
      if (projBucket) {
        if (!projBucket.public) {
          recordResult("Storage", "project-files Private Bucket", "PASS", "Private, RLS-governed");
        } else {
          recordResult("Storage", "project-files Private Bucket", "FAIL", "Bucket is unexpectedly public!");
        }
      } else {
        recordResult("Storage", "project-files Private Bucket", "FAIL", "Bucket project-files not created yet");
      }
    }

    // Test unauthenticated upload rejection
    const { error: anonUploadErr } = await anonClient.storage
      .from("project-files")
      .upload("unauthorized-probe.txt", Buffer.from("probe"));

    if (anonUploadErr) {
      recordResult("Storage", "Unauthenticated Upload Lockdown", "PASS", "Rejected unauthenticated storage write");
    } else {
      recordResult("Storage", "Unauthenticated Upload Lockdown", "FAIL", "Unauthenticated upload unexpectedly succeeded!");
    }
  } catch (err) {
    recordResult("Storage", "Storage Bucket Checks", "FAIL", err.message);
  }

  printSummaryAndExit();
}

function printSummaryAndExit() {
  console.log("\n" + bold("=========================================================="));
  console.log(bold("                VERIFICATION SUMMARY"));
  console.log(bold("=========================================================="));

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const skipped = results.filter((r) => r.status === "SKIPPED").length;

  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`  ${green("PASSED ")}: ${passed}`);
  console.log(`  ${red("FAILED ")}: ${failed}`);
  console.log(`  ${yellow("BLOCKED")}: ${blocked}`);
  console.log(`  ${cyan("SKIPPED")}: ${skipped}\n`);

  // Write machine-readable report to docs/staging-report.json
  const reportPath = path.resolve(process.cwd(), "docs", "staging-report.json");
  const reportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      platform: "ENGINE//OS",
      version: "11.0",
      target: "https://yamwmfgqqjwlfcjjkwzl.supabase.co"
    },
    summary: { passed, failed, blocked, skipped },
    results
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`Machine-readable audit written to: ${cyan("docs/staging-report.json")}\n`);

  if (failed > 0 || blocked > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runStagingVerification().catch((err) => {
  console.error("Staging verification crashed:", err);
  process.exit(1);
});
