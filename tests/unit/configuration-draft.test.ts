import { describe, it, expect } from "vitest";
import { configurationDraftSchema } from "../../lib/validation/configuration-draft";

const valid = {
  goal: "", problem: "", serviceId: "", addonIds: [], designDirection: "",
  budgetBand: "not-sure", targetDate: "", name: "", email: "", phone: "",
  organization: "", consent: false, step: 1
};

describe("configuration draft input boundary", () => {
  it("accepts a partial first-step draft", () => {
    expect(configurationDraftSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects unexpected fields and oversized user content", () => {
    expect(configurationDraftSchema.safeParse({ ...valid, is_staff: true }).success).toBe(false);
    expect(configurationDraftSchema.safeParse({ ...valid, problem: "x".repeat(5000) }).success).toBe(false);
  });
  it("rejects invalid steps, forged service ids and orphan add-ons", () => {
    expect(configurationDraftSchema.safeParse({ ...valid, step: 7 }).success).toBe(false);
    expect(configurationDraftSchema.safeParse({ ...valid, serviceId: "not-a-service" }).success).toBe(false);
    expect(configurationDraftSchema.safeParse({ ...valid, addonIds: ["fake-addon"] }).success).toBe(false);
  });
});
