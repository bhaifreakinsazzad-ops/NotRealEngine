/**
 * NotRealEngine — Human-Supervised SI (Synthetic Intelligence) Workflow Domain Rules
 *
 * Governance:
 *   Draft -> Human Review (under_review) -> Approval or Rejection -> Authorized Action (applied) -> Audit Trail
 *
 * Synthetic Intelligence drafts suggestions to assist human experts; it can NEVER
 * transition a suggestion directly from `draft` to `applied` or execute commercial,
 * billing, or client-facing mutations autonomously without human approval.
 */

export type SiSuggestionStatus =
  | "draft"
  | "under_review"
  | "reviewed"
  | "approved"
  | "rejected"
  | "applied"
  | "dismissed";

export type SiEntityType = "project_brief" | "quote" | "project" | "support_ticket";

export type SiSuggestionKind =
  | "project_timeline_update"
  | "support_response_draft"
  | "scope_clarification"
  | "pulse_triage_note";

export const siSuggestionTransitions: Record<SiSuggestionStatus, readonly SiSuggestionStatus[]> = {
  draft: ["under_review", "approved", "rejected", "dismissed"],
  under_review: ["approved", "rejected", "dismissed"],
  reviewed: ["approved", "rejected", "dismissed"],
  approved: ["applied", "dismissed"],
  rejected: [],
  applied: [],
  dismissed: [],
};

export function canTransitionSiSuggestion(
  from: SiSuggestionStatus,
  to: SiSuggestionStatus,
): boolean {
  return siSuggestionTransitions[from]?.includes(to) ?? false;
}

export function canExecuteAuthorizedSiAction(input: {
  status: SiSuggestionStatus;
  approvedBy: string | null | undefined;
}): { allowed: true } | { allowed: false; reason: string } {
  if (input.status !== "approved") {
    return {
      allowed: false,
      reason: `Suggestion must be human-approved before execution (current status: ${input.status}).`,
    };
  }
  if (!input.approvedBy || input.approvedBy.trim().length === 0) {
    return {
      allowed: false,
      reason: "Human approver identity (approved_by) is required before applying an SI suggestion.",
    };
  }
  return { allowed: true };
}
