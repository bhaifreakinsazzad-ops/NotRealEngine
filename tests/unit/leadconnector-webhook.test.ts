import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/webhooks/leadconnector/route";

// Mock Supabase service role client
const mockInsertBrief = vi.fn();
const mockInsertLead = vi.fn();
const mockInsertAudit = vi.fn();
const mockSelectBrief = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceRoleClient: () => ({
    from: (table: string) => {
      if (table === "project_briefs") {
        return {
          insert: () => ({
            select: () => ({
              single: mockInsertBrief
            })
          }),
          select: () => ({
            eq: () => ({
              gte: () => ({
                limit: () => ({
                  maybeSingle: mockSelectBrief
                })
              })
            })
          })
        };
      }
      if (table === "leads") {
        return {
          insert: () => ({
            select: () => ({
              single: mockInsertLead
            })
          })
        };
      }
      if (table === "audit_logs") {
        return {
          insert: mockInsertAudit
        };
      }
      return {};
    }
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
  expect(mockSelectBrief).not.toHaveBeenCalled();
  expect(mockInsertBrief).not.toHaveBeenCalled();
  expect(mockInsertLead).not.toHaveBeenCalled();
  expect(mockInsertAudit).not.toHaveBeenCalled();
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
      mockSelectBrief.mockResolvedValueOnce({ data: null, error: null });
      mockInsertBrief.mockResolvedValueOnce({ data: { id: "brief-uuid-2", reference: "GHL-BOOK-5678" }, error: null });
      mockInsertLead.mockResolvedValueOnce({ data: { id: "lead-uuid-2", status: "new" }, error: null });
      mockInsertAudit.mockResolvedValueOnce({ error: null });

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

    it("successfully normalizes an authenticated appointment booking into a project brief and lead", async () => {
      mockSelectBrief.mockResolvedValueOnce({ data: null, error: null });
      mockInsertBrief.mockResolvedValueOnce({ data: { id: "brief-uuid-1", reference: "GHL-BOOK-1234" }, error: null });
      mockInsertLead.mockResolvedValueOnce({ data: { id: "lead-uuid-1", status: "new" }, error: null });
      mockInsertAudit.mockResolvedValueOnce({ error: null });

      const req = makeRequest({ headers: { "x-leadconnector-key": VALID_SECRET } });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.source).toBe("leadconnector_booking");
      expect(data.leadId).toBe("lead-uuid-1");
      expect(data.reference).toBe("GHL-BOOK-1234");
      expect(mockInsertAudit).toHaveBeenCalled();
    });

    it("safely deduplicates a replayed event with identical email within 1 hour, without creating a duplicate lead", async () => {
      mockSelectBrief.mockResolvedValueOnce({
        data: { id: "existing-brief-id", reference: "GHL-BOOK-PREV" },
        error: null
      });

      const req = makeRequest({
        body: JSON.stringify({
          type: "FormSubmission",
          name: "Repeated Lead",
          email: "repeated@example.com",
          phone: "+1 555-1234"
        }),
        headers: { "x-leadconnector-key": VALID_SECRET }
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("deduplicated");
      expect(data.briefId).toBe("existing-brief-id");
      expect(mockInsertLead).not.toHaveBeenCalled();
    });

    it("rejects a rate-limited burst of authenticated requests from the same client", async () => {
      mockSelectBrief.mockResolvedValue({ data: { id: "b", reference: "GHL-X" }, error: null });

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
