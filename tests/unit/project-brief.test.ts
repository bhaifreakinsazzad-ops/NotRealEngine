import { describe, expect, it } from "vitest";
import { projectBriefSchema } from "@/lib/validation/project-brief";

const valid = { goal: "Improve operations", problem: "We need a secure system to replace manual order tracking.", serviceId: "SVC-11-BMS", addonIds: [], designDirection: "Clear and mobile friendly", budgetBand: "not-sure", targetDate: null, name: "Test User", email: "test@example.com", phone: "+8801700000000", organization: "Example", consent: true, attribution: { source: null, campaign: null } };

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
    const result = projectBriefSchema.safeParse({ ...valid, serviceId: "SVC-02-MIN", addonIds: ["mini-content", "mini-static"] });
    expect(result.success).toBe(false);
  });
});
