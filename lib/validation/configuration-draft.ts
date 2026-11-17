import { z } from "zod";
import { serviceById } from "@/lib/catalog";

export const configurationDraftSchema = z.strictObject({
  goal: z.string().max(200),
  problem: z.string().max(4000),
  serviceId: z.string().max(80),
  addonIds: z.array(z.string().max(100)).max(50),
  designDirection: z.string().max(3000),
  budgetBand: z.enum(["under-25k", "25k-75k", "75k-200k", "200k-plus", "not-sure"]),
  targetDate: z.string().max(10),
  name: z.string().max(120),
  email: z.string().max(254),
  phone: z.string().max(40),
  organization: z.string().max(200),
  consent: z.boolean(),
  step: z.number().int().min(1).max(6)
}).superRefine((draft, ctx) => {
  if (!draft.serviceId && draft.addonIds.length) {
    ctx.addIssue({ code: "custom", message: "Select a service before adding features." });
    return;
  }
  if (draft.serviceId) {
    const service = serviceById(draft.serviceId);
    if (!service) {
      ctx.addIssue({ code: "custom", message: "The selected service is not available." });
      return;
    }
    const allowed = new Set(service.addons.map((a) => a.id));
    if (draft.addonIds.some((id) => !allowed.has(id))) {
      ctx.addIssue({ code: "custom", message: "The selected capabilities do not match the service." });
    }
  }
});
