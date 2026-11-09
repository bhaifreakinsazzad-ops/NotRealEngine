import { describe, expect, it, vi } from "vitest";
import {
  executeReadOnlyMigrationAudit,
  inspectMigration0005,
  inspectMigration0006,
  inspectMigration0007,
  type OpenApiSpec,
  type ReadOnlyAuditClient
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
});
