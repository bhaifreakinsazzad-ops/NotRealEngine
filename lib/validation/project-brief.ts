import { z } from "zod";
import { services } from "@/lib/catalog";

const serviceIds = new Set<string>(services.map((service) => service.id));

export const projectBriefSchema = z.object({
  goal: z.string().trim().min(3).max(120),
  problem: z.string().trim().min(20).max(3000),
  serviceId: z.string().refine((value) => serviceIds.has(value), "Unknown service"),
  addonIds: z.array(z.string()).max(30).default([]),
  designDirection: z.string().trim().max(240).default(""),
  budgetBand: z.enum(["under-25k", "25k-75k", "75k-200k", "200k-plus", "not-sure"]),
  targetDate: z.string().date().nullable(),
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(320),
  phone: z.string().trim().min(7).max(32),
  organization: z.string().trim().max(160).default(""),
  consent: z.literal(true),
  attribution: z.object({ source: z.string().max(120).nullable(), campaign: z.string().max(120).nullable() }).default({ source: null, campaign: null })
}).superRefine((value, context) => {
  const service = services.find((item) => item.id === value.serviceId);
  if (!service) return;
  const selected = new Set(value.addonIds);
  for (const addon of service.addons) {
    if (!selected.has(addon.id)) continue;
    for (const required of addon.requires ?? []) {
      if (!selected.has(required)) context.addIssue({ code: "custom", path: ["addonIds"], message: `${addon.label} requires another selected capability.` });
    }
    for (const conflict of addon.conflicts ?? []) {
      if (selected.has(conflict)) context.addIssue({ code: "custom", path: ["addonIds"], message: `${addon.label} conflicts with another selected capability.` });
    }
  }
});

export type ProjectBriefInput = z.infer<typeof projectBriefSchema>;
