import { z } from "zod";
import { pulseCoverageModules, pulsePlans } from "@/lib/catalog-v5";

export type PulseSubscriptionStatus =
  | "inquiry"
  | "eligibility_review"
  | "approved_manual"
  | "active_manual"
  | "paused"
  | "closed";

export const PULSE_PLAN_IDS = ["PULSE_FLEX", "PULSE_CORE", "PULSE_PRIME"] as const;
export const PULSE_MODULE_IDS = ["M01", "M02", "M03", "M04", "M05", "M06", "M07"] as const;
export const PULSE_SUBSCRIPTION_STATUSES = [
  "inquiry",
  "eligibility_review",
  "approved_manual",
  "active_manual",
  "paused",
  "closed",
] as const;

export const SUPPORT_TICKET_STATES = [
  "open",
  "waiting_staff",
  "waiting_client",
  "resolved",
  "closed",
] as const;

export type SupportTicketState = (typeof SUPPORT_TICKET_STATES)[number];

export const pulseEligibilityRequestSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  projectId: z.string().uuid().optional().nullable(),
  planId: z.enum(PULSE_PLAN_IDS),
  coverageModuleIds: z
    .array(z.enum(PULSE_MODULE_IDS))
    .min(1, "Select at least one NRE PULSE coverage module (M01–M07)."),
  scopeNotes: z.string().trim().min(10, "Describe your site/system and care needs (at least 10 characters).").max(2000),
});

export const adminPulseUpdateSchema = z.object({
  subscriptionId: z.string().uuid("Invalid PULSE subscription ID"),
  planId: z.enum(PULSE_PLAN_IDS),
  status: z.enum(PULSE_SUBSCRIPTION_STATUSES),
  coverageModuleIds: z.array(z.enum(PULSE_MODULE_IDS)).min(1, "Assign at least one coverage module."),
  scopeNotes: z.string().trim().max(3000),
});

export function resolvePulsePlanName(planId: string): string {
  return pulsePlans.find((p) => p.id === planId)?.name ?? planId;
}

export function resolvePulseModuleLabel(moduleId: string): string {
  const mod = pulseCoverageModules.find((m) => m.id === moduleId);
  return mod ? `${mod.id} — ${mod.name}` : moduleId;
}
