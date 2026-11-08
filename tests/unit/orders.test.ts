import { describe, expect, it } from "vitest";
import {
  canTransition,
  orderTransitions,
  projectTransitions
} from "@/lib/domain/states";

describe("order & project lifecycle domain rules", () => {
  it("enforces strict sequential order transitions", () => {
    // Valid order paths
    expect(canTransition("awaiting_payment", "confirmed", orderTransitions)).toBe(true);
    expect(canTransition("confirmed", "in_production", orderTransitions)).toBe(true);
    expect(canTransition("in_production", "completed", orderTransitions)).toBe(true);

    // Invalid order jumps
    expect(canTransition("awaiting_payment", "in_production", orderTransitions)).toBe(false);
    expect(canTransition("awaiting_payment", "completed", orderTransitions)).toBe(false);
    expect(canTransition("completed", "in_production", orderTransitions)).toBe(false);
  });

  it("handles on-hold states correctly for orders", () => {
    expect(canTransition("awaiting_payment", "on_hold", orderTransitions)).toBe(true);
    expect(canTransition("confirmed", "on_hold", orderTransitions)).toBe(true);
    expect(canTransition("in_production", "on_hold", orderTransitions)).toBe(true);

    // Resuming from on_hold
    expect(canTransition("on_hold", "confirmed", orderTransitions)).toBe(true);
    expect(canTransition("on_hold", "in_production", orderTransitions)).toBe(true);
    expect(canTransition("on_hold", "completed", orderTransitions)).toBe(false); // cannot skip directly to completed
  });

  it("enforces project production and revision gates", () => {
    // Requirements flow
    expect(canTransition("awaiting_requirements", "requirements_review", projectTransitions)).toBe(true);
    expect(canTransition("requirements_review", "ready_for_production", projectTransitions)).toBe(true);
    expect(canTransition("requirements_review", "awaiting_requirements", projectTransitions)).toBe(true); // rejection/missing info

    // Execution flow
    expect(canTransition("ready_for_production", "in_progress", projectTransitions)).toBe(true);
    expect(canTransition("in_progress", "internal_qa", projectTransitions)).toBe(true);
    expect(canTransition("internal_qa", "client_review", projectTransitions)).toBe(true);

    // Review & Revisions
    expect(canTransition("client_review", "revision", projectTransitions)).toBe(true);
    expect(canTransition("revision", "in_progress", projectTransitions)).toBe(true);
    expect(canTransition("client_review", "approved", projectTransitions)).toBe(true);
    expect(canTransition("approved", "delivered", projectTransitions)).toBe(true);

    // Terminal delivered state
    expect(canTransition("delivered", "in_progress", projectTransitions)).toBe(false);
    expect(canTransition("delivered", "revision", projectTransitions)).toBe(false);
  });
});
