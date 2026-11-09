/**
 * ENGINE//OS — Read-Only Database & Migration Audit Module
 * Platform: NOTREAL ENGINE, LLC
 * Directive: Master Directive V19.0 Section 2 & 3
 *
 * CRITICAL SAFETY INVARIANT:
 * This module performs 100% READ-ONLY metadata and schema inspection.
 * It NEVER invokes mutating business RPCs:
 * - NO approve_commercial_terms
 * - NO set_system_environment
 * - NO ingest_leadconnector_event
 * - NO submit_project_brief
 * - NO initialize_project_from_order
 *
 * It inspects PostgREST OpenAPI metadata (/rest/v1/), PostgreSQL schema definitions,
 * parameter signatures, and reads table rows purely via SELECT.
 */

export interface MigrationObjectAudit {
  name: string;
  type: "table" | "rpc" | "column" | "policy" | "state";
  expected: string;
  found: string | null;
  status: "APPLIED" | "PENDING" | "MISMATCH";
  details?: string;
}

export interface MigrationAuditResult {
  migrationId: string;
  title: string;
  allObjectsApplied: boolean;
  status: "PASS" | "PARTIAL" | "BLOCKED" | "FAIL";
  objects: Record<string, MigrationObjectAudit>;
  summary: string;
}

export interface OpenApiSpec {
  paths?: Record<
    string,
    {
      post?: {
        parameters?: Array<{
          name?: string;
          in?: string;
          schema?: {
            properties?: Record<string, { type?: string; format?: string }>;
            required?: string[];
          };
        }>;
        summary?: string;
        tags?: string[];
      };
      get?: Record<string, unknown>;
    }
  >;
  definitions?: Record<
    string,
    {
      properties?: Record<string, { type?: string; format?: string; description?: string }>;
      required?: string[];
      type?: string;
    }
  >;
}

export interface ReadOnlyAuditClient {
  from: (table: string) => {
    select: (columns?: string) => {
      limit: (count: number) => Promise<{ data?: unknown; error?: { message: string; code?: string } | null }>;
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data?: Record<string, unknown> | null; error?: { message: string; code?: string } | null }>;
      };
      order?: (column: string) => Promise<{ data?: unknown; error?: { message: string; code?: string } | null }>;
    };
  };
}

/**
 * Fetches OpenAPI schema metadata from PostgREST root endpoint in a strictly read-only manner.
 */
export async function fetchPostgRestOpenApiSpec(
  supabaseUrl: string,
  apiKey: string
): Promise<{ spec: OpenApiSpec | null; error: string | null }> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!res.ok) {
      return {
        spec: null,
        error: `PostgREST root returned HTTP ${res.status}: ${res.statusText}`
      };
    }

    const spec = (await res.json()) as OpenApiSpec;
    return { spec, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { spec: null, error: message };
  }
}

/**
 * Inspects Migration 0005: Quotation & Order Governance.
 * - Table commercial_terms_versions must exist with columns version, document_id, classification, approved_at.
 * - RPC initialize_project_from_order must exist with parameter p_order_id.
 * - RPC decide_quote must exist with parameters p_quote_id, p_decision.
 */
export function inspectMigration0005(spec: OpenApiSpec): MigrationAuditResult {
  const objects: Record<string, MigrationObjectAudit> = {};

  // 1. Table commercial_terms_versions
  const termsDef = spec.definitions?.["commercial_terms_versions"];
  const hasTermsTable = Boolean(termsDef);
  const termsProps = termsDef?.properties || {};
  const hasRequiredCols = Boolean(
    termsProps.version && termsProps.document_id && termsProps.classification
  );

  objects["commercial_terms_versions_table"] = {
    name: "commercial_terms_versions",
    type: "table",
    expected: "Table with version, document_id, classification columns",
    found: hasTermsTable ? `Table present with ${Object.keys(termsProps).length} columns` : null,
    status: hasTermsTable && hasRequiredCols ? "APPLIED" : "PENDING",
    details: hasTermsTable ? `Columns: ${Object.keys(termsProps).join(", ")}` : "Missing table definition in schema"
  };

  // 2. RPC initialize_project_from_order
  const initProjPath = spec.paths?.["/rpc/initialize_project_from_order"];
  const initProjParams = initProjPath?.post?.parameters?.[0]?.schema?.properties || {};
  const hasInitProjRpc = Boolean(initProjPath && initProjParams.p_order_id);

  objects["initialize_project_from_order_rpc"] = {
    name: "initialize_project_from_order",
    type: "rpc",
    expected: "RPC with parameter p_order_id",
    found: initProjPath ? `RPC present with parameters: ${Object.keys(initProjParams).join(", ")}` : null,
    status: hasInitProjRpc ? "APPLIED" : "PENDING",
    details: initProjPath ? "PostgREST endpoint verified" : "RPC not exposed or missing in schema"
  };

  // 3. RPC decide_quote
  const decidePath = spec.paths?.["/rpc/decide_quote"];
  const decideParams = decidePath?.post?.parameters?.[0]?.schema?.properties || {};
  const hasDecideRpc = Boolean(decidePath && decideParams.p_quote_id && decideParams.p_decision);

  objects["decide_quote_rpc"] = {
    name: "decide_quote",
    type: "rpc",
    expected: "RPC with parameters p_quote_id, p_decision",
    found: decidePath ? `RPC present with parameters: ${Object.keys(decideParams).join(", ")}` : null,
    status: hasDecideRpc ? "APPLIED" : "PENDING",
    details: decidePath ? "PostgREST endpoint verified" : "RPC not exposed or missing in schema"
  };

  const allApplied = Object.values(objects).every((o) => o.status === "APPLIED");
  const anyApplied = Object.values(objects).some((o) => o.status === "APPLIED");

  return {
    migrationId: "202611080005",
    title: "Quotation & Order Governance",
    allObjectsApplied: allApplied,
    status: allApplied ? "PASS" : anyApplied ? "PARTIAL" : "FAIL",
    objects,
    summary: allApplied
      ? "All Migration 0005 governance tables and RPCs verified in schema"
      : "Migration 0005 is partially applied or missing objects"
  };
}

/**
 * Inspects Migration 0006: Terms Environment & Founder Governance.
 * - Table system_environment must exist with columns id, environment, is_synthetic_allowed.
 * - RPC approve_commercial_terms must exist with parameter p_version.
 * - RPC set_system_environment must exist with parameters p_environment, p_allow_synthetic.
 */
export function inspectMigration0006(
  spec: OpenApiSpec,
  sysEnvRow?: Record<string, unknown> | null
): MigrationAuditResult {
  const objects: Record<string, MigrationObjectAudit> = {};

  // 1. Table system_environment
  const sysEnvDef = spec.definitions?.["system_environment"];
  const hasSysEnvTable = Boolean(sysEnvDef);
  const sysEnvProps = sysEnvDef?.properties || {};
  const hasSysEnvCols = Boolean(
    sysEnvProps.id && sysEnvProps.environment && sysEnvProps.is_synthetic_allowed
  );

  objects["system_environment_table"] = {
    name: "system_environment",
    type: "table",
    expected: "Table with id, environment, is_synthetic_allowed columns",
    found: hasSysEnvTable ? `Table present with ${Object.keys(sysEnvProps).join(", ")}` : null,
    status: hasSysEnvTable && hasSysEnvCols ? "APPLIED" : "PENDING",
    details: sysEnvRow
      ? `Live state: environment=${sysEnvRow.environment}, synthetic_allowed=${sysEnvRow.is_synthetic_allowed}`
      : hasSysEnvTable
      ? "Table definition present in schema cache"
      : "Table missing in remote schema cache"
  };

  // 2. RPC approve_commercial_terms
  const approveTermsPath = spec.paths?.["/rpc/approve_commercial_terms"];
  const approveParams = approveTermsPath?.post?.parameters?.[0]?.schema?.properties || {};
  const hasApproveRpc = Boolean(approveTermsPath && approveParams.p_version);

  objects["approve_commercial_terms_rpc"] = {
    name: "approve_commercial_terms",
    type: "rpc",
    expected: "RPC with parameter p_version (and p_reference)",
    found: approveTermsPath ? `RPC present with parameters: ${Object.keys(approveParams).join(", ")}` : null,
    status: hasApproveRpc ? "APPLIED" : "PENDING",
    details: approveTermsPath ? "PostgREST endpoint verified" : "RPC not exposed or missing in schema"
  };

  // 3. RPC set_system_environment
  const setEnvPath = spec.paths?.["/rpc/set_system_environment"];
  const setEnvParams = setEnvPath?.post?.parameters?.[0]?.schema?.properties || {};
  const hasSetEnvRpc = Boolean(setEnvPath && setEnvParams.p_environment && setEnvParams.p_allow_synthetic);

  objects["set_system_environment_rpc"] = {
    name: "set_system_environment",
    type: "rpc",
    expected: "RPC with parameters p_environment, p_allow_synthetic",
    found: setEnvPath ? `RPC present with parameters: ${Object.keys(setEnvParams).join(", ")}` : null,
    status: hasSetEnvRpc ? "APPLIED" : "PENDING",
    details: setEnvPath ? "PostgREST endpoint verified" : "RPC not exposed or missing in schema"
  };

  const allApplied = Object.values(objects).every((o) => o.status === "APPLIED");
  const anyApplied = Object.values(objects).some((o) => o.status === "APPLIED");

  return {
    migrationId: "202611080006",
    title: "Terms Environment & Founder Governance",
    allObjectsApplied: allApplied,
    status: allApplied ? "PASS" : anyApplied ? "PARTIAL" : "BLOCKED",
    objects,
    summary: allApplied
      ? "All Migration 0006 environment governance tables and RPCs verified"
      : "Migration 0006 is pending execution in Supabase Dashboard SQL Editor"
  };
}

/**
 * Inspects Migration 0007: LeadConnector Ingestion Integrity.
 * - Table webhook_events must have columns project_brief_id, lead_id.
 * - RPC ingest_leadconnector_event must exist with parameters p_provider_event_id, p_payload_hash, p_reference.
 */
export function inspectMigration0007(spec: OpenApiSpec): MigrationAuditResult {
  const objects: Record<string, MigrationObjectAudit> = {};

  // 1. Columns in webhook_events
  const webhookDef = spec.definitions?.["webhook_events"];
  const webhookProps = webhookDef?.properties || {};
  const hasFkCols = Boolean(webhookProps.project_brief_id && webhookProps.lead_id);

  objects["webhook_events_fk_columns"] = {
    name: "webhook_events (project_brief_id, lead_id)",
    type: "column",
    expected: "Foreign key columns linking webhook_events to project_briefs and leads",
    found: hasFkCols
      ? "Both project_brief_id and lead_id columns verified"
      : `Missing columns (found: ${Object.keys(webhookProps).join(", ")})`,
    status: hasFkCols ? "APPLIED" : "PENDING",
    details: hasFkCols ? "Relational provenance columns present" : "Columns not yet added to webhook_events"
  };

  // 2. RPC ingest_leadconnector_event
  const ingestPath = spec.paths?.["/rpc/ingest_leadconnector_event"];
  const ingestParams = ingestPath?.post?.parameters?.[0]?.schema?.properties || {};
  const hasIngestRpc = Boolean(
    ingestPath &&
      ingestParams.p_provider_event_id &&
      ingestParams.p_payload_hash &&
      ingestParams.p_reference
  );

  objects["ingest_leadconnector_event_rpc"] = {
    name: "ingest_leadconnector_event",
    type: "rpc",
    expected: "RPC with parameters p_provider_event_id, p_payload_hash, p_reference",
    found: ingestPath ? `RPC present with parameters: ${Object.keys(ingestParams).join(", ")}` : null,
    status: hasIngestRpc ? "APPLIED" : "PENDING",
    details: ingestPath ? "PostgREST endpoint verified" : "RPC not exposed or missing in schema"
  };

  const allApplied = Object.values(objects).every((o) => o.status === "APPLIED");
  const anyApplied = Object.values(objects).some((o) => o.status === "APPLIED");

  return {
    migrationId: "202611080007",
    title: "LeadConnector Ingestion Integrity",
    allObjectsApplied: allApplied,
    status: allApplied ? "PASS" : anyApplied ? "PARTIAL" : "BLOCKED",
    objects,
    summary: allApplied
      ? "All Migration 0007 ingestion RPCs and webhook provenance columns verified"
      : "Migration 0007 is pending execution in Supabase Dashboard SQL Editor"
  };
}

/**
 * Full Read-Only Audit Suite.
 * Executes purely read-only schema queries and metadata inspection.
 * NEVER mutates data. NEVER approves terms. NEVER alters environment.
 */
export async function executeReadOnlyMigrationAudit(
  supabaseUrl: string,
  serviceKey: string,
  client?: ReadOnlyAuditClient
): Promise<{
  success: boolean;
  blocked: boolean;
  error?: string;
  migration0005: MigrationAuditResult;
  migration0006: MigrationAuditResult;
  migration0007: MigrationAuditResult;
}> {
  // Step 1: Read OpenAPI spec via PostgREST metadata endpoint
  const { spec, error } = await fetchPostgRestOpenApiSpec(supabaseUrl, serviceKey);

  if (error || !spec) {
    const blockedResult = (id: string, title: string): MigrationAuditResult => ({
      migrationId: id,
      title,
      allObjectsApplied: false,
      status: "BLOCKED",
      objects: {},
      summary: `Administrative metadata query blocked: ${error || "No spec available"}`
    });

    return {
      success: false,
      blocked: true,
      error: error || "Could not retrieve PostgREST metadata",
      migration0005: blockedResult("202611080005", "Quotation & Order Governance"),
      migration0006: blockedResult("202611080006", "Terms Environment & Founder Governance"),
      migration0007: blockedResult("202611080007", "LeadConnector Ingestion Integrity")
    };
  }

  // Step 2: Read current system_environment row via pure SELECT (optional, read-only)
  let sysEnvRow: Record<string, unknown> | null = null;
  if (client) {
    try {
      const { data } = await client
        .from("system_environment")
        .select("id, environment, is_synthetic_allowed, updated_at")
        .eq("id", "current")
        .maybeSingle();
      sysEnvRow = data || null;
    } catch {
      // Ignore if table does not exist yet; audit will flag it as PENDING
    }
  }

  // Step 3: Run read-only evaluations
  const m0005 = inspectMigration0005(spec);
  const m0006 = inspectMigration0006(spec, sysEnvRow);
  const m0007 = inspectMigration0007(spec);

  const allPassed = m0005.status === "PASS" && m0006.status === "PASS" && m0007.status === "PASS";
  const anyBlocked = m0005.status === "BLOCKED" || m0006.status === "BLOCKED" || m0007.status === "BLOCKED";

  return {
    success: allPassed,
    blocked: anyBlocked,
    migration0005: m0005,
    migration0006: m0006,
    migration0007: m0007
  };
}

// =============================================================================
// LEVEL 2: POSTGRESQL CATALOG VERIFICATION ARCHITECTURE (Directive V21.0)
// =============================================================================

export interface PostgresCatalogClient {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}

export interface CatalogObjectVerification {
  name: string;
  type: "table" | "column" | "function" | "grant" | "trigger" | "policy" | "constraint";
  expected: string;
  found: string | null;
  status: "APPLIED" | "NOT_APPLIED" | "MISMATCH" | "FAIL";
  details?: string;
}

export interface PostgresCatalogAuditResult {
  status: "PASS" | "FAIL" | "BLOCKED" | "PARTIAL" | "NOT_APPLIED" | "MISMATCH";
  summary: string;
  databaseIdentity?: {
    database: string;
    user: string;
    version: string;
  };
  migrationsLedger?: string[];
  migration0005: {
    status: "PASS" | "FAIL" | "NOT_APPLIED" | "MISMATCH";
    objects: Record<string, CatalogObjectVerification>;
  };
  migration0006: {
    status: "PASS" | "FAIL" | "NOT_APPLIED" | "MISMATCH";
    objects: Record<string, CatalogObjectVerification>;
  };
  migration0007: {
    status: "PASS" | "FAIL" | "NOT_APPLIED" | "MISMATCH";
    objects: Record<string, CatalogObjectVerification>;
  };
  errors?: string[];
}

/**
 * Executes authentic read-only PostgreSQL catalog queries against pg_catalog & information_schema.
 * Enforces read-only transaction semantics, minimum timeouts, and validates schema invariants.
 * NEVER mutates data. NEVER approves terms. NEVER alters environment.
 */
export async function executePostgresCatalogAudit(
  clientOrUrl: string | PostgresCatalogClient | null | undefined,
  expectedDbName?: string
): Promise<PostgresCatalogAuditResult> {
  if (!clientOrUrl) {
    return {
      status: "BLOCKED",
      summary:
        "Direct PostgreSQL TCP connection string (DATABASE_URL / port 5432) is not configured in local environment. PostgREST REST interface intentionally does not expose pg_catalog or information_schema directly. Direct catalog inspection (pg_proc, pg_policy, schema_migrations) remains truthfully BLOCKED.",
      migration0005: { status: "NOT_APPLIED", objects: {} },
      migration0006: { status: "NOT_APPLIED", objects: {} },
      migration0007: { status: "NOT_APPLIED", objects: {} }
    };
  }

  let client: PostgresCatalogClient;
  let closeClient = false;

  if (typeof clientOrUrl === "string") {
    try {
      const pgModule = await import("pg");
      const { Client } = pgModule.default || pgModule;
      const pgClient = new Client({
        connectionString: clientOrUrl,
        ssl: { rejectUnauthorized: false },
        statement_timeout: 5000,
        connectionTimeoutMillis: 5000
      });
      await pgClient.connect();
      client = pgClient;
      closeClient = true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isRefused =
        errorMsg.includes("ECONNREFUSED") || errorMsg.includes("timeout") || errorMsg.includes("ENOTFOUND");
      return {
        status: isRefused ? "BLOCKED" : "FAIL",
        summary: `Direct PostgreSQL connection failed: ${errorMsg}`,
        migration0005: { status: "NOT_APPLIED", objects: {} },
        migration0006: { status: "NOT_APPLIED", objects: {} },
        migration0007: { status: "NOT_APPLIED", objects: {} },
        errors: [errorMsg]
      };
    }
  } else {
    client = clientOrUrl;
  }

  try {
    // 1. Enforce read-only session & query timeout
    await client.query("BEGIN TRANSACTION READ ONLY;");
    await client.query("SET statement_timeout = '5000ms';");

    // 2. Verify Database Identity
    const identRes = await client.query("SELECT current_database() AS db, current_user AS usr, version() AS ver;");
    const dbIdent = {
      database: String(identRes.rows[0]?.db || ""),
      user: String(identRes.rows[0]?.usr || ""),
      version: String(identRes.rows[0]?.ver || "")
    };

    if (expectedDbName && dbIdent.database !== expectedDbName) {
      await client.query("COMMIT;");
      return {
        status: "FAIL",
        summary: `Database identity mismatch: expected '${expectedDbName}', connected to '${dbIdent.database}'`,
        databaseIdentity: dbIdent,
        migration0005: { status: "FAIL", objects: {} },
        migration0006: { status: "FAIL", objects: {} },
        migration0007: { status: "FAIL", objects: {} },
        errors: [`Connected to unexpected database: ${dbIdent.database}`]
      };
    }

    // 3. Query Supabase Migration Ledger
    let migrationsLedger: string[] = [];
    try {
      const ledgerRes = await client.query(`
        SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
      `);
      migrationsLedger = (ledgerRes.rows || []).map((r) => String(r.version));
    } catch {
      // ledger table may not exist
    }

    // 4. Query Tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
    `);
    const publicTables = new Set((tablesRes.rows || []).map((r) => String(r.table_name)));

    // 5. Query Columns in public schema
    const colsRes = await client.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public';
    `);
    const tableCols: Record<string, { name: string; is_nullable: string }[]> = {};
    for (const r of colsRes.rows || []) {
      const t = String(r.table_name);
      if (!tableCols[t]) tableCols[t] = [];
      tableCols[t].push({ name: String(r.column_name), is_nullable: String(r.is_nullable) });
    }

    // 6. Query Functions in pg_proc
    const procsRes = await client.query(`
      SELECT p.proname,
             pg_get_function_identity_arguments(p.oid) AS args,
             p.prosecdef AS is_security_definer
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public';
    `);
    const publicProcs: Record<string, { proname: string; args: string; is_security_definer: boolean }[]> = {};
    for (const r of procsRes.rows || []) {
      const name = String(r.proname);
      if (!publicProcs[name]) publicProcs[name] = [];
      publicProcs[name].push({
        proname: name,
        args: String(r.args || ""),
        is_security_definer: Boolean(r.is_security_definer)
      });
    }

    // 7. Query Grants in routine_privileges
    const grantsRes = await client.query(`
      SELECT routine_name, grantee, privilege_type
      FROM information_schema.routine_privileges
      WHERE specific_schema = 'public';
    `);
    const routineGrants: Record<string, string[]> = {};
    for (const r of grantsRes.rows || []) {
      const name = String(r.routine_name);
      if (!routineGrants[name]) routineGrants[name] = [];
      routineGrants[name].push(`${r.grantee}:${r.privilege_type}`);
    }

    // 8. Query Triggers
    const triggersRes = await client.query(`
      SELECT t.tgname, c.relname AS table_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND NOT t.tgisinternal;
    `);
    const tableTriggers: Record<string, string[]> = {};
    for (const r of triggersRes.rows || []) {
      const tbl = String(r.table_name);
      if (!tableTriggers[tbl]) tableTriggers[tbl] = [];
      tableTriggers[tbl].push(String(r.tgname));
    }

    // 9. Query RLS Policies
    const policiesRes = await client.query(`
      SELECT polname, tablename
      FROM pg_policies
      WHERE schemaname = 'public';
    `);
    const tablePolicies: Record<string, string[]> = {};
    for (const r of policiesRes.rows || []) {
      const tbl = String(r.tablename);
      if (!tablePolicies[tbl]) tablePolicies[tbl] = [];
      tablePolicies[tbl].push(String(r.polname));
    }

    // 10. Query Foreign Keys
    const fkRes = await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `);
    const tableFks: Record<string, { col: string; foreignTable: string }[]> = {};
    for (const r of fkRes.rows || []) {
      const tbl = String(r.table_name);
      if (!tableFks[tbl]) tableFks[tbl] = [];
      tableFks[tbl].push({ col: String(r.column_name), foreignTable: String(r.foreign_table_name) });
    }

    await client.query("COMMIT;");

    // --- EVALUATE MIGRATION 0005 ---
    const m0005Objects: Record<string, CatalogObjectVerification> = {};

    const hasTermsTable = publicTables.has("commercial_terms_versions");
    const termsCols = (tableCols["commercial_terms_versions"] || []).map((c) => c.name);
    const hasRequiredTermsCols = ["version", "document_id", "classification"].every((c) => termsCols.includes(c));

    m0005Objects["commercial_terms_versions"] = {
      name: "commercial_terms_versions",
      type: "table",
      expected: "Table with columns version, document_id, classification",
      found: hasTermsTable ? `Table present (${termsCols.join(", ")})` : null,
      status: hasTermsTable && hasRequiredTermsCols ? "APPLIED" : hasTermsTable ? "MISMATCH" : "NOT_APPLIED",
      details: hasTermsTable ? `Columns: ${termsCols.join(", ")}` : "Table missing from pg_class"
    };

    const decideQuoteProcs = publicProcs["decide_quote"] || [];
    const hasDecideQuote = decideQuoteProcs.length > 0;
    const decideQuoteMatch = decideQuoteProcs.some(
      (p) => p.args.includes("p_quote_id") && p.args.includes("p_decision")
    );

    m0005Objects["decide_quote"] = {
      name: "decide_quote",
      type: "function",
      expected: "Function with parameters p_quote_id (uuid), p_decision (text)",
      found: hasDecideQuote ? `Function exists with args (${decideQuoteProcs[0].args})` : null,
      status: decideQuoteMatch ? "APPLIED" : hasDecideQuote ? "MISMATCH" : "NOT_APPLIED",
      details: hasDecideQuote ? `Signature: ${decideQuoteProcs[0].args}` : "Function missing in pg_proc"
    };

    const initProjectProcs = publicProcs["initialize_project_from_order"] || [];
    const hasInitProject = initProjectProcs.length > 0;
    const initProjectMatch = initProjectProcs.some((p) => p.args.includes("p_order_id"));

    m0005Objects["initialize_project_from_order"] = {
      name: "initialize_project_from_order",
      type: "function",
      expected: "Function with parameter p_order_id (uuid)",
      found: hasInitProject ? `Function exists with args (${initProjectProcs[0].args})` : null,
      status: initProjectMatch ? "APPLIED" : hasInitProject ? "MISMATCH" : "NOT_APPLIED",
      details: hasInitProject ? `Signature: ${initProjectProcs[0].args}` : "Function missing in pg_proc"
    };

    // --- EVALUATE MIGRATION 0006 ---
    const m0006Objects: Record<string, CatalogObjectVerification> = {};

    const hasSysEnvTable = publicTables.has("system_environment");
    const sysEnvCols = (tableCols["system_environment"] || []).map((c) => c.name);
    const hasSysEnvCols = ["id", "environment", "is_synthetic_allowed"].every((c) => sysEnvCols.includes(c));

    m0006Objects["system_environment"] = {
      name: "system_environment",
      type: "table",
      expected: "Table with columns id, environment, is_synthetic_allowed",
      found: hasSysEnvTable ? `Table present (${sysEnvCols.join(", ")})` : null,
      status: hasSysEnvTable && hasSysEnvCols ? "APPLIED" : hasSysEnvTable ? "MISMATCH" : "NOT_APPLIED",
      details: hasSysEnvTable ? `Columns: ${sysEnvCols.join(", ")}` : "Table missing from pg_class"
    };

    const superAdminProcs = publicProcs["current_user_is_super_admin"] || [];
    const hasSuperAdminProc = superAdminProcs.length > 0;
    const superAdminSecDef = superAdminProcs.some((p) => p.is_security_definer);

    m0006Objects["current_user_is_super_admin"] = {
      name: "current_user_is_super_admin",
      type: "function",
      expected: "SECURITY DEFINER function returning boolean",
      found: hasSuperAdminProc ? `Function exists (secdef=${superAdminSecDef})` : null,
      status: hasSuperAdminProc && superAdminSecDef ? "APPLIED" : hasSuperAdminProc ? "MISMATCH" : "NOT_APPLIED",
      details: hasSuperAdminProc ? `Security Definer: ${superAdminSecDef}` : "Function missing in pg_proc"
    };

    const setEnvProcs = publicProcs["set_system_environment"] || [];
    const hasSetEnv = setEnvProcs.length > 0;
    const setEnvMatch = setEnvProcs.some((p) => p.args.includes("p_environment"));

    m0006Objects["set_system_environment"] = {
      name: "set_system_environment",
      type: "function",
      expected: "Function with parameter p_environment",
      found: hasSetEnv ? `Function exists with args (${setEnvProcs[0].args})` : null,
      status: setEnvMatch ? "APPLIED" : hasSetEnv ? "MISMATCH" : "NOT_APPLIED",
      details: hasSetEnv ? `Signature: ${setEnvProcs[0].args}` : "Function missing in pg_proc"
    };

    const approveTermsProcs = publicProcs["approve_commercial_terms"] || [];
    const hasApproveTerms = approveTermsProcs.length > 0;
    const approveTermsMatch = approveTermsProcs.some((p) => p.args.includes("p_version"));

    m0006Objects["approve_commercial_terms"] = {
      name: "approve_commercial_terms",
      type: "function",
      expected: "Function with parameter p_version",
      found: hasApproveTerms ? `Function exists with args (${approveTermsProcs[0].args})` : null,
      status: approveTermsMatch ? "APPLIED" : hasApproveTerms ? "MISMATCH" : "NOT_APPLIED",
      details: hasApproveTerms ? `Signature: ${approveTermsProcs[0].args}` : "Function missing in pg_proc"
    };

    const orderTriggers = tableTriggers["orders"] || [];
    const hasClearanceTrg = orderTriggers.some(
      (t) => t.toLowerCase().includes("clearance") || t.toLowerCase().includes("financial")
    );

    m0006Objects["trg_order_financial_clearance"] = {
      name: "trg_order_financial_clearance",
      type: "trigger",
      expected: "Financial clearance trigger on orders table",
      found: hasClearanceTrg ? `Trigger verified on orders` : null,
      status: hasClearanceTrg ? "APPLIED" : "NOT_APPLIED",
      details: hasClearanceTrg ? `Triggers on orders: ${orderTriggers.join(", ")}` : "Trigger missing on orders table"
    };

    const sysEnvPolicies = tablePolicies["system_environment"] || [];
    const hasSysEnvPolicies = sysEnvPolicies.length > 0;

    m0006Objects["system_environment_policies"] = {
      name: "system_environment_policies",
      type: "policy",
      expected: "RLS policies governing system_environment read and admin write",
      found: hasSysEnvPolicies ? `Policies present: ${sysEnvPolicies.join(", ")}` : null,
      status: hasSysEnvPolicies ? "APPLIED" : "NOT_APPLIED",
      details: hasSysEnvPolicies ? `Policies: ${sysEnvPolicies.join(", ")}` : "No RLS policies found on system_environment"
    };

    // --- EVALUATE MIGRATION 0007 ---
    const m0007Objects: Record<string, CatalogObjectVerification> = {};

    const webhookCols = (tableCols["webhook_events"] || []).map((c) => c.name);
    const hasWebhookFkCols = webhookCols.includes("project_brief_id") && webhookCols.includes("lead_id");

    m0007Objects["webhook_events_fk_columns"] = {
      name: "webhook_events_fk_columns",
      type: "column",
      expected: "Columns project_brief_id and lead_id on webhook_events",
      found: hasWebhookFkCols ? `Columns verified on webhook_events` : null,
      status: hasWebhookFkCols ? "APPLIED" : "NOT_APPLIED",
      details: hasWebhookFkCols ? "Provenance columns verified" : `Columns missing (found: ${webhookCols.join(", ")})`
    };

    const webhookFks = tableFks["webhook_events"] || [];
    const hasBriefFk = webhookFks.some((fk) => fk.col === "project_brief_id" && fk.foreignTable === "project_briefs");
    const hasLeadFk = webhookFks.some((fk) => fk.col === "lead_id" && fk.foreignTable === "leads");

    m0007Objects["webhook_events_fk_constraints"] = {
      name: "webhook_events_fk_constraints",
      type: "constraint",
      expected: "Foreign keys to project_briefs and leads",
      found: hasBriefFk && hasLeadFk ? `FKs verified` : null,
      status: hasBriefFk && hasLeadFk ? "APPLIED" : "NOT_APPLIED",
      details: `FKs found: ${webhookFks.map((fk) => `${fk.col}->${fk.foreignTable}`).join(", ") || "none"}`
    };

    const briefCols = tableCols["project_briefs"] || [];
    const serviceIdCol = briefCols.find((c) => c.name === "service_id");
    const isServiceIdNullable = serviceIdCol?.is_nullable === "YES";

    m0007Objects["project_briefs_service_id_nullable"] = {
      name: "project_briefs_service_id_nullable",
      type: "column",
      expected: "project_briefs.service_id column nullable for unclassified enquiries",
      found: serviceIdCol ? `service_id is_nullable=${serviceIdCol.is_nullable}` : null,
      status: isServiceIdNullable ? "APPLIED" : serviceIdCol ? "MISMATCH" : "NOT_APPLIED",
      details: serviceIdCol ? `is_nullable: ${serviceIdCol.is_nullable}` : "Column service_id missing"
    };

    const ingestProcs = publicProcs["ingest_leadconnector_event"] || [];
    const hasIngestProc = ingestProcs.length > 0;
    const ingestProcMatch = ingestProcs.some(
      (p) => p.args.includes("p_provider_event_id") && p.args.includes("p_payload_hash")
    );
    const ingestSecDef = ingestProcs.some((p) => p.is_security_definer);

    m0007Objects["ingest_leadconnector_event"] = {
      name: "ingest_leadconnector_event",
      type: "function",
      expected: "SECURITY DEFINER function with p_provider_event_id, p_payload_hash",
      found: hasIngestProc ? `Function exists (secdef=${ingestSecDef})` : null,
      status: ingestProcMatch && ingestSecDef ? "APPLIED" : hasIngestProc ? "MISMATCH" : "NOT_APPLIED",
      details: hasIngestProc ? `Signature: ${ingestProcs[0]?.args || "none"}` : "Function missing in pg_proc"
    };

    const ingestGrants = routineGrants["ingest_leadconnector_event"] || [];
    const serviceRoleGranted = ingestGrants.some((g) => g.startsWith("service_role:"));
    const anonGranted = ingestGrants.some((g) => g.startsWith("anon:") || g.startsWith("public:"));

    m0007Objects["ingest_leadconnector_event_grants"] = {
      name: "ingest_leadconnector_event_grants",
      type: "grant",
      expected: "EXECUTE granted to service_role, revoked from public/anon",
      found: ingestGrants.length > 0 ? `Grants: ${ingestGrants.join(", ")}` : null,
      status: serviceRoleGranted && !anonGranted ? "APPLIED" : ingestGrants.length > 0 ? "FAIL" : "NOT_APPLIED",
      details: `Grants: ${ingestGrants.join(", ") || "none"}`
    };

    // Calculate migration statuses
    const calcStatus = (objs: Record<string, CatalogObjectVerification>) => {
      const vals = Object.values(objs);
      if (vals.every((o) => o.status === "APPLIED")) return "PASS";
      if (vals.some((o) => o.status === "MISMATCH")) return "MISMATCH";
      if (vals.some((o) => o.status === "FAIL")) return "FAIL";
      if (vals.some((o) => o.status === "APPLIED")) return "FAIL";
      return "NOT_APPLIED";
    };

    const status0005 = calcStatus(m0005Objects);
    const status0006 = calcStatus(m0006Objects);
    const status0007 = calcStatus(m0007Objects);

    const allPassed = status0005 === "PASS" && status0006 === "PASS" && status0007 === "PASS";
    const anyMismatch = status0005 === "MISMATCH" || status0006 === "MISMATCH" || status0007 === "MISMATCH";
    const anyFail = status0005 === "FAIL" || status0006 === "FAIL" || status0007 === "FAIL";

    const overallLevel2Status = allPassed ? "PASS" : anyMismatch ? "MISMATCH" : anyFail ? "FAIL" : "NOT_APPLIED";

    return {
      status: overallLevel2Status,
      summary: allPassed
        ? "All database objects, functions, triggers, and grants verified in PostgreSQL catalog."
        : `PostgreSQL catalog verification incomplete: 0005=${status0005}, 0006=${status0006}, 0007=${status0007}`,
      databaseIdentity: dbIdent,
      migrationsLedger,
      migration0005: { status: status0005, objects: m0005Objects },
      migration0006: { status: status0006, objects: m0006Objects },
      migration0007: { status: status0007, objects: m0007Objects }
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isRefused =
      errorMsg.includes("ECONNREFUSED") || errorMsg.includes("timeout") || errorMsg.includes("ENOTFOUND");
    return {
      status: isRefused ? "BLOCKED" : "FAIL",
      summary: `PostgreSQL catalog query failed: ${errorMsg}`,
      migration0005: { status: "NOT_APPLIED", objects: {} },
      migration0006: { status: "NOT_APPLIED", objects: {} },
      migration0007: { status: "NOT_APPLIED", objects: {} },
      errors: [errorMsg]
    };
  } finally {
    if (closeClient && "end" in client && typeof (client as { end: () => Promise<void> }).end === "function") {
      await (client as { end: () => Promise<void> }).end();
    }
  }
}

/**
 * Unified Readiness Gate combining Level 1 (API Schema) and Level 2 (PostgreSQL Catalog).
 * Implements Directive V21.0 Section 4 truth rules:
 * - Never converts BLOCKED or FAIL to PASS.
 * - Nonzero exit code if ANY mandatory verification check is BLOCKED or FAIL.
 * - Only yields PASS (exitCode 0) if BOTH Level 1 and Level 2 pass completely.
 */
export function evaluateOverallAuditStatus(
  level1Result: {
    success: boolean;
    blocked: boolean;
    migration0005: MigrationAuditResult;
    migration0006: MigrationAuditResult;
    migration0007: MigrationAuditResult;
  },
  level2Result: PostgresCatalogAuditResult
): {
  overallStatus: "PASS" | "FAIL" | "BLOCKED" | "PARTIAL";
  exitCode: number;
  summary: string;
} {
  // If Level 2 has an active failure or mismatch
  if (level2Result.status === "FAIL" || level2Result.status === "MISMATCH") {
    return {
      overallStatus: "FAIL",
      exitCode: 1,
      summary: `Catalog audit failure detected: ${level2Result.summary}`
    };
  }

  // If Level 1 has a definite failure
  if (
    level1Result.migration0005.status === "FAIL" ||
    level1Result.migration0006.status === "FAIL" ||
    level1Result.migration0007.status === "FAIL"
  ) {
    return {
      overallStatus: "FAIL",
      exitCode: 1,
      summary: "API schema audit detected incomplete or failed objects"
    };
  }

  // If Level 2 is BLOCKED or NOT_APPLIED
  if (level2Result.status === "BLOCKED" || level2Result.status === "NOT_APPLIED") {
    const isLevel1Blocked = level1Result.blocked || !level1Result.success;
    return {
      overallStatus: "BLOCKED",
      exitCode: 1,
      summary: isLevel1Blocked
        ? "Audit incomplete: API schema migrations pending and PostgreSQL direct catalog verification blocked."
        : "Audit incomplete: API schema verified, but PostgreSQL catalog verification is BLOCKED (direct port 5432 required)."
    };
  }

  // If Level 1 is BLOCKED
  if (level1Result.blocked || !level1Result.success) {
    return {
      overallStatus: "BLOCKED",
      exitCode: 1,
      summary: "Audit incomplete: Migration objects pending in API schema."
    };
  }

  // If BOTH Level 1 and Level 2 are PASS
  if (level1Result.success && level2Result.status === "PASS") {
    return {
      overallStatus: "PASS",
      exitCode: 0,
      summary:
        "Full two-level database verification completed successfully: API Schema verified and PostgreSQL catalog verified."
    };
  }

  return {
    overallStatus: "BLOCKED",
    exitCode: 1,
    summary: "Verification incomplete."
  };
}
