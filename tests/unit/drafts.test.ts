import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getDraft, POST as createDraft } from "@/app/api/drafts/route";
import { POST as claimDraft } from "@/app/api/drafts/claim/route";

const mockServiceFrom = vi.fn();
const mockServerFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  getServiceRoleClient: () => ({
    from: (...args: unknown[]) => mockServiceFrom(...args)
  })
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: async () => ({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args)
    },
    from: (...args: unknown[]) => mockServerFrom(...args)
  })
}));

describe("Configuration Drafts API (/api/drafts & /api/drafts/claim)", () => {
  const validToken = "a".repeat(64);
  const userId = "11111111-1111-4111-8111-111111111111";
  const orgId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  it("fails closed with 503 on POST /api/drafts when service role key is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const req = new NextRequest("http://localhost:3000/api/drafts", {
      method: "POST",
      body: JSON.stringify({ serviceId: "SVC-01-SPW" }),
      headers: { "content-type": "application/json" }
    });
    const res = await createDraft(req);
    expect(res.status).toBe(503);
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and array payloads on POST /api/drafts with 400", async () => {
    const badJsonReq = new NextRequest("http://localhost:3000/api/drafts", {
      method: "POST",
      body: "{bad",
      headers: { "content-type": "application/json" }
    });
    expect((await createDraft(badJsonReq)).status).toBe(400);

    const arrayReq = new NextRequest("http://localhost:3000/api/drafts", {
      method: "POST",
      body: JSON.stringify(["invalid"]),
      headers: { "content-type": "application/json" }
    });
    expect((await createDraft(arrayReq)).status).toBe(400);
  });

  it("rejects oversized draft payloads with 413", async () => {
    const req = new NextRequest("http://localhost:3000/api/drafts", {
      method: "POST",
      body: JSON.stringify({ notes: "x".repeat(70_000) }),
      headers: { "content-type": "application/json" }
    });
    const res = await createDraft(req);
    expect(res.status).toBe(413);
  });

  it("creates and retrieves a configuration draft using the service client", async () => {
    mockServiceFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "draft-123" }, error: null })
        })
      })
    });

    const createReq = new NextRequest("http://localhost:3000/api/drafts", {
      method: "POST",
      body: JSON.stringify({ serviceId: "SVC-01-SPW", goal: "Launch product" }),
      headers: { "content-type": "application/json" }
    });
    const createRes = await createDraft(createReq);
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(created.draftId).toBe("draft-123");
    expect(typeof created.draftToken).toBe("string");
    expect(created.draftToken.length).toBeGreaterThanOrEqual(32);

    mockServiceFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "draft-123",
                payload: { serviceId: "SVC-01-SPW" },
                expires_at: new Date(Date.now() + 3600_000).toISOString(),
                created_at: new Date().toISOString(),
                owner_id: null
              },
              error: null
            })
          })
        })
      })
    });

    const getReq = new NextRequest(`http://localhost:3000/api/drafts?token=${created.draftToken}`);
    const getRes = await getDraft(getReq);
    expect(getRes.status).toBe(200);
    const loaded = await getRes.json();
    expect(loaded.draftId).toBe("draft-123");
    expect(loaded.claimed).toBe(false);
  });

  it("rejects unauthenticated requests on POST /api/drafts/claim with 401", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const req = new NextRequest("http://localhost:3000/api/drafts/claim", {
      method: "POST",
      body: JSON.stringify({ token: validToken }),
      headers: { "content-type": "application/json" }
    });
    const res = await claimDraft(req);
    expect(res.status).toBe(401);
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  it("blocks claiming a draft into an organization the user does not belong to", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null });
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "organization_memberships") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { is_staff: false }, error: null })
          })
        })
      };
    });

    const req = new NextRequest("http://localhost:3000/api/drafts/claim", {
      method: "POST",
      body: JSON.stringify({ token: validToken, organizationId: orgId }),
      headers: { "content-type": "application/json" }
    });
    const res = await claimDraft(req);
    expect(res.status).toBe(403);
    expect(mockServiceFrom).not.toHaveBeenCalled();
  });

  it("claims an unclaimed anonymous draft after verifying user and org membership", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: userId } }, error: null });
    mockServerFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { organization_id: orgId },
              error: null
            })
          })
        })
      })
    });

    mockServiceFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: "draft-unclaimed",
                  owner_id: null,
                  expires_at: new Date(Date.now() + 3600_000).toISOString()
                },
                error: null
              })
            })
          })
        })
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "draft-unclaimed" },
                  error: null
                })
              })
            })
          })
        })
      });

    const req = new NextRequest("http://localhost:3000/api/drafts/claim", {
      method: "POST",
      body: JSON.stringify({ token: validToken, organizationId: orgId }),
      headers: { "content-type": "application/json" }
    });
    const res = await claimDraft(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ claimed: true, draftId: "draft-unclaimed" });
  });
});
