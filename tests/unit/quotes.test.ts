import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildQuoteSnapshot,
  calculateQuoteTotalMinor,
  validateQuoteForPublishing
} from "@/lib/domain/quotes";
import { decideQuoteAction } from "@/app/quotes/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

const mockQuoteSingle = vi.fn();
const mockMembershipMaybeSingle = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockImplementation(async () => ({
    supabase: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "quotes") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: () => mockQuoteSingle()
              })
            })
          };
        }
        if (table === "organization_memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: () => mockMembershipMaybeSingle()
                })
              })
            })
          };
        }
        return {};
      }),
      rpc: (...args: unknown[]) => mockRpc(...args)
    },
    user: { id: "user-123" }
  }))
}));

describe("quotation domain rules", () => {
  const validScope = {
    summary: "Complete web application development according to project brief",
    deliverables: ["Full-stack application", "Supabase PostgreSQL backend", "Admin operations dashboard"],
    exclusions: ["Third-party SMS charges", "Custom mobile app"],
    milestones: ["Design approval", "MVP release", "Production launch"]
  };

  const validItems = [
    { label: "Core Architecture & Backend", quantity: 1, unitAmountMinor: 15000000, displayOrder: 1 },
    { label: "Client Workspace & Portal", quantity: 1, unitAmountMinor: 10000000, displayOrder: 2 }
  ];

  it("calculates quote total minor units correctly", () => {
    const total = calculateQuoteTotalMinor(validItems);
    expect(total).toBe(25000000); // 250,000.00
  });

  it("validates quotes ready for publishing", () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const result = validateQuoteForPublishing({
      state: "draft",
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "ENGINE//OS-TERMS-V1.0",
      validUntil: futureDate,
      scope: validScope,
      items: validItems
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects publishing when terms version is missing or unapproved", () => {
    const pastDate = new Date(Date.now() - 3600 * 1000);
    const result = validateQuoteForPublishing({
      state: "draft",
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "",
      validUntil: pastDate,
      scope: validScope,
      items: validItems
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Terms version is required"))).toBe(true);
    expect(result.errors.some((e) => e.includes("Validity date must be in the future"))).toBe(true);

    const unapprovedTerms = validateQuoteForPublishing({
      state: "draft",
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "DRAFT-PLACEHOLDER-V0",
      validUntil: new Date(Date.now() + 86400 * 1000),
      scope: validScope,
      items: validItems
    });
    expect(unapprovedTerms.valid).toBe(false);
    expect(unapprovedTerms.errors.some((e) => e.includes("not an approved commercial terms version"))).toBe(true);
  });

  it("builds an immutable, type-compliant snapshot for published quotes", () => {
    const futureDate = new Date("2026-12-01T00:00:00.000Z");
    const quoteId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const orgId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

    const snapshot = buildQuoteSnapshot({
      quoteId,
      organizationId: orgId,
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "ENGINE//OS-TERMS-V1.0",
      validUntil: futureDate,
      scope: validScope,
      items: validItems,
      now: new Date("2026-11-08T12:00:00.000Z")
    });

    expect(snapshot.quoteId).toBe(quoteId);
    expect(snapshot.currency).toBe("BDT");
    expect(snapshot.totalMinor).toBe(25000000);
    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.scope.deliverables).toHaveLength(3);
    expect(snapshot.publishedAt).toBe("2026-11-08T12:00:00.000Z");
  });
});

describe("decideQuoteAction signatory & terms governance", () => {
  const quoteId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const orgId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  beforeEach(() => {
    mockQuoteSingle.mockReset();
    mockMembershipMaybeSingle.mockReset();
    mockRpc.mockReset();
  });

  it("rejects acceptance by a viewer role (requires owner or admin signatory)", async () => {
    mockQuoteSingle.mockResolvedValueOnce({
      data: {
        id: quoteId,
        organization_id: orgId,
        state: "sent",
        valid_until: new Date(Date.now() + 86400_000).toISOString(),
        terms_version: "ENGINE//OS-TERMS-V1.0",
        snapshot: { quoteId }
      },
      error: null
    });
    mockMembershipMaybeSingle.mockResolvedValueOnce({
      data: { role: "viewer" },
      error: null
    });

    const res = await decideQuoteAction({
      quoteId,
      decision: "accepted",
      termsAccepted: true
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/owner or administrator/i);
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects acceptance when quote terms_version is unapproved placeholder", async () => {
    mockQuoteSingle.mockResolvedValueOnce({
      data: {
        id: quoteId,
        organization_id: orgId,
        state: "sent",
        valid_until: new Date(Date.now() + 86400_000).toISOString(),
        terms_version: "UNAPPROVED-PLACEHOLDER",
        snapshot: { quoteId }
      },
      error: null
    });
    mockMembershipMaybeSingle.mockResolvedValueOnce({
      data: { role: "owner" },
      error: null
    });

    const res = await decideQuoteAction({
      quoteId,
      decision: "accepted",
      termsAccepted: true
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/unapproved or placeholder legal terms/i);
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("executes decide_quote RPC when owner accepts valid sent quote", async () => {
    mockQuoteSingle.mockResolvedValueOnce({
      data: {
        id: quoteId,
        organization_id: orgId,
        state: "sent",
        valid_until: new Date(Date.now() + 86400_000).toISOString(),
        terms_version: "ENGINE//OS-TERMS-V1.0",
        snapshot: { quoteId }
      },
      error: null
    });
    mockMembershipMaybeSingle.mockResolvedValueOnce({
      data: { role: "owner" },
      error: null
    });
    mockRpc.mockResolvedValueOnce({
      data: "order-uuid-999",
      error: null
    });

    const res = await decideQuoteAction({
      quoteId,
      decision: "accepted",
      termsAccepted: true
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.orderId).toBe("order-uuid-999");
    }
    expect(mockRpc).toHaveBeenCalledWith("decide_quote", {
      p_quote_id: quoteId,
      p_decision: "accepted"
    });
  });
});
