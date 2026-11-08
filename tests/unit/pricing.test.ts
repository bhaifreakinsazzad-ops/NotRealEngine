import { describe, expect, it } from "vitest";
import { eligiblePrice } from "@/lib/domain/pricing";

const approved = {
  state: "approved",
  amountMinor: 99900,
  currency: "BDT",
  market: "BD",
  validFrom: "2026-11-01T00:00:00Z",
  validTo: "2026-11-30T23:59:59Z",
  approvedAt: "2026-10-31T10:00:00Z",
  approvedBy: "38c3ec5c-e71f-4c67-b805-f4f7f3ff12d8"
};

const pkg = { active: true, orderable: true, approved: true, serviceActive: true, prices: [approved] };

describe("price eligibility", () => {
  it("returns the only fully eligible price", () => expect(eligiblePrice(pkg, "BD", new Date("2026-11-08T00:00:00Z"))?.amountMinor).toBe(99900));
  it("rejects zero, null-like, unapproved, or expired prices", () => {
    expect(eligiblePrice({ ...pkg, prices: [{ ...approved, amountMinor: 0 }] }, "BD", new Date("2026-11-08"))).toBeNull();
    expect(eligiblePrice({ ...pkg, prices: [{ ...approved, state: "draft" }] }, "BD", new Date("2026-11-08"))).toBeNull();
    expect(eligiblePrice(pkg, "BD", new Date("2026-12-01"))).toBeNull();
  });
  it("rejects market mismatch and ambiguous overlap", () => {
    expect(eligiblePrice(pkg, "US", new Date("2026-11-08"))).toBeNull();
    expect(eligiblePrice({ ...pkg, prices: [approved, { ...approved, market: "GLOBAL" }] }, "BD", new Date("2026-11-08"))).toBeNull();
  });
  it("rejects inactive, unordered, or unapproved packages", () => {
    expect(eligiblePrice({ ...pkg, orderable: false }, "BD", new Date("2026-11-08"))).toBeNull();
    expect(eligiblePrice({ ...pkg, approved: false }, "BD", new Date("2026-11-08"))).toBeNull();
    expect(eligiblePrice({ ...pkg, serviceActive: false }, "BD", new Date("2026-11-08"))).toBeNull();
  });
});
