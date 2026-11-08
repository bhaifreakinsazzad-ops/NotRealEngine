import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { projectBriefSchema } from "@/lib/validation/project-brief";
import { extractClientIp, POST } from "@/app/api/project-briefs/route";

const mockRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: (...args: unknown[]) => mockRpc(...args)
  }))
}));

const valid = {
  goal: "Improve operations",
  problem: "We need a secure system to replace manual order tracking.",
  serviceId: "SVC-11-BMS",
  addonIds: [],
  designDirection: "Clear and mobile friendly",
  budgetBand: "not-sure",
  targetDate: null,
  name: "Test User",
  email: "test@example.com",
  phone: "+8801700000000",
  organization: "Example",
  consent: true,
  attribution: { source: null, campaign: null }
};

describe("project brief validation", () => {
  it("accepts a complete canonical brief", () => expect(projectBriefSchema.safeParse(valid).success).toBe(true));

  it("rejects an unknown service and missing consent", () => {
    expect(projectBriefSchema.safeParse({ ...valid, serviceId: "SVC-UNKNOWN" }).success).toBe(false);
    expect(projectBriefSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("enforces feature dependencies", () => {
    const result = projectBriefSchema.safeParse({ ...valid, serviceId: "SVC-02-MIN", addonIds: ["mini-blog"] });
    expect(result.success).toBe(false);
  });

  it("rejects conflicting features", () => {
    const result = projectBriefSchema.safeParse({
      ...valid,
      serviceId: "SVC-02-MIN",
      addonIds: ["mini-content", "mini-static"]
    });
    expect(result.success).toBe(false);
  });
});

describe("extractClientIp & POST /api/project-briefs boundary", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://yamwmfgqqjwlfcjjkwzl.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("prioritizes trusted platform headers over spoofable x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4, 203.0.113.50",
      "x-vercel-forwarded-for": "198.51.100.77"
    });
    expect(extractClientIp(headers)).toBe("198.51.100.77");

    // When only x-forwarded-for is present, uses the last proxy hop rather than client-prepended first hop
    const spoofedHeaders = new Headers({
      "x-forwarded-for": "10.0.0.1, 203.0.113.99"
    });
    expect(extractClientIp(spoofedHeaders)).toBe("203.0.113.99");
  });

  it("returns 201 with reference on valid project brief submission", async () => {
    mockRpc.mockResolvedValueOnce({ data: "brief-uuid-123", error: null });

    const req = new NextRequest("http://localhost:3000/api/project-briefs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "198.51.100.42",
        "user-agent": "Vitest/1.0"
      },
      body: JSON.stringify(valid)
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.reference).toMatch(/^NRE-\d{4}-[A-F0-9]{8}$/);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc.mock.calls[0]?.[0]).toBe("submit_project_brief");
  });

  it("returns 422 on invalid payload or missing consent", async () => {
    const req = new NextRequest("http://localhost:3000/api/project-briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...valid, consent: false })
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 429 when database rate limit bucket is exceeded", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "rate_limit_exceeded" }
    });

    const req = new NextRequest("http://localhost:3000/api/project-briefs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(valid)
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many project requests/i);
  });
});
