/**
 * ENGINE//OS — Read-Only Database & Migration Audit Module (Pure ESM)
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
 */

/**
 * Fetches OpenAPI schema metadata from PostgREST root endpoint in a strictly read-only manner.
 */
export async function fetchPostgRestOpenApiSpec(supabaseUrl, apiKey) {
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

    const spec = await res.json();
    return { spec, error: null };
  } catch (err) {
    return { spec: null, error: err.message || String(err) };
  }
}

/**
 * Inspects Migration 0005: Quotation & Order Governance.
 */
export function inspectMigration0005(spec) {
  const objects = {};

  // 1. Table commercial_terms_versions
  const termsDef = spec?.definitions?.["commercial_terms_versions"];
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
  const initProjPath = spec?.paths?.["/rpc/initialize_project_from_order"];
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
  const decidePath = spec?.paths?.["/rpc/decide_quote"];
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
 */
export function inspectMigration0006(spec, sysEnvRow) {
  const objects = {};

  // 1. Table system_environment
  const sysEnvDef = spec?.definitions?.["system_environment"];
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
  const approveTermsPath = spec?.paths?.["/rpc/approve_commercial_terms"];
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
  const setEnvPath = spec?.paths?.["/rpc/set_system_environment"];
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
 */
export function inspectMigration0007(spec) {
  const objects = {};

  // 1. Columns in webhook_events
  const webhookDef = spec?.definitions?.["webhook_events"];
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
  const ingestPath = spec?.paths?.["/rpc/ingest_leadconnector_event"];
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
 */
export async function executeReadOnlyMigrationAudit(supabaseUrl, serviceKey, client) {
  const { spec, error } = await fetchPostgRestOpenApiSpec(supabaseUrl, serviceKey);

  if (error || !spec) {
    const blockedResult = (id, title) => ({
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

  let sysEnvRow = null;
  if (client) {
    try {
      const { data } = await client
        .from("system_environment")
        .select("id, environment, is_synthetic_allowed, updated_at")
        .eq("id", "current")
        .maybeSingle();
      sysEnvRow = data || null;
    } catch {
      // Table does not exist yet; will be flagged as PENDING
    }
  }

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
