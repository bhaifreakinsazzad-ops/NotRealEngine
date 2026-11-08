import { describe, expect, it } from "vitest";
import {
  buildQuoteSnapshot,
  calculateQuoteTotalMinor,
  validateQuoteForPublishing
} from "@/lib/domain/quotes";

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

  it("rejects publishing when terms version or valid date is missing", () => {
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
