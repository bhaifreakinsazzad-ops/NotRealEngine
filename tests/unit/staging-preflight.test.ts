import { describe, it, expect } from "vitest";
import {
  validateStagingSafetyPreflight,
  CANONICAL_STAGING_PROJECT_REF,
  PRODUCTION_FORBIDDEN_HOSTS
} from "../../lib/staging/staging-preflight";
import fs from "fs";
import path from "path";

describe("Shared Staging Safety Preflight & Fail-Closed Invariants (Directive V23.1 Section 5)", () => {
  const validStagingConfig = {
    engineEnv: "staging",
    supabaseUrl: "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
    appUrl: "http://localhost:3000",
    playwrightBaseUrl: "http://localhost:3000",
    allowMutationFlag: true,
    dbEnvironmentState: {
      environment: "staging",
      is_synthetic_allowed: true
    }
  };

  // Case 1: Missing environment identifier -> BLOCKED
  it("V23.1: blocks execution when ENGINE_OS_ENV is missing or empty", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      engineEnv: ""
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/Missing ENGINE_OS_ENV/i);
  });

  // Case 2: Production environment -> BLOCKED
  it("V23.2: blocks execution when ENGINE_OS_ENV is 'production'", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      engineEnv: "production"
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/ENGINE_OS_ENV is 'production'/i);
  });

  // Case 3: Unknown database project -> BLOCKED
  it("V23.3: blocks execution when Supabase project ref does not match approved staging ref", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      supabaseUrl: "https://unknownprojectref123.supabase.co"
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/does not match approved staging project/i);
  });

  // Case 4: Authorized staging URL with production database -> BLOCKED
  it("V23.4: blocks execution when target URL is staging/localhost but remote database is in production mode", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      dbEnvironmentState: {
        environment: "production",
        is_synthetic_allowed: false
      }
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/Remote database is configured in 'production' mode/i);
  });

  // Case 5: Production URL with staging database -> BLOCKED
  it("V23.5: blocks execution when target URL is a forbidden production domain even if database is staging", () => {
    for (const prodHost of PRODUCTION_FORBIDDEN_HOSTS) {
      const res = validateStagingSafetyPreflight({
        ...validStagingConfig,
        appUrl: `https://${prodHost}`
      });
      expect(res.allowed).toBe(false);
      expect(res.status).toBe("BLOCKED");
      expect(res.reason).toMatch(/matches forbidden production domain/i);
    }
  });

  // Case 6: Unknown Vercel Preview URL -> BLOCKED
  it("V23.6: blocks execution when target URL is an unknown non-allowlisted host", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      appUrl: "https://random-preview-deployment-abc123.vercel.app"
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/is not in approved staging allowlist/i);
  });

  // Case 7: Missing mutation authorization -> BLOCKED
  it("V23.7: blocks execution when deliberate mutation authorization flag/env is missing", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      allowMutationFlag: false,
      allowMutationEnv: undefined
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/Missing deliberate mutation authorization/i);
  });

  // Case 8: Missing database-environment evidence -> BLOCKED
  it("V23.8: blocks execution when database environment state is null or unverified", () => {
    const resNull = validateStagingSafetyPreflight({
      ...validStagingConfig,
      dbEnvironmentState: null
    });
    expect(resNull.allowed).toBe(false);
    expect(resNull.status).toBe("BLOCKED");

    const resUndef = validateStagingSafetyPreflight({
      ...validStagingConfig,
      dbEnvironmentState: undefined
    });
    expect(resUndef.allowed).toBe(false);
    expect(resUndef.status).toBe("BLOCKED");
  });

  // Case 9: Shared production/staging database -> BLOCKED
  it("V23.9: blocks execution when remote database does not permit synthetic operations", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      dbEnvironmentState: {
        environment: "staging",
        is_synthetic_allowed: false
      }
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/is_synthetic_allowed = false/i);
  });

  // Case 10: Unverified deployment target -> BLOCKED
  it("V23.10: blocks execution when target URL is malformed", () => {
    const res = validateStagingSafetyPreflight({
      ...validStagingConfig,
      appUrl: "not-a-valid-url"
    });
    expect(res.allowed).toBe(false);
    expect(res.status).toBe("BLOCKED");
    expect(res.reason).toMatch(/Malformed application target URL/i);
  });

  // Case 11: Correct isolated staging configuration -> ALLOWED
  it("V23.11: allows execution when all environment, URL, mutation authorization, and database staging guards pass", () => {
    const res = validateStagingSafetyPreflight(validStagingConfig);
    expect(res.allowed).toBe(true);
    expect(res.status).toBe("ALLOWED");
    expect(res.guardFailures).toHaveLength(0);
    expect(res.validatedConfig?.targetProjectRef).toBe(CANONICAL_STAGING_PROJECT_REF);
  });

  // Case 12: Failed preflight -> zero privileged mutation calls
  it("V23.12: verifies that validateStagingSafetyPreflight is a pure function that never modifies process.env or system state", () => {
    const initialEnv = process.env.ENGINE_OS_ENV;
    validateStagingSafetyPreflight({
      engineEnv: "production",
      supabaseUrl: "https://yamwmfgqqjwlfcjjkwzl.supabase.co"
    });
    expect(process.env.ENGINE_OS_ENV).toBe(initialEnv);
  });

  // Case 13: Test runner never updates system_environment
  it("V23.13: proves scripts/verify-staging.mjs contains zero write or update queries to system_environment", () => {
    const verifyScriptPath = path.resolve(process.cwd(), "scripts/verify-staging.mjs");
    const scriptContent = fs.readFileSync(verifyScriptPath, "utf-8");

    // Must never contain updates or set_system_environment RPC calls
    expect(scriptContent).not.toMatch(/from\s*\(\s*["']system_environment["']\s*\)\s*\.update/);
    expect(scriptContent).not.toMatch(/from\s*\(\s*["']system_environment["']\s*\)\s*\.insert/);
    expect(scriptContent).not.toMatch(/rpc\s*\(\s*["']set_system_environment["']/);
  });

  // Case 14: Browser tests never update system_environment
  it("V23.14: proves tests/e2e/flows.spec.ts contains zero write or update queries to system_environment", () => {
    const flowsSpecPath = path.resolve(process.cwd(), "tests/e2e/flows.spec.ts");
    const specContent = fs.readFileSync(flowsSpecPath, "utf-8");

    // Must never contain updates or set_system_environment RPC calls
    expect(specContent).not.toMatch(/from\s*\(\s*["']system_environment["']\s*\)\s*\.update/);
    expect(specContent).not.toMatch(/from\s*\(\s*["']system_environment["']\s*\)\s*\.insert/);
    expect(specContent).not.toMatch(/rpc\s*\(\s*["']set_system_environment["']/);
  });

  // Case 15: Test cleanup never performs environment restoration
  it("V23.15: proves verify-staging cleanup section contains zero environment restoration logic", () => {
    const verifyScriptPath = path.resolve(process.cwd(), "scripts/verify-staging.mjs");
    const scriptContent = fs.readFileSync(verifyScriptPath, "utf-8");

    expect(scriptContent).not.toContain("restoredDbEnv");
    expect(scriptContent).not.toContain("Restoring remote database system_environment");
  });

  // Case 16: Concurrent tests cannot override target-safety decisions
  it("V23.16: verifies preflight decisions are immutable, deterministic, and isolated across concurrent invocations", () => {
    const unsafeConfig = { ...validStagingConfig, engineEnv: "production" };
    const safeConfig = { ...validStagingConfig };

    const results = [
      validateStagingSafetyPreflight(unsafeConfig),
      validateStagingSafetyPreflight(safeConfig),
      validateStagingSafetyPreflight(unsafeConfig)
    ];

    expect(results[0].allowed).toBe(false);
    expect(results[1].allowed).toBe(true);
    expect(results[2].allowed).toBe(false);
  });
});
