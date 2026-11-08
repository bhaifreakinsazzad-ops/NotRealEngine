import { describe, expect, it } from "vitest";
import { canTransition, orderTransitions, projectTransitions, quoteTransitions } from "@/lib/domain/states";

describe("state transitions", () => {
  it("permits the intended quote lifecycle and blocks skips", () => {
    expect(canTransition("draft", "under_review", quoteTransitions)).toBe(true);
    expect(canTransition("draft", "accepted", quoteTransitions)).toBe(false);
    expect(canTransition("sent", "accepted", quoteTransitions)).toBe(true);
    expect(canTransition("expired", "accepted", quoteTransitions)).toBe(false);
  });
  it("does not allow payment or production states to be forged by skipping", () => {
    expect(canTransition("draft", "confirmed", orderTransitions)).toBe(false);
    expect(canTransition("awaiting_payment", "confirmed", orderTransitions)).toBe(true);
    expect(canTransition("completed", "in_production", orderTransitions)).toBe(false);
  });
  it("guards project production milestones and blocks illegal jumps", () => {
    expect(canTransition("awaiting_requirements", "requirements_review", projectTransitions)).toBe(true);
    expect(canTransition("awaiting_requirements", "in_progress", projectTransitions)).toBe(false);
    expect(canTransition("client_review", "approved", projectTransitions)).toBe(true);
    expect(canTransition("client_review", "revision", projectTransitions)).toBe(true);
    expect(canTransition("approved", "delivered", projectTransitions)).toBe(true);
    expect(canTransition("delivered", "in_progress", projectTransitions)).toBe(false);
  });
});
