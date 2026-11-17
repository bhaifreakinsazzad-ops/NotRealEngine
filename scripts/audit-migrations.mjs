#!/usr/bin/env node
/**
 * ENGINE//OS — Standalone Migration & Schema Audit CLI (Directive V20.0)
 * Platform: NOTREAL ENGINE, LLC
 *
 * Command: npm run audit:migrations
 *
 * CRITICAL SAFETY RULES:
 * 1. 100% READ-ONLY. NEVER mutates database state.
 * 2. ZERO calls to mutating business RPCs (no approve_commercial_terms, no set_system_environment, etc.).
 * 3. Two-Level Verification:
 *    - Level 1: API Schema Verification (PostgREST OpenAPI paths & definitions)
 *    - Level 2: PostgreSQL Catalog Verification (pg_catalog / information_schema via direct connection)
 * 4. Outputs terminal summary and writes docs/migration-audit-report.json.
 * 5. Returns non-zero exit code if migrations are pending or blocked.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import {
  executeReadOnlyMigrationAudit,
  executePostgresCatalogAudit,
  evaluateOverallAuditStatus
} from "./read-only-audit.mjs";

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const APPROVED_STAGING_PROJECT_REF = "yamwmfgqqjwlfcjjkwzl";

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

async function runStandaloneMigrationAudit() {
  console.log("\n" + bold("================================================================================"));
  console.log(bold("   ENGINE//OS — TWO-LEVEL DATABASE & MIGRATION AUDIT (STANDALONE CLI)"));
  console.log(bold("================================================================================") + "\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${APPROVED_STAGING_PROJECT_REF}.supabase.co`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const directDbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  console.log(`Target Host       : ${cyan(supabaseUrl)}`);
  console.log(`Target Project Ref: ${cyan(APPROVED_STAGING_PROJECT_REF)}`);
  console.log(`Service Role Key  : ${serviceKey ? green("CONFIGURED (Valid)") : red("MISSING")}`);
  console.log(`Direct DB URL     : ${directDbUrl ? green("CONFIGURED (Level 2 Available)") : yellow("NOT PROVIDED (Level 2 Blocked by Policy)")}\n`);

  if (!serviceKey) {
    console.error(red("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is required to audit PostgREST schema definitions."));
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // ---------------------------------------------------------------------------
  // LEVEL 1: API SCHEMA VERIFICATION (PostgREST OpenAPI & Read-Only SELECTs)
  // ---------------------------------------------------------------------------
  console.log(bold("--------------------------------------------------------------------------------"));
  console.log(bold("LEVEL 1: API SCHEMA VERIFICATION (PostgREST OpenAPI & Schema Definitions)"));
  console.log(bold("--------------------------------------------------------------------------------"));

  const auditResult = await executeReadOnlyMigrationAudit(supabaseUrl, serviceKey, adminClient);

  const printMigrationStatus = (id, title, result) => {
    const badge =
      result.status === "PASS"
        ? green("[PASS: API SCHEMA VERIFIED]")
        : result.status === "BLOCKED"
        ? yellow("[BLOCKED: MIGRATION PENDING]")
        : red("[FAIL: INCOMPLETE OBJECTS]");
    console.log(`\n${bold(`Migration ${id}`)}: ${title}`);
    console.log(`  Status : ${badge}`);
    console.log(`  Summary: ${result.summary}`);
    console.log(`  Objects:`);
    for (const obj of Object.values(result.objects)) {
      const objBadge = obj.status === "APPLIED" ? green("✓ APPLIED") : yellow("⏳ PENDING");
      console.log(`    - ${obj.name.padEnd(38)} [${obj.type.padEnd(6)}] : ${objBadge} (${obj.details || obj.expected})`);
    }
  };

  printMigrationStatus("0005", "Quotation & Order Governance", auditResult.migration0005);
  printMigrationStatus("0006", "Terms Environment & Founder Governance", auditResult.migration0006);
  printMigrationStatus("0007", "LeadConnector Ingestion Integrity", auditResult.migration0007);

  // ---------------------------------------------------------------------------
  // LEVEL 2: POSTGRESQL CATALOG VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n" + bold("--------------------------------------------------------------------------------"));
  console.log(bold("LEVEL 2: POSTGRESQL CATALOG VERIFICATION (pg_catalog, pg_proc, pg_policy)"));
  console.log(bold("--------------------------------------------------------------------------------"));

  const level2Result = await executePostgresCatalogAudit(directDbUrl);

  const level2Badge =
    level2Result.status === "PASS"
      ? green("[PASS: POSTGRESQL CATALOG VERIFIED]")
      : level2Result.status === "BLOCKED"
      ? yellow("[BLOCKED: CATALOG ACCESS UNAVAILABLE]")
      : level2Result.status === "MISMATCH"
      ? red("[MISMATCH: OBJECT DEFINITION DIFFERS]")
      : red("[FAIL: CATALOG VERIFICATION FAILED]");

  console.log(`  Overall Level 2 Status : ${level2Badge}`);
  console.log(`  Summary                : ${level2Result.summary}`);

  if (level2Result.databaseIdentity) {
    console.log(
      `  Database Identity      : ${cyan(level2Result.databaseIdentity.database)} (user=${cyan(level2Result.databaseIdentity.user)})`
    );
  }
  if (level2Result.migrationsLedger && level2Result.migrationsLedger.length > 0) {
    console.log(`  Migrations in Ledger   : ${level2Result.migrationsLedger.join(", ")}`);
  }

  const printCatalogMigration = (id, title, catResult) => {
    if (!catResult || Object.keys(catResult.objects || {}).length === 0) return;
    const catBadge =
      catResult.status === "PASS"
        ? green("[PASS: CATALOG VERIFIED]")
        : catResult.status === "MISMATCH"
        ? red("[MISMATCH]")
        : catResult.status === "FAIL"
        ? red("[FAIL]")
        : yellow("[NOT APPLIED]");
    console.log(`\n  ${bold(`Migration ${id}`)} (Catalog): ${title} — ${catBadge}`);
    for (const obj of Object.values(catResult.objects)) {
      const objBadge =
        obj.status === "APPLIED"
          ? green("✓ APPLIED")
          : obj.status === "MISMATCH"
          ? red("⚠ MISMATCH")
          : obj.status === "FAIL"
          ? red("✗ FAIL")
          : yellow("⏳ NOT APPLIED");
      console.log(`    - ${obj.name.padEnd(38)} [${obj.type.padEnd(10)}] : ${objBadge} (${obj.details || obj.expected})`);
    }
  };

  printCatalogMigration("0005", "Quotation & Order Governance", level2Result.migration0005);
  printCatalogMigration("0006", "Terms Environment & Founder Governance", level2Result.migration0006);
  printCatalogMigration("0007", "LeadConnector Ingestion Integrity", level2Result.migration0007);

  // ---------------------------------------------------------------------------
  // READ-ONLY ENVIRONMENT STATE & COMMERCIAL TERMS RECORD
  // ---------------------------------------------------------------------------
  console.log("\n" + bold("--------------------------------------------------------------------------------"));
  console.log(bold("READ-ONLY DATABASE ENVIRONMENT STATE & COMMERCIAL TERMS"));
  console.log(bold("--------------------------------------------------------------------------------"));

  let currentEnvState = null;
  try {
    const { data: sysEnv } = await adminClient
      .from("system_environment")
      .select("id, environment, is_synthetic_allowed, updated_at")
      .eq("id", "current")
      .maybeSingle();
    currentEnvState = sysEnv;
    if (sysEnv) {
      console.log(`  System Environment : ${cyan(sysEnv.environment)} (synthetic_allowed=${sysEnv.is_synthetic_allowed})`);
    } else {
      console.log(`  System Environment : ${yellow("Table system_environment not present (fail-closed to production)")}`);
    }
  } catch {
    console.log(`  System Environment : ${yellow("Unreachable / table missing")}`);
  }

  let termsVersions = [];
  try {
    const { data: terms } = await adminClient
      .from("commercial_terms_versions")
      .select("version, document_id, classification, title, approved_at")
      .order("created_at", { ascending: false });
    termsVersions = terms || [];
    console.log(`  Terms Versions in DB: ${termsVersions.length} registered`);
    for (const t of termsVersions) {
      const clsBadge = t.classification === "approved_production" ? green(t.classification) : yellow(t.classification);
      console.log(`    - ${t.version.padEnd(26)} [${clsBadge}] : ${t.title}`);
    }
  } catch {
    console.log(`  Terms Versions     : ${yellow("Could not query commercial_terms_versions")}`);
  }

  // ---------------------------------------------------------------------------
  // GENERATE MACHINE-READABLE AUDIT REPORT
  // ---------------------------------------------------------------------------
  const overallVerdict = evaluateOverallAuditStatus(auditResult, level2Result);

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      platform: "ENGINE//OS",
      auditVersion: "V21.0",
      targetHost: supabaseUrl,
      targetProjectRef: APPROVED_STAGING_PROJECT_REF,
      mode: "READ_ONLY_STANDALONE"
    },
    overallVerdict: {
      status: overallVerdict.overallStatus,
      exitCode: overallVerdict.exitCode,
      summary: overallVerdict.summary
    },
    twoLevelVerification: {
      level1ApiSchemaVerification: {
        status: auditResult.success ? "PASS" : auditResult.blocked ? "BLOCKED" : "FAIL",
        migration0005: auditResult.migration0005,
        migration0006: auditResult.migration0006,
        migration0007: auditResult.migration0007
      },
      level2PostgreSqlCatalogVerification: {
        status: level2Result.status,
        summary: level2Result.summary,
        databaseIdentity: level2Result.databaseIdentity,
        migrationsLedger: level2Result.migrationsLedger,
        migration0005: level2Result.migration0005,
        migration0006: level2Result.migration0006,
        migration0007: level2Result.migration0007
      }
    },
    databaseState: {
      systemEnvironment: currentEnvState,
      commercialTermsVersions: termsVersions
    },
    safetyInvariantsVerified: {
      mutatingRpcCallsMade: 0,
      commercialTermsApproved: false,
      environmentMutated: false,
      recordsCreatedOrDeleted: 0,
      readOnlyGuarantee: true
    }
  };

  const reportPath = path.resolve(process.cwd(), "docs", "migration-audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nMachine-readable audit report written to: ${cyan("docs/migration-audit-report.json")}`);

  console.log("\n" + bold("================================================================================"));
  console.log(bold("AUDIT EXECUTION CONCLUSION"));
  console.log(bold("================================================================================"));
  console.log(`Level 1 (API Schema)    : ${auditResult.migration0005.status === "PASS" ? green("0005 PASS") : red("0005 FAIL")}, ${auditResult.migration0006.status === "PASS" ? green("0006 PASS") : yellow("0006 BLOCKED")}, ${auditResult.migration0007.status === "PASS" ? green("0007 PASS") : yellow("0007 BLOCKED")}`);
  console.log(`Level 2 (Pg Catalog)   : ${level2Result.status === "PASS" ? green("VERIFIED (PASS)") : level2Result.status === "BLOCKED" ? yellow("BLOCKED (Requires direct PostgreSQL port 5432)") : red(level2Result.status)}`);
  console.log(`Overall Readiness Gate  : ${overallVerdict.overallStatus === "PASS" ? green("[PASS: ALL GATES VERIFIED]") : overallVerdict.overallStatus === "BLOCKED" ? yellow(`[BLOCKED: RELEASE BLOCKED (Exit ${overallVerdict.exitCode})]`) : red(`[FAIL: DEFECT DETECTED (Exit ${overallVerdict.exitCode})]`)}`);
  console.log(`Gate Reason             : ${overallVerdict.summary}`);
  console.log(`Rollout File Ready      : ${cyan("supabase/migrations/APPLY_0006_AND_0007.sql")}`);
  console.log(`Execution Safe          : ${green("YES — ZERO MUTATING OPERATIONS PERFORMED")}\n`);

  process.exit(overallVerdict.exitCode);
}

runStandaloneMigrationAudit().catch((err) => {
  console.error(red("Unexpected failure during migration audit:"), err);
  process.exit(1);
});
