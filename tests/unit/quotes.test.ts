import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildQuoteSnapshot,
  calculateQuoteTotalMinor,
  validateQuoteForPublishing,
  evaluateTermsAcceptanceEligibility,
  DEFAULT_TERMS_REGISTRY
} from "@/lib/domain/quotes";
import { decideQuoteAction } from "@/app/quotes/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

const mockQuoteSingle = vi.fn();
const mockMembershipMaybeSingle = vi.fn();
const mockTermsMaybeSingle = vi.fn();
const mockRpc = vi.fn();
const mockUpdateEq = vi.fn();

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
        if (table === "commercial_terms_versions") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: () => mockTermsMaybeSingle()
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

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn().mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { accepted_snapshot: {} }, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: (...args: unknown[]) => mockUpdateEq(...args)
      })
    }))
  }))
}));

describe("quotation domain rules & V12 legal terms governance", () => {
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

  it("classifies ENGINE//OS-TERMS-V1.0 and STANDARD-V1.0 as draft by default (blocking binding acceptance)", () => {
    const engineTerms = DEFAULT_TERMS_REGISTRY["ENGINE//OS-TERMS-V1.0"];
    expect(engineTerms.classification).toBe("draft");
    expect(engineTerms.approvedBy).toBeNull();

    const eligibility = evaluateTermsAcceptanceEligibility(engineTerms, "staging");
    expect(eligibility.allowed).toBe(false);
    expect(eligibility.reason).toMatch(/DRAFT status/i);
  });

  it("allows STAGING-TEST-TERMS-V1.0 for non-binding staging verification only and blocks it in production", () => {
    const stagingTerms = DEFAULT_TERMS_REGISTRY["STAGING-TEST-TERMS-V1.0"];
    expect(stagingTerms.classification).toBe("staging_synthetic");

    const stagingEval = evaluateTermsAcceptanceEligibility(stagingTerms, "staging");
    expect(stagingEval.allowed).toBe(true);
    expect(stagingEval.isNonBindingStaging).toBe(true);

    const prodEval = evaluateTermsAcceptanceEligibility(stagingTerms, "production");
    expect(prodEval.allowed).toBe(false);
    expect(prodEval.reason).toMatch(/cannot be used for binding production orders/i);
  });

  it("requires explicit founder approval metadata for approved_production terms", () => {
    const incompleteProdTerms = {
      version: "ENGINE//OS-TERMS-V2.0",
      documentId: "DOC-TERMS-V2",
      title: "Production Terms v2",
      classification: "approved_production" as const,
      approvedBy: null,
      approvedAt: null,
      approvalReference: null
    };
    const rejected = evaluateTermsAcceptanceEligibility(incompleteProdTerms, "production");
    expect(rejected.allowed).toBe(false);
    expect(rejected.reason).toMatch(/lacks verified founder approval metadata/i);

    const verifiedProdTerms = {
      ...incompleteProdTerms,
      approvedBy: "Founder Sazzad",
      approvedAt: "2026-11-08T12:00:00.000Z",
      approvalReference: "LEGAL-APPROVAL-2026-01"
    };
    const allowed = evaluateTermsAcceptanceEligibility(verifiedProdTerms, "production");
    expect(allowed.allowed).toBe(true);
    expect(allowed.isNonBindingStaging).toBe(false);
  });

  it("validates quotes ready for publishing", () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 3600 * 1000);
    const result = validateQuoteForPublishing({
      state: "draft",
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "STAGING-TEST-TERMS-V1.0",
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
    expect(unapprovedTerms.errors.some((e) => e.includes("not registered in the commercial terms registry"))).toBe(true);
  });

  it("builds an immutable, type-compliant snapshot with termsClassification for published quotes", () => {
    const futureDate = new Date("2026-12-01T00:00:00.000Z");
    const quoteId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const orgId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

    const snapshot = buildQuoteSnapshot({
      quoteId,
      organizationId: orgId,
      currency: "BDT",
      totalMinor: 25000000,
      revisionLimit: 2,
      termsVersion: "STAGING-TEST-TERMS-V1.0",
      validUntil: futureDate,
      scope: validScope,
      items: validItems,
      now: new Date("2026-11-08T12:00:00.000Z")
    });

    expect(snapshot.quoteId).toBe(quoteId);
    expect(snapshot.currency).toBe("BDT");
    expect(snapshot.totalMinor).toBe(25000000);
    expect(snapshot.termsVersion).toBe("STAGING-TEST-TERMS-V1.0");
    expect(snapshot.termsDocumentId).toBe("DOC-STG-SYNTHETIC-V1");
    expect(snapshot.termsClassification).toBe("staging_synthetic");
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
    mockTermsMaybeSingle.mockReset();
    mockRpc.mockReset();
    mockUpdateEq.mockReset();
  });

  it("rejects acceptance by a viewer role (requires owner or admin signatory)", async () => {
    mockQuoteSingle.mockResolvedValueOnce({
      data: {
        id: quoteId,
        organization_id: orgId,
        state: "sent",
        valid_until: new Date(Date.now() + 86400_000).toISOString(),
        terms_version: "STAGING-TEST-TERMS-V1.0",
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

  it("rejects acceptance when quote terms_version is in draft state (ENGINE//OS-TERMS-V1.0 without founder approval)", async () => {
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
    mockTermsMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    });

    const res = await decideQuoteAction({
      quoteId,
      decision: "accepted",
      termsAccepted: true
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/DRAFT status/i);
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("executes decide_quote RPC when owner accepts quote with STAGING-TEST-TERMS-V1.0 in staging", async () => {
    mockQuoteSingle.mockResolvedValueOnce({
      data: {
        id: quoteId,
        organization_id: orgId,
        state: "sent",
        valid_until: new Date(Date.now() + 86400_000).toISOString(),
        terms_version: "STAGING-TEST-TERMS-V1.0",
        snapshot: { quoteId }
      },
      error: null
    });
    mockMembershipMaybeSingle.mockResolvedValueOnce({
      data: { role: "owner" },
      error: null
    });
    mockTermsMaybeSingle.mockResolvedValueOnce({
      data: null,
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
