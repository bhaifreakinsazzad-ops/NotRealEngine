export const quoteStates = ["draft", "under_review", "sent", "accepted", "rejected", "expired", "superseded"] as const;
export type QuoteState = (typeof quoteStates)[number];

export const quoteTransitions: Record<QuoteState, readonly QuoteState[]> = {
  draft: ["under_review"],
  under_review: ["draft", "sent"],
  sent: ["accepted", "rejected", "expired", "superseded"],
  accepted: ["superseded"],
  rejected: [],
  expired: [],
  superseded: []
};

export const orderStates = ["draft", "awaiting_acceptance", "awaiting_payment", "confirmed", "in_production", "completed", "cancelled", "on_hold"] as const;
export type OrderState = (typeof orderStates)[number];

export const orderTransitions: Record<OrderState, readonly OrderState[]> = {
  draft: ["awaiting_acceptance", "cancelled"],
  awaiting_acceptance: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["confirmed", "cancelled", "on_hold"],
  confirmed: ["in_production", "on_hold", "cancelled"],
  in_production: ["completed", "on_hold", "cancelled"],
  completed: [],
  cancelled: [],
  on_hold: ["awaiting_payment", "confirmed", "in_production", "cancelled"]
};

export function canTransition<S extends string>(from: S, to: S, map: Record<S, readonly S[]>): boolean {
  return map[from]?.includes(to) ?? false;
}
