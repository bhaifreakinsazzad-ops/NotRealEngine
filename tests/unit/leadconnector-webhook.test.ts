import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/webhooks/leadconnector/route";

// Mock Supabase service role client: the route now ingests through a single atomic RPC
// (public.ingest_leadconnector_event) rather than separate table inserts.
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceRoleClient: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args)
  })
}));

const VALID_SECRET = "correct-leadconnector-secret-abc123";
const VALID_PAYLOAD = JSON.stringify({
  type: "Appointment",
  first_name: "Sarah",
  last_name: "Connor",
  email: "sarah@cyberdyne.test",
  phone: "+1 555-0199",
  company_name: "Cyberdyne Systems",
  appointment: {
    id: "appt-999",
    startTime: "2026-11-15T14:00:00Z",
    title: "Architecture Briefing"
  },
  utm_source: "google_ads",
  utm_campaign: "enterprise_launch"
});

// The route keys its best-effort rate limiter by client IP in module-level state that
// persists across tests in this file. Give every call a fresh IP by default so unrelated
// tests never share a bucket; only the dedicated rate-limit test overrides this explicitly.
let ipCounter = 0;

function makeRequest(opts: {
  body?: string;
  headers?: Record<string, string>;
  queryString?: string;
}) {
  const url = `http://localhost:3000/api/webhooks/leadconnector${opts.queryString ?? ""}`;
  const defaultIp = `198.51.100.${(ipCounter += 1) % 255}`;
  return new NextRequest(url, {
    method: "POST",
    body: opts.body ?? VALID_PAYLOAD,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": defaultIp,
      ...(opts.headers ?? {})
    }
  });
}

function noPrivilegedWritesOccurred() {
  expect(mockRpc).not.toHaveBeenCalled();
}

describe("LeadConnector Inbound Webhook Adapter (/api/webhooks/leadconnector)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LEADCONNECTOR_WEBHOOK_SECRET;
    delete process.env.ENGINE_OS_ENV;
  });

  it("GET returns webhook status and integration configuration without a query-param auth option", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("active");
    expect(data.adapter).toContain("LeadConnector");
    expect(data.supportedEvents).toContain("Appointment");
    expect(data.configurationInstructions.queryParam).toBeUndefined();
  });

  describe("fail-closed authentication", () => {
    it("rejects every request when LEADCONNECTOR_WEBHOOK_SECRET is not configured, even outside production", async () => {
      // No ENGINE_OS_ENV set (i.e. not "production") — must still be rejected.
      const req = makeRequest({ headers: { "x-leadconnector-key": "anything" } });
      const res = await POST(req);
      expect(res.status).toBe(401);
      noPrivilegedWritesOccurred();
    });

    it("rejects every request when LEADCONNECTOR_WEBHOOK_SECRET is not configured, with no credential supplied at all", async () => {
      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(401);
      noPrivilegedWritesOccurred();
    });

    it("rejects a request with a missing credential when a secret is configured", async () => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
      const req = makeRequest({});
      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("unauthorized");
      noPrivilegedWritesOccurred();
    });

    it("rejects a request with an incorrect credential", async () => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
      const req = makeRequest({ headers: { "x-leadconnector-key": "wrong-secret" } });
      const res = await POST(req);
      expect(res.status).toBe(401);
      noPrivilegedWritesOccurred();
    });

    it("rejects a request with an arbitrary nonempty credential", async () => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
      const req = makeRequest({
        headers: { "x-leadconnector-key": "x".repeat(200) }
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
      noPrivilegedWritesOccurred();
    });

    it("rejects a credential supplied only via the query string (removed auth path)", async () => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
      const req = makeRequest({ queryString: `?secret=${VALID_SECRET}` });
      const res = await POST(req);
      expect(res.status).toBe(401);
      noPrivilegedWritesOccurred();
    });

    it("accepts a correct credential delivered via the Authorization: Bearer header", async () => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-uuid-2", leadId: "lead-uuid-2", reference: "GHL-BOOK-5678", serviceId: null },
        error: null
      });

      const req = makeRequest({ headers: { authorization: `Bearer ${VALID_SECRET}` } });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });

  describe("payload handling", () => {
    beforeEach(() => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
    });

    it("rejects malformed JSON", async () => {
      const req = makeRequest({
        body: "{not valid json",
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("invalid_json");
      noPrivilegedWritesOccurred();
    });

    it("rejects an oversized request body", async () => {
      const oversizedPayload = JSON.stringify({
        email: "big@example.com",
        notes: "x".repeat(70 * 1024)
      });
      const req = makeRequest({
        body: oversizedPayload,
        headers: {
          "x-leadconnector-key": VALID_SECRET,
          "content-length": String(Buffer.byteLength(oversizedPayload))
        }
      });
      const res = await POST(req);
      expect(res.status).toBe(413);
      noPrivilegedWritesOccurred();
    });

    it("rejects payload missing both email and phone", async () => {
      const req = makeRequest({
        body: JSON.stringify({ name: "No Contact Person" }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      const res = await POST(req);
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.error).toContain("missing_contact_info");
    });

    it("rejects a non-object JSON payload", async () => {
      const req = makeRequest({
        body: JSON.stringify(["not", "an", "object"]),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      noPrivilegedWritesOccurred();
    });
  });

  describe("authenticated business logic", () => {
    beforeEach(() => {
      process.env.LEADCONNECTOR_WEBHOOK_SECRET = VALID_SECRET;
    });

    it("successfully ingests an authenticated appointment booking via the atomic RPC", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-uuid-1", leadId: "lead-uuid-1", reference: "GHL-BOOK-1234", serviceId: null },
        error: null
      });

      const req = makeRequest({ headers: { "x-leadconnector-key": VALID_SECRET } });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.source).toBe("leadconnector_booking");
      expect(data.leadId).toBe("lead-uuid-1");
      expect(data.reference).toBe("GHL-BOOK-1234");

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [fn, args] = mockRpc.mock.calls[0];
      expect(fn).toBe("ingest_leadconnector_event");
      // Event identity is keyed on the appointment id, not email, and is never defaulted
      // to a fabricated service classification.
      expect(args.p_provider_event_id).toContain("appt-999");
      expect(args.p_service_id).toBeNull();
    });

    it("does not guess a canonical service id when the provider sends none", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-uuid-3", leadId: "lead-uuid-3", reference: "GHL-FORM-0001", serviceId: null },
        error: null
      });

      const req = makeRequest({
        body: JSON.stringify({ type: "FormSubmission", name: "Jane Doe", email: "jane@example.com", form: { id: "form-42" } }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const [, args] = mockRpc.mock.calls[0];
      expect(args.p_service_id).toBeNull();
    });

    it("safely handles a replayed event via RPC-reported duplicate, without a second privileged write", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: true, projectBriefId: "existing-brief-id", leadId: "existing-lead-id", reference: "GHL-BOOK-PREV" },
        error: null
      });

      const req = makeRequest({
        body: JSON.stringify({
          type: "FormSubmission",
          name: "Repeated Lead",
          email: "repeated@example.com",
          phone: "+1 555-1234",
          form: { id: "form-replayed" }
        }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("deduplicated");
      expect(data.briefId).toBe("existing-brief-id");
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });

    it("keys idempotency on the event identity, not just the contact email, so two distinct appointments from the same person both ingest", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-a", leadId: "lead-a", reference: "GHL-BOOK-0001", serviceId: null },
        error: null
      });
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-b", leadId: "lead-b", reference: "GHL-BOOK-0002", serviceId: null },
        error: null
      });

      const sameContactDifferentEvent = (appointmentId: string) =>
        makeRequest({
          body: JSON.stringify({
            type: "Appointment",
            email: "repeated@example.com",
            appointment: { id: appointmentId }
          }),
          headers: { "x-leadconnector-key": VALID_SECRET }
        });

      const res1 = await POST(sameContactDifferentEvent("appt-A"));
      const res2 = await POST(sameContactDifferentEvent("appt-B"));
      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockRpc.mock.calls[0][1].p_provider_event_id).not.toBe(mockRpc.mock.calls[1][1].p_provider_event_id);
    });

    it("generates distinct event IDs when two different contacts submit the exact same form template", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-alice", leadId: "lead-alice", reference: "GHL-FORM-ALICE", serviceId: null },
        error: null
      });
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-bob", leadId: "lead-bob", reference: "GHL-FORM-BOB", serviceId: null },
        error: null
      });

      const res1 = await POST(
        makeRequest({
          body: JSON.stringify({
            type: "FormSubmission",
            name: "Alice Smith",
            email: "alice@example.com",
            form: { id: "template-shared-form-uuid" }
          }),
          headers: { "x-leadconnector-key": VALID_SECRET }
        })
      );

      const res2 = await POST(
        makeRequest({
          body: JSON.stringify({
            type: "FormSubmission",
            name: "Bob Jones",
            email: "bob@example.com",
            form: { id: "template-shared-form-uuid" }
          }),
          headers: { "x-leadconnector-key": VALID_SECRET }
        })
      );

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(mockRpc).toHaveBeenCalledTimes(2);

      const eventIdAlice = mockRpc.mock.calls[0][1].p_provider_event_id;
      const eventIdBob = mockRpc.mock.calls[1][1].p_provider_event_id;
      expect(eventIdAlice).not.toBe(eventIdBob);
      expect(eventIdAlice).toContain("alice@example.com");
      expect(eventIdBob).toContain("bob@example.com");
    });

    it("computes identical semantic hash regardless of key order, whitespace, or transport retry metadata", async () => {
      let firstHash = "";
      let secondHash = "";

      mockRpc.mockImplementation((name, args) => {
        if (!firstHash) firstHash = args.p_payload_hash;
        else secondHash = args.p_payload_hash;
        return Promise.resolve({
          data: { duplicate: false, projectBriefId: "b1", leadId: "l1", reference: "REF", serviceId: null },
          error: null
        });
      });

      // Request 1: standard ordering
      const req1 = makeRequest({
        body: JSON.stringify({
          type: "FormSubmission",
          submissionId: "semantic-sub-1",
          name: "Semantic User",
          email: "user@semantic.local",
          phone: "+8801700000001",
          notes: "Need web app",
          customData: { alpha: "one", beta: "two" }
        }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      await POST(req1);

      // Request 2: reverse key order, extra spaces in JSON, and transient retry transport metadata
      const payload2WithReorderedKeys = `{
        "customData": { "beta": "two", "alpha": "one" },
        "attempt": 2,
        "_delivery_attempt": "retry-1",
        "notes": "Need web app",
        "phone": "+8801700000001",
        "email": "user@semantic.local",
        "name": "Semantic User",
        "submissionId": "semantic-sub-1",
        "type": "FormSubmission"
      }`;

      const req2 = makeRequest({
        body: payload2WithReorderedKeys,
        headers: { "x-leadconnector-key": VALID_SECRET }
      });
      await POST(req2);

      expect(firstHash).toBeTruthy();
      expect(secondHash).toBeTruthy();
      expect(firstHash).toBe(secondHash);
    });

    it("returns HTTP 409 Conflict when a conflicting payload arrives with an identical event ID", async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          duplicate: false,
          conflict: true,
          error: "conflicting_payload_for_event_id",
          projectBriefId: "orig-brief-id",
          leadId: "orig-lead-id",
          reference: "GHL-FORM-ORIG"
        },
        error: null
      });

      const req = makeRequest({
        body: JSON.stringify({
          type: "FormSubmission",
          submissionId: "fixed-sub-id",
          name: "Attacker Trying Payload Overwrite",
          email: "victim@example.com",
          notes: "Modified payload"
        }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.status).toBe("conflict");
      expect(data.error).toBe("conflicting_payload_for_event_id");
      expect(data.briefId).toBe("orig-brief-id");
    });

    it("enforces data minimization by stripping sensitive credential keys and extraneous system data", async () => {
      mockRpc.mockResolvedValueOnce({
        data: { duplicate: false, projectBriefId: "brief-sanitized", leadId: "lead-sanitized", reference: "GHL-FORM-SAN", serviceId: null },
        error: null
      });

      const req = makeRequest({
        body: JSON.stringify({
          type: "FormSubmission",
          submissionId: "sub-clean-99",
          name: "Security Conscious",
          email: "security@company.com",
          form: {
            id: "form-contact",
            fields: {
              company_need: "Custom Web Application",
              password: "secret_should_be_stripped",
              user_session_token: "jwt_bearer_token_should_be_stripped"
            }
          },
          customData: {
            budget: "$15,000",
            auth_cookie: "session_id_should_be_stripped"
          }
        }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const [, args] = mockRpc.mock.calls[0];
      const storedPayload = args.p_payload;

      expect(storedPayload.form.fields.company_need).toBe("Custom Web Application");
      expect(storedPayload.form.fields.password).toBeUndefined();
      expect(storedPayload.form.fields.user_session_token).toBeUndefined();
      expect(storedPayload.customData.budget).toBe("$15,000");
      expect(storedPayload.customData.auth_cookie).toBeUndefined();
    });

    it("rejects a rate-limited burst of authenticated requests from the same client", async () => {
      mockRpc.mockResolvedValue({
        data: { duplicate: false, projectBriefId: "b", leadId: "l", reference: "GHL-X", serviceId: null },
        error: null
      });

      let lastStatus = 200;
      for (let i = 0; i < 35; i++) {
        const req = makeRequest({
          headers: {
            "x-leadconnector-key": VALID_SECRET,
            "x-forwarded-for": "203.0.113.42"
          }
        });
        const res = await POST(req);
        lastStatus = res.status;
      }
      expect(lastStatus).toBe(429);
    });
  });
});
