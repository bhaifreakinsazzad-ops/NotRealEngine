import { describe, expect, it } from "vitest";
import {
  canExecuteAuthorizedSiAction,
  canTransitionSiSuggestion,
} from "@/lib/domain/si-suggestions";
import {
  SUPPORT_TICKET_STATES,
  adminPulseUpdateSchema,
  pulseEligibilityRequestSchema,
} from "@/lib/domain/pulse";

describe("human-supervised SI governance workflow", () => {
  it("blocks direct draft -> applied execution and blocks unapproved execution", () => {
    expect(canTransitionSiSuggestion("draft", "applied")).toBe(false);
    expect(canTransitionSiSuggestion("under_review", "applied")).toBe(false);
    expect(canTransitionSiSuggestion("rejected", "applied")).toBe(false);

    const draftGate = canExecuteAuthorizedSiAction({ status: "draft", approvedBy: "00000000-0000-0000-0000-000000000001" });
    expect(draftGate.allowed).toBe(false);

    const missingApproverGate = canExecuteAuthorizedSiAction({ status: "approved", approvedBy: null });
    expect(missingApproverGate.allowed).toBe(false);
  });

  it("allows Draft -> Human Review -> Approved -> Applied when human approver is present", () => {
    expect(canTransitionSiSuggestion("draft", "under_review")).toBe(true);
    expect(canTransitionSiSuggestion("under_review", "approved")).toBe(true);
    expect(canTransitionSiSuggestion("approved", "applied")).toBe(true);

    const okGate = canExecuteAuthorizedSiAction({
      status: "approved",
      approvedBy: "11111111-1111-4111-8111-111111111111",
    });
    expect(okGate.allowed).toBe(true);
  });
});

describe("NRE PULSE domain and support ticket constraints", () => {
  it("matches exact SQL CHECK constraint values for support_tickets.state", () => {
    expect(SUPPORT_TICKET_STATES).toEqual([
      "open",
      "waiting_staff",
      "waiting_client",
      "resolved",
      "closed",
    ]);
  });

  it("validates PULSE eligibility requests and rejects invalid plan/module IDs", () => {
    const valid = pulseEligibilityRequestSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      projectId: null,
      planId: "PULSE_CORE",
      coverageModuleIds: ["M01", "M02", "M05"],
      scopeNotes: "Production Next.js storefront requiring monthly patching and backup checks.",
    });
    expect(valid.success).toBe(true);

    const invalidModule = pulseEligibilityRequestSchema.safeParse({
      organizationId: "11111111-1111-4111-8111-111111111111",
      planId: "PULSE_CORE",
      coverageModuleIds: ["M99"],
      scopeNotes: "Valid length scope description.",
    });
    expect(invalidModule.success).toBe(false);
  });

  it("validates staff PULSE eligibility updates", () => {
    const res = adminPulseUpdateSchema.safeParse({
      subscriptionId: "22222222-2222-4222-8222-222222222222",
      planId: "PULSE_PRIME",
      status: "approved_manual",
      coverageModuleIds: ["M01", "M02", "M03", "M04", "M05", "M06", "M07"],
      scopeNotes: "Eligibility verified. Manual quarterly invoicing agreed.",
    });
    expect(res.success).toBe(true);
  });
});
