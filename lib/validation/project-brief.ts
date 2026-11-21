import { z } from "zod";
import { isCompatibleAddon, isRetiredAddonId, isRetiredServiceId, serviceById } from "@/lib/catalog";

export const projectBriefSchema = z
  .object({
    goal: z.string().trim().min(3).max(120),
    problem: z.string().trim().min(20).max(3000),
    serviceId: z.string().refine(
      (value) => !isRetiredServiceId(value) && Boolean(serviceById(value)),
      "Unknown or unavailable canonical service"
    ),
    addonIds: z.array(z.string().trim().min(1).max(32)).max(20).default([]),
    designDirection: z.string().trim().max(240).default(""),
    budgetBand: z.enum(["under-25k", "25k-75k", "75k-200k", "200k-plus", "not-sure"]),
    targetDate: z.string().date().nullable(),
    name: z.string().trim().min(2).max(120),
    email: z.string().email().max(320),
    phone: z.string().trim().min(7).max(32),
    organization: z.string().trim().max(160).default(""),
    consent: z.literal(true),
    attribution: z
      .object({
        source: z.string().max(120).nullable(),
        campaign: z.string().max(120).nullable(),
      })
      .default({ source: null, campaign: null }),
  })
  .superRefine((value, context) => {
    const service = serviceById(value.serviceId);
    if (!service) return;

    const seen = new Set<string>();
    for (const addonId of value.addonIds) {
      if (seen.has(addonId)) {
        context.addIssue({
          code: "custom",
          path: ["addonIds"],
          message: `Duplicate add-on selection (${addonId}) is not allowed.`,
        });
        continue;
      }
      seen.add(addonId);

      if (isRetiredAddonId(addonId)) {
        context.addIssue({
          code: "custom",
          path: ["addonIds"],
          message: `Add-on ${addonId} is retired and unavailable.`,
        });
        continue;
      }

      if (!isCompatibleAddon(service.id, addonId)) {
        context.addIssue({
          code: "custom",
          path: ["addonIds"],
          message: `Add-on ${addonId} is not compatible with ${service.name} (${service.id}).`,
        });
      }
    }
  });

export type ProjectBriefInput = z.infer<typeof projectBriefSchema>;
