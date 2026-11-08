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

export const projectStates = [
  "awaiting_requirements",
  "requirements_review",
  "ready_for_production",
  "in_progress",
  "internal_qa",
  "client_review",
  "revision",
  "approved",
  "delivered",
  "on_hold",
  "cancelled"
] as const;
export type ProjectState = (typeof projectStates)[number];

export const projectTransitions: Record<ProjectState, readonly ProjectState[]> = {
  awaiting_requirements: ["requirements_review", "on_hold", "cancelled"],
  requirements_review: ["awaiting_requirements", "ready_for_production", "on_hold", "cancelled"],
  ready_for_production: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["internal_qa", "on_hold", "cancelled"],
  internal_qa: ["in_progress", "client_review", "on_hold"],
  client_review: ["revision", "approved", "on_hold"],
  revision: ["in_progress", "client_review", "on_hold"],
  approved: ["delivered"],
  delivered: [],
  cancelled: [],
  on_hold: [
    "awaiting_requirements",
    "requirements_review",
    "ready_for_production",
    "in_progress",
    "internal_qa",
    "client_review",
    "revision",
    "cancelled"
  ]
};

export function canTransition<S extends string>(from: S, to: S, map: Record<S, readonly S[]>): boolean {
  return map[from]?.includes(to) ?? false;
}
