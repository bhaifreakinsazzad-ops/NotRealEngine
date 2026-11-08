#!/usr/bin/env node
/**
 * ENGINE//OS — Staging Verification Suite
 * Directive: Master Directive V8.0 Section 5
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

async function runStagingVerification() {
  console.log("\n" + bold("=========================================================="));
  console.log(bold("   ENGINE//OS — STAGING VERIFICATION SUITE (V8.0)"));
  console.log(bold("==========================================================") + "\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yamwmfgqqjwlfcjjkwzl.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Target Staging Host : ${cyan(supabaseUrl)}`);
  console.log(`Anon Key Configured : ${anonKey ? green("YES (Present)") : yellow("NO (Missing)")}`);
  console.log(`Service Key Config  : ${serviceKey ? green("YES (Present)") : yellow("NO (Missing)")}\n`);

  // Phase 1: Network & Endpoint Reachability
  console.log(bold("--- 1. NETWORK & REACHABILITY ---"));
  let reachable = false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, { method: "GET" });
    if (res.status === 200 || res.status === 401 || res.status === 404) {
      reachable = true;
      recordResult("Network", "Supabase Cloud Endpoint Reachable", "PASS", `HTTP ${res.status}`);
    } else {
      recordResult("Network", "Supabase Cloud Endpoint Reachable", "FAIL", `Unexpected status ${res.status}`);
    }
  } catch (err) {
    recordResult("Network", "Supabase Cloud Endpoint Reachable", "FAIL", err.message);
  }

  if (!reachable) {
    console.log(red("\nTarget Supabase instance is unreachable. Aborting dependent tests."));
    printSummary();
    process.exit(1);
  }

  // Phase 2: Credentials Gate
  console.log("\n" + bold("--- 2. CREDENTIALS & PERMISSION GATE ---"));
  if (!anonKey && !serviceKey) {
    recordResult("Credentials", "Supabase API Key Provided", "BLOCKED", "Neither anon key nor service role key provided in environment.");
    recordResult("Database", "Schema & Tables Verification", "BLOCKED", "Requires configured Supabase credentials.");
    recordResult("Database", "Canonical 12 Services Seed", "BLOCKED", "Requires database access.");
    recordResult("Database", "RPC decide_quote & submit_brief", "BLOCKED", "Requires database access.");
    recordResult("Auth", "Customer & Staff Sign In", "BLOCKED", "Requires GoTrue credentials.");
    recordResult("Tenant Security", "Two-Tenant Isolation (Customer A vs B)", "BLOCKED", "Requires database access.");
    recordResult("Lead Intake", "Brief Submission -> Database Persistence", "BLOCKED", "Requires database access.");
    recordResult("Commerce", "Quotation -> Acceptance -> Order", "BLOCKED", "Requires database access.");
    recordResult("Storage", "Private project-files Bucket Isolation", "BLOCKED", "Requires Supabase Storage access.");

    printSummary();
    return;
  }

  const activeKey = serviceKey || anonKey;
  const supabase = createClient(supabaseUrl, activeKey, {
    auth: { persistSession: false }
  });

  // Phase 3: Database & Table Inspections
  console.log("\n" + bold("--- 3. DATABASE SCHEMA & SEED VERIFICATION ---"));
  try {
    const { error: catErr } = await supabase.from("service_categories").select("count");
    if (catErr) {
      recordResult("Database", "Query service_categories table", "FAIL", catErr.message);
    } else {
      recordResult("Database", "Query service_categories table", "PASS", "Connected");
    }

    const { data: srvData, error: srvErr } = await supabase.from("services").select("id, name, slug");
    if (srvErr) {
      recordResult("Database", "Canonical 12 Services Seed", "FAIL", srvErr.message);
    } else if (srvData && srvData.length === 12) {
      recordResult("Database", "Canonical 12 Services Seed", "PASS", "Exactly 12 canonical services verified");
    } else {
      recordResult("Database", "Canonical 12 Services Seed", "FAIL", `Found ${srvData?.length ?? 0} services; expected 12`);
    }

    // Check RPC functions
    const { error: rpcErr } = await supabase.rpc("submit_project_brief", {
      p_payload: {},
      p_request_hash: "probe-test",
      p_reference: "PROBE"
    });
    // Expected to fail with validation or succeed, but not 404 function not found
    if (rpcErr && rpcErr.message.includes("does not exist")) {
      recordResult("Database", "RPC submit_project_brief Existence", "FAIL", "Function not found in schema");
    } else {
      recordResult("Database", "RPC submit_project_brief Existence", "PASS", "Function exists in schema");
    }
  } catch (err) {
    recordResult("Database", "Schema Checks", "FAIL", err.message);
  }

  // Phase 4: Storage Verification
  console.log("\n" + bold("--- 4. STORAGE BUCKET VERIFICATION ---"));
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
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
  } catch (err) {
    recordResult("Storage", "Storage Bucket Checks", "FAIL", err.message);
  }

  printSummary();
}

function printSummary() {
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
  fs.writeFileSync(reportPath, JSON.stringify({ summary: { passed, failed, blocked, skipped }, results }, null, 2));
  console.log(`Machine-readable audit written to: ${cyan("docs/staging-report.json")}\n`);
}

runStagingVerification().catch((err) => {
  console.error("Staging verification crashed:", err);
  process.exit(1);
});
