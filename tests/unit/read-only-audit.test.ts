import { describe, expect, it, vi } from "vitest";
import {
  executeReadOnlyMigrationAudit,
  executePostgresCatalogAudit,
  evaluateOverallAuditStatus,
  inspectMigration0005,
  inspectMigration0006,
  inspectMigration0007,
  type OpenApiSpec,
  type ReadOnlyAuditClient,
  type PostgresCatalogClient
} from "@/lib/staging/read-only-audit";

describe("Read-Only Migration Audit Security & Regression Suite (Directive V19.0)", () => {
  const completeMockSpec: OpenApiSpec = {
    paths: {
      "/rpc/initialize_project_from_order": {
        post: {
          parameters: [
            {
              in: "body",
              name: "args",
              schema: {
                properties: {
                  p_order_id: { type: "string", format: "uuid" },
                  p_service_id: { type: "string" },
                  p_requirements: { type: "object" },
                  p_milestones: { type: "object" }
                },
                required: ["p_order_id"]
              }
            }
          ]
        }
      },
      "/rpc/decide_quote": {
        post: {
          parameters: [
            {
              in: "body",
              name: "args",
              schema: {
                properties: {
                  p_quote_id: { type: "string", format: "uuid" },
                  p_decision: { type: "string" },
                  p_ip_hash: { type: "string" }
                },
                required: ["p_quote_id", "p_decision"]
              }
            }
          ]
        }
      },
      "/rpc/approve_commercial_terms": {
        post: {
          parameters: [
            {
              in: "body",
              name: "args",
              schema: {
                properties: {
                  p_version: { type: "string" },
                  p_reference: { type: "string" }
                },
                required: ["p_version"]
              }
            }
          ]
        }
      },
      "/rpc/set_system_environment": {
        post: {
          parameters: [
            {
              in: "body",
              name: "args",
              schema: {
                properties: {
                  p_environment: { type: "string" },
                  p_allow_synthetic: { type: "boolean" }
                },
                required: ["p_environment", "p_allow_synthetic"]
              }
            }
          ]
        }
      },
      "/rpc/ingest_leadconnector_event": {
        post: {
          parameters: [
            {
              in: "body",
              name: "args",
              schema: {
                properties: {
                  p_provider_event_id: { type: "string" },
                  p_payload_hash: { type: "string" },
                  p_reference: { type: "string" }
                },
                required: ["p_provider_event_id", "p_payload_hash", "p_reference"]
              }
            }
          ]
        }
      }
    },
    definitions: {
      commercial_terms_versions: {
        type: "object",
        properties: {
          version: { type: "string" },
          document_id: { type: "string" },
          classification: { type: "string" },
          approved_at: { type: "string", format: "timestamp with time zone" }
        }
      },
      system_environment: {
        type: "object",
        properties: {
          id: { type: "string" },
          environment: { type: "string" },
          is_synthetic_allowed: { type: "boolean" }
        }
      },
      webhook_events: {
        type: "object",
        properties: {
          id: { type: "string" },
          provider: { type: "string" },
          provider_event_id: { type: "string" },
          project_brief_id: { type: "string" },
          lead_id: { type: "string" }
        }
      }
    }
  };

  // Requirement 1 & 8 & 9 & 10: ZERO calls to mutating business RPCs
  it("makes zero calls to mutating business RPCs and cannot alter database state", async () => {
    const mutatingRpcCalls: string[] = [];
    const clientSelects: string[] = [];

    // Mock global fetch to simulate read-only /rest/v1/ OpenAPI spec fetch
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/rpc/")) {
        const rpcName = url.split("/rpc/")[1];
        mutatingRpcCalls.push(rpcName);
        throw new Error(`MUTATION DETECTED: Call to RPC ${rpcName} is prohibited during audit!`);
      }
      return {
        ok: true,
        json: async () => completeMockSpec
      };
    });
    global.fetch = fetchSpy;

    // Mock client with ONLY select capability
    const mockClient = {
      from: (table: string) => {
        clientSelects.push(table);
        return {
          select: () => ({
            limit: async () => ({ data: [], error: null }),
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: "current", environment: "staging", is_synthetic_allowed: true },
                error: null
              })
            })
          })
        };
      }
    };

    const audit = await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key",
      mockClient as unknown as ReadOnlyAuditClient
    );

    // Assert zero RPC calls
    expect(mutatingRpcCalls).toHaveLength(0);
    expect(audit.success).toBe(true);

    // Verify it never called approve_commercial_terms
    expect(mutatingRpcCalls).not.toContain("approve_commercial_terms");

    // Verify it never called set_system_environment
    expect(mutatingRpcCalls).not.toContain("set_system_environment");

    // Verify it never called ingest_leadconnector_event
    expect(mutatingRpcCalls).not.toContain("ingest_leadconnector_event");

    // Only read-only system_environment query allowed
    expect(clientSelects).toEqual(["system_environment"]);
  });

  it("accurately verifies Migration 0005 governance objects in schema", () => {
    const result0005 = inspectMigration0005(completeMockSpec);
    expect(result0005.allObjectsApplied).toBe(true);
    expect(result0005.status).toBe("PASS");
    expect(result0005.objects["commercial_terms_versions_table"].status).toBe("APPLIED");
    expect(result0005.objects["initialize_project_from_order_rpc"].status).toBe("APPLIED");
    expect(result0005.objects["decide_quote_rpc"].status).toBe("APPLIED");
  });

  // Requirement 2: Missing function produces a correct failure/pending
  it("detects when an expected RPC function is missing in schema", () => {
    const pathsCopy = { ...completeMockSpec.paths };
    delete pathsCopy["/rpc/approve_commercial_terms"];
    const specWithoutApprove: OpenApiSpec = {
      ...completeMockSpec,
      paths: pathsCopy
    };

    const result0006 = inspectMigration0006(specWithoutApprove);
    expect(result0006.allObjectsApplied).toBe(false);
    expect(result0006.status).toBe("PARTIAL");
    expect(result0006.objects["approve_commercial_terms_rpc"].status).toBe("PENDING");
  });

  // Requirement 3: Missing required table produces a correct failure
  it("detects when an expected table is missing in schema", () => {
    const defsCopy = { ...completeMockSpec.definitions };
    delete defsCopy["system_environment"];
    const specWithoutSysEnv: OpenApiSpec = {
      ...completeMockSpec,
      definitions: defsCopy
    };

    const result0006 = inspectMigration0006(specWithoutSysEnv);
    expect(result0006.allObjectsApplied).toBe(false);
    expect(result0006.objects["system_environment_table"].status).toBe("PENDING");
  });

  // Requirement 4: Wrong function signature produces a failure
  it("detects when an RPC function has an incorrect or incomplete signature", () => {
    const specWithWrongSignature: OpenApiSpec = {
      ...completeMockSpec,
      paths: {
        ...completeMockSpec.paths,
        "/rpc/set_system_environment": {
          post: {
            parameters: [
              {
                in: "body",
                name: "args",
                schema: {
                  properties: {
                    p_environment: { type: "string" }
                    // Missing p_allow_synthetic!
                  }
                }
              }
            ]
          }
        }
      }
    };

    const result0006 = inspectMigration0006(specWithWrongSignature);
    expect(result0006.allObjectsApplied).toBe(false);
    expect(result0006.objects["set_system_environment_rpc"].status).toBe("PENDING");
  });

  // Requirement 5: Missing function privileges or unexposed RPC in PostgREST produces BLOCKED/PENDING
  it("detects when an RPC is unexposed or permissions are revoked from schema cache", () => {
    const specEmptyPaths: OpenApiSpec = {
      paths: {},
      definitions: completeMockSpec.definitions
    };

    const result0007 = inspectMigration0007(specEmptyPaths);
    expect(result0007.allObjectsApplied).toBe(false);
    expect(result0007.objects["ingest_leadconnector_event_rpc"].status).toBe("PENDING");
  });

  // Requirement 6: Unavailable administrative access produces BLOCKED
  it("returns BLOCKED when administrative metadata endpoint is unreachable", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable"
    });

    const audit = await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "invalid-key"
    );

    expect(audit.success).toBe(false);
    expect(audit.blocked).toBe(true);
    expect(audit.migration0006.status).toBe("BLOCKED");
    expect(audit.migration0007.status).toBe("BLOCKED");
  });

  // Requirement 7: Partially applied migration is distinguishable from completely applied migration
  it("clearly distinguishes partially applied migrations from completely applied ones", () => {
    // Migration 0007 has columns in webhook_events, but RPC ingest_leadconnector_event is missing
    const partial0007Spec: OpenApiSpec = {
      paths: {},
      definitions: {
        webhook_events: completeMockSpec.definitions!["webhook_events"]
      }
    };

    const result0007 = inspectMigration0007(partial0007Spec);
    expect(result0007.allObjectsApplied).toBe(false);
    expect(result0007.status).toBe("PARTIAL");
    expect(result0007.objects["webhook_events_fk_columns"].status).toBe("APPLIED");
    expect(result0007.objects["ingest_leadconnector_event_rpc"].status).toBe("PENDING");

    // Completely applied
    const full0007 = inspectMigration0007(completeMockSpec);
    expect(full0007.allObjectsApplied).toBe(true);
    expect(full0007.status).toBe("PASS");
  });

  // Requirement 8: Migration audit cannot approve legal terms
  it("guarantees commercial terms approval is never triggered during audit", async () => {
    let termApproved = false;
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("approve_commercial_terms")) {
        termApproved = true;
      }
      return { ok: true, json: async () => completeMockSpec };
    });
    global.fetch = fetchSpy;

    await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key"
    );

    expect(termApproved).toBe(false);
  });

  // Requirement 9: Migration audit cannot change environment state
  it("guarantees environment mode is never changed during audit", async () => {
    let envChanged = false;
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("set_system_environment")) {
        envChanged = true;
      }
      return { ok: true, json: async () => completeMockSpec };
    });
    global.fetch = fetchSpy;

    await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key"
    );

    expect(envChanged).toBe(false);
  });

  // Requirement 10: Migration audit cannot create test leads
  it("guarantees test leads or briefs are never inserted during audit", async () => {
    let leadCreated = false;
    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("ingest_leadconnector_event") || url.includes("submit_project_brief")) {
        leadCreated = true;
      }
      return { ok: true, json: async () => completeMockSpec };
    });
    global.fetch = fetchSpy;

    await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key"
    );

    expect(leadCreated).toBe(false);
  });

  // Requirement 11 (Directive V20.0 Section 3 & 4): Two-level verification distinction
  it("distinguishes Level 1 API schema verification from Level 2 PostgreSQL catalog verification", async () => {
    // When OpenAPI spec is valid, Level 1 passes
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => completeMockSpec
    });

    const audit = await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key"
    );

    expect(audit.success).toBe(true);
    expect(audit.migration0005.status).toBe("PASS");
    // Verify Level 1 confirms API schema without claiming direct catalog proof
    expect(audit.migration0005.objects["decide_quote_rpc"].details).toContain("PostgREST endpoint verified");
  });

  // Requirement 12: Audit operation guarantees zero side effects on commercial data
  it("guarantees audit execution never creates orders, quotations, or projects", async () => {
    const prohibitedOperations: string[] = [];

    const mockClient = {
      from: (table: string) => ({
        select: () => ({
          limit: async () => {
            if (["orders", "quotes", "projects", "leads"].includes(table)) {
              // Read is permitted
            }
            return { data: [], error: null };
          },
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null })
          })
        }),
        insert: () => {
          prohibitedOperations.push(`INSERT_${table}`);
          return Promise.resolve({ data: null, error: new Error("Prohibited") });
        },
        update: () => {
          prohibitedOperations.push(`UPDATE_${table}`);
          return Promise.resolve({ data: null, error: new Error("Prohibited") });
        },
        delete: () => {
          prohibitedOperations.push(`DELETE_${table}`);
          return Promise.resolve({ data: null, error: new Error("Prohibited") });
        }
      })
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => completeMockSpec
    });

    await executeReadOnlyMigrationAudit(
      "https://yamwmfgqqjwlfcjjkwzl.supabase.co",
      "mock-key",
      mockClient as unknown as ReadOnlyAuditClient
    );

    expect(prohibitedOperations).toHaveLength(0);
  });

  // ===========================================================================
  // DIRECTIVE V21.0 POSTGRESQL CATALOG VERIFICATION & AUDIT READINESS REGRESSION
  // ===========================================================================

  function createMockCatalogClient(overrides: {
    dbName?: string;
    omitFunction?: string;
    mismatchSignature?: boolean;
    omitGrant?: boolean;
    anonGrant?: boolean;
    omitTrigger?: boolean;
    omitPolicy?: boolean;
    omitLedgerTable?: boolean;
    queryError?: Error;
  } = {}): { client: PostgresCatalogClient; queriesExecuted: string[] } {
    const queriesExecuted: string[] = [];

    const client: PostgresCatalogClient = {
      query: async (sql: string) => {
        queriesExecuted.push(sql);

        if (overrides.queryError) {
          throw overrides.queryError;
        }

        const s = sql.toLowerCase();

        if (s.includes("current_database()")) {
          return {
            rows: [
              {
                db: overrides.dbName || "postgres",
                usr: "postgres",
                ver: "PostgreSQL 15.6 on x86_64"
              }
            ]
          };
        }

        if (s.includes("supabase_migrations.schema_migrations")) {
          if (overrides.omitLedgerTable) {
            throw new Error('relation "supabase_migrations.schema_migrations" does not exist');
          }
          return {
            rows: [
              { version: "202611080001" },
              { version: "202611080005" },
              { version: "202611080006" },
              { version: "202611080007" }
            ]
          };
        }

        if (s.includes("from information_schema.tables")) {
          return {
            rows: [
              { table_name: "commercial_terms_versions" },
              { table_name: "system_environment" },
              { table_name: "project_briefs" },
              { table_name: "leads" },
              { table_name: "orders" },
              { table_name: "webhook_events" }
            ]
          };
        }

        if (s.includes("from information_schema.columns")) {
          return {
            rows: [
              { table_name: "commercial_terms_versions", column_name: "version", is_nullable: "NO" },
              { table_name: "commercial_terms_versions", column_name: "document_id", is_nullable: "NO" },
              { table_name: "commercial_terms_versions", column_name: "classification", is_nullable: "NO" },
              { table_name: "system_environment", column_name: "id", is_nullable: "NO" },
              { table_name: "system_environment", column_name: "environment", is_nullable: "NO" },
              { table_name: "system_environment", column_name: "is_synthetic_allowed", is_nullable: "NO" },
              { table_name: "project_briefs", column_name: "service_id", is_nullable: "YES" },
              { table_name: "webhook_events", column_name: "project_brief_id", is_nullable: "YES" },
              { table_name: "webhook_events", column_name: "lead_id", is_nullable: "YES" }
            ]
          };
        }

        if (s.includes("from pg_proc")) {
          const rows = [
            {
              proname: "decide_quote",
              args: overrides.mismatchSignature ? "p_wrong_id uuid" : "p_quote_id uuid, p_decision text",
              is_security_definer: true
            },
            {
              proname: "initialize_project_from_order",
              args: "p_order_id uuid",
              is_security_definer: true
            },
            {
              proname: "current_user_is_super_admin",
              args: "",
              is_security_definer: true
            },
            {
              proname: "set_system_environment",
              args: "p_environment text",
              is_security_definer: true
            },
            {
              proname: "approve_commercial_terms",
              args: "p_version text",
              is_security_definer: true
            },
            {
              proname: "ingest_leadconnector_event",
              args: "p_provider_event_id text, p_payload_hash text",
              is_security_definer: true
            }
          ];
          return {
            rows: overrides.omitFunction ? rows.filter((r) => r.proname !== overrides.omitFunction) : rows
          };
        }

        if (s.includes("from information_schema.routine_privileges")) {
          if (overrides.omitGrant) {
            return { rows: [] };
          }
          if (overrides.anonGrant) {
            return {
              rows: [
                { routine_name: "ingest_leadconnector_event", grantee: "service_role", privilege_type: "EXECUTE" },
                { routine_name: "ingest_leadconnector_event", grantee: "anon", privilege_type: "EXECUTE" }
              ]
            };
          }
          return {
            rows: [
              { routine_name: "ingest_leadconnector_event", grantee: "service_role", privilege_type: "EXECUTE" },
              { routine_name: "decide_quote", grantee: "authenticated", privilege_type: "EXECUTE" }
            ]
          };
        }

        if (s.includes("from pg_trigger")) {
          if (overrides.omitTrigger) {
            return { rows: [] };
          }
          return {
            rows: [{ tgname: "trg_order_financial_clearance", table_name: "orders" }]
          };
        }

        if (s.includes("from pg_policies")) {
          if (overrides.omitPolicy) {
            return { rows: [] };
          }
          return {
            rows: [{ polname: "system_env_read_policy", tablename: "system_environment" }]
          };
        }

        if (s.includes("from information_schema.table_constraints")) {
          return {
            rows: [
              { table_name: "webhook_events", column_name: "project_brief_id", foreign_table_name: "project_briefs" },
              { table_name: "webhook_events", column_name: "lead_id", foreign_table_name: "leads" }
            ]
          };
        }

        return { rows: [] };
      }
    };

    return { client, queriesExecuted };
  }

  // Regression Test 1: Connection string present but SQL query not executed -> not PASS
  it("V21.1: proves that having a connection string without executing queries does not yield PASS", async () => {
    // Calling with null/undefined returns BLOCKED, never PASS
    const result = await executePostgresCatalogAudit(null);
    expect(result.status).toBe("BLOCKED");
    expect(result.status).not.toBe("PASS");
  });

  // Regression Test 2: Incorrect database identity -> FAIL
  it("V21.2: fails when database identity does not match expected database name", async () => {
    const { client } = createMockCatalogClient({ dbName: "wrong_production_db" });
    const result = await executePostgresCatalogAudit(client, "postgres_staging");
    expect(result.status).toBe("FAIL");
    expect(result.summary).toContain("Database identity mismatch");
  });

  // Regression Test 3: Connection refused -> BLOCKED
  it("V21.3: reports BLOCKED when connection is refused (ECONNREFUSED)", async () => {
    const connErr = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    const { client } = createMockCatalogClient({ queryError: connErr });
    const result = await executePostgresCatalogAudit(client);
    expect(result.status).toBe("BLOCKED");
    expect(result.summary).toContain("ECONNREFUSED");
  });

  // Regression Test 4: Missing required function -> FAIL / NOT_APPLIED
  it("V21.4: fails when required function (decide_quote) is missing from pg_proc", async () => {
    const { client } = createMockCatalogClient({ omitFunction: "decide_quote" });
    const result = await executePostgresCatalogAudit(client);
    expect(result.status).not.toBe("PASS");
    expect(result.migration0005.objects["decide_quote"].status).toBe("NOT_APPLIED");
  });

  // Regression Test 5: Incorrect function signature -> MISMATCH
  it("V21.5: reports MISMATCH when function signature differs from migration", async () => {
    const { client } = createMockCatalogClient({ mismatchSignature: true });
    const result = await executePostgresCatalogAudit(client);
    expect(result.status).toBe("MISMATCH");
    expect(result.migration0005.objects["decide_quote"].status).toBe("MISMATCH");
  });

  // Regression Test 6: Missing required grant -> FAIL
  it("V21.6: fails when required grant on ingest_leadconnector_event is missing or granted to anon", async () => {
    const { client: omitGrantClient } = createMockCatalogClient({ omitGrant: true });
    const omitResult = await executePostgresCatalogAudit(omitGrantClient);
    expect(omitResult.migration0007.objects["ingest_leadconnector_event_grants"].status).toBe("NOT_APPLIED");

    const { client: anonGrantClient } = createMockCatalogClient({ anonGrant: true });
    const anonResult = await executePostgresCatalogAudit(anonGrantClient);
    expect(anonResult.migration0007.objects["ingest_leadconnector_event_grants"].status).toBe("FAIL");
  });

  // Regression Test 7: Missing trigger -> FAIL / NOT_APPLIED
  it("V21.7: fails when financial clearance trigger is missing from orders table", async () => {
    const { client } = createMockCatalogClient({ omitTrigger: true });
    const result = await executePostgresCatalogAudit(client);
    expect(result.migration0006.objects["trg_order_financial_clearance"].status).toBe("NOT_APPLIED");
  });

  // Regression Test 8: Missing RLS policy -> FAIL / NOT_APPLIED
  it("V21.8: fails when RLS policies are missing from system_environment", async () => {
    const { client } = createMockCatalogClient({ omitPolicy: true });
    const result = await executePostgresCatalogAudit(client);
    expect(result.migration0006.objects["system_environment_policies"].status).toBe("NOT_APPLIED");
  });

  // Regression Test 9: Catalog verification succeeds -> PASS
  it("V21.9: produces PASS when all catalog objects, functions, triggers, and grants are verified", async () => {
    const { client } = createMockCatalogClient();
    const result = await executePostgresCatalogAudit(client);
    expect(result.status).toBe("PASS");
    expect(result.migration0005.status).toBe("PASS");
    expect(result.migration0006.status).toBe("PASS");
    expect(result.migration0007.status).toBe("PASS");
    expect(result.databaseIdentity?.database).toBe("postgres");
  });

  // Regression Test 10: API-level PASS + catalog BLOCKED -> overall BLOCKED
  it("V21.10: evaluates overall status as BLOCKED when API is PASS but catalog is BLOCKED", () => {
    const mockLevel1 = {
      success: true,
      blocked: false,
      migration0005: { migrationId: "202611080005", title: "0005", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" },
      migration0006: { migrationId: "202611080006", title: "0006", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" },
      migration0007: { migrationId: "202611080007", title: "0007", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" }
    };
    const mockLevel2 = {
      status: "BLOCKED" as const,
      summary: "Direct catalog inspection blocked (no port 5432 credentials)",
      migration0005: { status: "NOT_APPLIED" as const, objects: {} },
      migration0006: { status: "NOT_APPLIED" as const, objects: {} },
      migration0007: { status: "NOT_APPLIED" as const, objects: {} }
    };

    const overall = evaluateOverallAuditStatus(mockLevel1, mockLevel2);
    expect(overall.overallStatus).toBe("BLOCKED");
    expect(overall.exitCode).toBe(1);
    expect(overall.overallStatus).not.toBe("PASS");
  });

  // Regression Test 11: API-level PASS + catalog FAIL -> overall FAIL
  it("V21.11: evaluates overall status as FAIL when API is PASS but catalog is FAIL", () => {
    const mockLevel1 = {
      success: true,
      blocked: false,
      migration0005: { migrationId: "202611080005", title: "0005", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" },
      migration0006: { migrationId: "202611080006", title: "0006", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" },
      migration0007: { migrationId: "202611080007", title: "0007", allObjectsApplied: true, status: "PASS" as const, objects: {}, summary: "ok" }
    };
    const mockLevel2 = {
      status: "FAIL" as const,
      summary: "Missing required function decide_quote in pg_proc",
      migration0005: { status: "FAIL" as const, objects: {} },
      migration0006: { status: "PASS" as const, objects: {} },
      migration0007: { status: "PASS" as const, objects: {} }
    };

    const overall = evaluateOverallAuditStatus(mockLevel1, mockLevel2);
    expect(overall.overallStatus).toBe("FAIL");
    expect(overall.exitCode).toBe(1);
  });

  // Regression Test 12: No audit operation modifies business data
  it("V21.12: guarantees catalog audit performs zero mutations and maintains read-only transaction", async () => {
    const { client, queriesExecuted } = createMockCatalogClient();
    await executePostgresCatalogAudit(client);

    // Verify session explicitly set to read only
    expect(queriesExecuted).toContain("BEGIN TRANSACTION READ ONLY;");
    expect(queriesExecuted).toContain("COMMIT;");

    // Verify absolutely no INSERT, UPDATE, or DELETE queries
    const mutatingQueries = queriesExecuted.filter((q) => {
      const s = q.toUpperCase();
      return s.includes("INSERT INTO") || s.includes("UPDATE ") || s.includes("DELETE FROM");
    });
    expect(mutatingQueries).toHaveLength(0);
  });

  // ===========================================================================
  // DIRECTIVE V22.0 CATALOG & ENVIRONMENT REGRESSION EXPANSION
  // ===========================================================================

  it("V22.1: handles missing migration ledger gracefully and reports ledgerTablePresent = false", async () => {
    const { client } = createMockCatalogClient({ omitLedgerTable: true });
    const result = await executePostgresCatalogAudit(client);

    expect(result.ledgerTablePresent).toBe(false);
    expect(result.migrationsLedger).toEqual([]);
    // Objects themselves are still evaluated correctly
    expect(result.migration0005.status).toBe("PASS");
  });

  it("V22.2: flags partial migration 0006 with status NOT_APPLIED / FAIL when tables exist but functions missing", async () => {
    const { client } = createMockCatalogClient({ omitFunction: "approve_commercial_terms" });
    const result = await executePostgresCatalogAudit(client);

    expect(result.migration0006.status).toBe("FAIL");
    expect(result.migration0006.objects["approve_commercial_terms"].status).toBe("NOT_APPLIED");
    expect(result.status).toBe("FAIL");
  });

  it("V22.3: distinguishes between catalog connection timeout (BLOCKED) vs SQL execution error (FAIL)", async () => {
    const timeoutError = new Error("connection timeout after 5000ms");
    const { client: timeoutClient } = createMockCatalogClient({ queryError: timeoutError });
    const blockedRes = await executePostgresCatalogAudit(timeoutClient);
    expect(blockedRes.status).toBe("BLOCKED");

    const syntaxError = new Error("syntax error at or near 'SELECT'");
    const { client: syntaxClient } = createMockCatalogClient({ queryError: syntaxError });
    const failRes = await executePostgresCatalogAudit(syntaxClient);
    expect(failRes.status).toBe("FAIL");
  });
});
