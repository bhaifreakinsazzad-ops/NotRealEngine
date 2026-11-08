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

describe("LeadConnector Inbound Webhook Adapter (/api/webhooks/leadconnector)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.LEADCONNECTOR_WEBHOOK_SECRET;
  });

  it("GET returns webhook status and integration configuration", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("active");
    expect(data.adapter).toContain("LeadConnector");
    expect(data.supportedEvents).toContain("Appointment");
  });

  it("POST rejects unauthorized request when secret is configured and missing", async () => {
    process.env.LEADCONNECTOR_WEBHOOK_SECRET = "secret-token-12345";
    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      headers: { "Content-Type": "application/json" }
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toContain("unauthorized");
  });

  it("POST rejects payload missing both email and phone", async () => {
    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector", {
      method: "POST",
      body: JSON.stringify({ name: "No Contact Person" }),
      headers: { "Content-Type": "application/json" }
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.error).toContain("missing_contact_info");
  });

  it("POST successfully normalizes appointment booking into PostgreSQL brief and lead", async () => {
    mockSelectBrief.mockResolvedValueOnce({ data: null, error: null });
    mockInsertBrief.mockResolvedValueOnce({ data: { id: "brief-uuid-1", reference: "GHL-BOOK-1234" }, error: null });
    mockInsertLead.mockResolvedValueOnce({ data: { id: "lead-uuid-1", status: "new" }, error: null });
    mockInsertAudit.mockResolvedValueOnce({ error: null });

    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector", {
      method: "POST",
      body: JSON.stringify({
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
      }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.source).toBe("leadconnector_booking");
    expect(data.leadId).toBe("lead-uuid-1");
    expect(data.reference).toBe("GHL-BOOK-1234");
    expect(mockInsertAudit).toHaveBeenCalled();
  });

  it("POST deduplicates subsequent enquiries with identical email within 1 hour", async () => {
    mockSelectBrief.mockResolvedValueOnce({
      data: { id: "existing-brief-id", reference: "GHL-BOOK-PREV" },
      error: null
    });

    const req = new NextRequest("http://localhost:3000/api/webhooks/leadconnector", {
      method: "POST",
      body: JSON.stringify({
        type: "FormSubmission",
        name: "Repeated Lead",
        email: "repeated@example.com",
        phone: "+1 555-1234"
      }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("deduplicated");
    expect(data.briefId).toBe("existing-brief-id");
    expect(mockInsertLead).not.toHaveBeenCalled();
  });
});
