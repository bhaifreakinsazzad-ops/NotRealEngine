/**
 * ENGINE//OS — Shared Staging Preflight & Safety Validation Module
 * Platform: NOTREAL ENGINE, LLC
 * Directive: Master Directive V23.1 Section 4
 *
 * CRITICAL SAFETY INVARIANT:
 * State-mutating test runners (scripts/verify-staging.mjs, tests/e2e/flows.spec.ts, etc.)
 * MUST execute this preflight validation BEFORE creating ANY database records,
 * auth users, profiles, briefs, leads, quotes, orders, or storage files.
 *
 * PROHIBITED:
 * - NO test runner may EVER modify public.system_environment to force tests to pass.
 * - NO test runner may switch environment from production to staging.
 * - NO test runner may enable synthetic operations on an unauthorized database.
 * - NO test cleanup may perform environment restoration (since modification is forbidden).
 *
 * If ANY condition fails, validation fails closed with code BLOCKED or FAIL,
 * and zero privileged mutations are performed.
 */

export interface StagingPreflightParams {
  engineEnv?: string;
  supabaseUrl?: string;
  appUrl?: string;
  playwrightBaseUrl?: string;
  allowMutationFlag?: boolean;
  allowMutationEnv?: string;
  approvedStagingProjectRef?: string;
  approvedStagingHosts?: string[];
  dbEnvironmentState?: {
    environment: string;
    is_synthetic_allowed: boolean;
  } | null;
}

export interface StagingPreflightResult {
  allowed: boolean;
  status: "ALLOWED" | "BLOCKED" | "FAIL";
  reason: string;
  guardFailures: string[];
  validatedConfig?: {
    engineEnv: string;
    targetProjectRef: string;
    targetOrigin: string;
    dbEnvironment: string;
    isSyntheticAllowed: boolean;
  };
}

export const CANONICAL_STAGING_PROJECT_REF = "yamwmfgqqjwlfcjjkwzl";

export const CANONICAL_APPROVED_STAGING_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1"
];

export const PRODUCTION_FORBIDDEN_HOSTS = [
  "app.notrealengine.online",
  "notrealengine.online",
  "www.notrealengine.online",
  "notrealengine.vercel.app"
];

/**
 * Validates whether the environment and database are safe and authorized for state-mutating staging fixtures.
 * Pure evaluation function — NEVER mutates state, NEVER modifies database settings.
 */
export function validateStagingSafetyPreflight(params: StagingPreflightParams): StagingPreflightResult {
  const guardFailures: string[] = [];

  const approvedProjectRef = params.approvedStagingProjectRef || CANONICAL_STAGING_PROJECT_REF;
  const approvedHosts = [
    ...(params.approvedStagingHosts || CANONICAL_APPROVED_STAGING_HOSTS),
    ...(process.env.APPROVED_STAGING_HOSTS ? process.env.APPROVED_STAGING_HOSTS.split(",").map((h) => h.trim()) : [])
  ];

  // 1. Guard: Explicit ENGINE_OS_ENV === "staging"
  const engineEnv = (params.engineEnv || "").trim();
  if (!engineEnv) {
    guardFailures.push("Missing ENGINE_OS_ENV. Fail-closed: Must be explicitly configured as 'staging'.");
  } else if (engineEnv === "production") {
    guardFailures.push("ENGINE_OS_ENV is 'production'. Mutating fixtures strictly prohibited against production environment.");
  } else if (engineEnv !== "staging") {
    guardFailures.push(`Unrecognized ENGINE_OS_ENV: '${engineEnv}'. Only 'staging' is permitted for mutating tests.`);
  }

  // 2. Guard: Supabase URL format & exact staging project reference
  const supabaseUrlStr = (params.supabaseUrl || "").trim();
  let supabaseHost = "";
  if (!supabaseUrlStr) {
    guardFailures.push("Missing NEXT_PUBLIC_SUPABASE_URL.");
  } else {
    try {
      const parsedSupa = new URL(supabaseUrlStr);
      if (parsedSupa.protocol !== "https:") {
        guardFailures.push(`Invalid NEXT_PUBLIC_SUPABASE_URL protocol: '${parsedSupa.protocol}'. Must be https.`);
      }
      supabaseHost = parsedSupa.hostname;
      const refPrefix = supabaseHost.split(".")[0];
      if (refPrefix !== approvedProjectRef) {
        guardFailures.push(`NEXT_PUBLIC_SUPABASE_URL project ref '${refPrefix}' does not match approved staging project '${approvedProjectRef}'.`);
      }
    } catch {
      guardFailures.push(`Malformed NEXT_PUBLIC_SUPABASE_URL: '${supabaseUrlStr}'.`);
    }
  }

  // 3. Guard: Target Origin Allowlist & Production Domain Rejection
  const candidateUrls = [params.appUrl, params.playwrightBaseUrl].filter(Boolean) as string[];
  let validatedOrigin = "";
  if (candidateUrls.length === 0) {
    // Default to localhost if unspecified in local runner, but must be valid URL
    candidateUrls.push("http://localhost:3000");
  }

  for (const rawUrl of candidateUrls) {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();

      // Check production blacklist
      if (PRODUCTION_FORBIDDEN_HOSTS.includes(host)) {
        guardFailures.push(`Target URL hostname '${host}' matches forbidden production domain. Mutating tests strictly blocked.`);
      }

      // Check staging allowlist
      const isApproved = approvedHosts.some((ah) => host === ah || host.endsWith(`.${ah}`));
      if (!isApproved) {
        guardFailures.push(`Target URL hostname '${host}' is not in approved staging allowlist: [${approvedHosts.join(", ")}].`);
      } else if (!validatedOrigin) {
        validatedOrigin = parsed.origin;
      }
    } catch {
      guardFailures.push(`Malformed application target URL: '${rawUrl}'.`);
    }
  }

  // 4. Guard: Explicit Mutation Authorization
  const hasCliFlag = Boolean(params.allowMutationFlag);
  const hasEnvAuth = params.allowMutationEnv === "true" || process.env.ALLOW_STAGING_MUTATION === "true";
  if (!hasCliFlag && !hasEnvAuth) {
    guardFailures.push("Missing deliberate mutation authorization. Must pass '--allow-mutation' flag or set ALLOW_STAGING_MUTATION=true.");
  }

  // 5. Guard: Remote Database system_environment must ALREADY be staging with synthetic allowed
  // Tests must NEVER update this table. If DB reports production, runner fails closed.
  if (params.dbEnvironmentState === undefined) {
    // If not checked or not passed, fail closed
    guardFailures.push("Database environment governance state not verified.");
  } else if (params.dbEnvironmentState === null) {
    guardFailures.push("Remote database system_environment row is missing or unreachable. Fail-closed: Cannot verify staging database mode.");
  } else {
    const { environment: dbEnv, is_synthetic_allowed: synAllowed } = params.dbEnvironmentState;
    if (dbEnv === "production") {
      guardFailures.push("Remote database is configured in 'production' mode. Tests MUST NEVER modify system_environment. Mutating tests halted.");
    } else if (dbEnv !== "staging") {
      guardFailures.push(`Remote database is configured in unknown environment mode '${dbEnv}'. Expected 'staging'.`);
    }

    if (!synAllowed) {
      guardFailures.push("Remote database has 'is_synthetic_allowed = false'. Synthetic test operations are forbidden by database governance.");
    }
  }

  if (guardFailures.length > 0) {
    return {
      allowed: false,
      status: "BLOCKED",
      reason: `Staging safety preflight BLOCKED (${guardFailures.length} guard violation${guardFailures.length > 1 ? "s" : ""}): ${guardFailures.join("; ")}`,
      guardFailures
    };
  }

  return {
    allowed: true,
    status: "ALLOWED",
    reason: "All staging safety guards passed. Target is an isolated staging deployment with pre-configured staging database.",
    guardFailures: [],
    validatedConfig: {
      engineEnv,
      targetProjectRef: approvedProjectRef,
      targetOrigin: validatedOrigin || "http://localhost:3000",
      dbEnvironment: params.dbEnvironmentState!.environment,
      isSyntheticAllowed: params.dbEnvironmentState!.is_synthetic_allowed
    }
  };
}
