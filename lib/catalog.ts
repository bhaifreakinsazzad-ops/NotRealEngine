import {
  CATALOG_V5_VERSION,
  RETIRED_ADDON_IDS,
  RETIRED_SERVICE_IDS,
  canonicalAddonsV5,
  canonicalServicesV5,
  formatBdt,
  formatStartingFromBdt,
  legacyServiceAliases,
  pulseCoverageModules,
  pulsePlans,
  pulsePositioning,
  type CanonicalAddonV5,
  type CanonicalServiceV5,
  type LegacyServiceAlias,
  type PulseCoverageModule,
  type PulsePlan,
  type ServiceSegment,
} from "@/lib/catalog-v5";

export {
  CATALOG_V5_VERSION,
  RETIRED_ADDON_IDS,
  RETIRED_SERVICE_IDS,
  canonicalAddonsV5,
  canonicalServicesV5,
  formatBdt,
  formatStartingFromBdt,
  legacyServiceAliases,
  pulseCoverageModules,
  pulsePlans,
  pulsePositioning,
};

export type {
  CanonicalAddonV5,
  CanonicalServiceV5,
  LegacyServiceAlias,
  PulseCoverageModule,
  PulsePlan,
  ServiceSegment,
};

export type ServiceCategory = {
  id: string;
  name: string;
  segment: ServiceSegment;
  description: string;
};

export type ServiceAddonSummary = {
  id: string;
  label: string;
  summary: string;
  startingPriceBdt: number;
  startingPriceMinor: number;
  note?: string;
  requires?: readonly string[];
  conflicts?: readonly string[];
};

export type ServiceOffer = {
  id: string;
  categoryId: string;
  segment: ServiceSegment;
  categoryName: string;
  slug: string;
  name: string;
  shortLabel: string;
  summary: string;
  audience: string;
  startingPriceBdt: number;
  startingPriceMinor: number;
  currency: "BDT";
  priceLabelPrefix: "Starting From";
  approvedForCheckout: false;
  timelineRange: string;
  scopeCaveat?: string;
  included: readonly string[];
  addons: readonly ServiceAddonSummary[];
  salesMode: "quote_required";
  legacyIds: readonly string[];
  displayOrder: number;
};

const addonMap = new Map<string, CanonicalAddonV5>(
  canonicalAddonsV5.map((addon) => [addon.id, addon])
);

const slugifyCategory = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const segments: readonly { id: ServiceSegment; name: string; count: number; description: string }[] = [
  {
    id: "standalone",
    name: "Standalone Services",
    count: canonicalServicesV5.filter((s) => s.segment === "standalone").length,
    description:
      "Complete websites, commerce stores, portals, dashboards, web apps, PWAs, mobile apps, and SaaS MVPs.",
  },
  {
    id: "core_technical",
    name: "Core Technical Services",
    count: canonicalServicesV5.filter((s) => s.segment === "core_technical").length,
    description:
      "Targeted engineering engagements for payment gateways, hosting, UI/UX, revamps, databases, fixes, features, admin panels, and SEO/AEO.",
  },
] as const;

export const categories: readonly ServiceCategory[] = [
  {
    id: "web-presence",
    name: "Web Presence",
    segment: "standalone",
    description: "Fast, structured company and founder websites.",
  },
  {
    id: "conversion-growth",
    name: "Conversion & Growth",
    segment: "standalone",
    description: "Focused landing pages and multi-step acquisition funnels.",
  },
  {
    id: "commerce",
    name: "Commerce",
    segment: "standalone",
    description: "Online retail stores with catalog, cart, and order foundations.",
  },
  {
    id: "portals-operations",
    name: "Portals & Operations",
    segment: "standalone",
    description: "Authenticated client workspaces and operational dashboards.",
  },
  {
    id: "web-app-engineering",
    name: "Web & App Engineering",
    segment: "standalone",
    description: "Custom web applications, installable PWAs, and SaaS MVPs.",
  },
  {
    id: "mobile-applications",
    name: "Mobile Applications",
    segment: "standalone",
    description: "Dedicated Android and iOS mobile app builds.",
  },
  {
    id: "business-systems",
    name: "Business Systems",
    segment: "standalone",
    description: "Scoped internal software and phased ERP systems.",
  },
  {
    id: "core-technical",
    name: "Core Technical",
    segment: "core_technical",
    description: "Payments, hosting, UI/UX, revamps, databases, debugging, features, admin consoles, and SEO/AEO.",
  },
] as const;

export const services: readonly ServiceOffer[] = canonicalServicesV5.map((svc) => ({
  id: svc.id,
  categoryId: slugifyCategory(svc.category),
  segment: svc.segment,
  categoryName: svc.category,
  slug: svc.slug,
  name: svc.name,
  shortLabel: svc.shortLabel,
  summary: svc.summary,
  audience: svc.idealFor,
  startingPriceBdt: svc.startingPriceBdt,
  startingPriceMinor: svc.startingPriceMinor,
  currency: svc.currency,
  priceLabelPrefix: svc.priceLabelPrefix,
  approvedForCheckout: svc.approvedForCheckout,
  timelineRange: svc.timelineRange,
  scopeCaveat: svc.scopeCaveat,
  included: svc.deliverables,
  addons: svc.compatibleAddonIds
    .map((addonId) => addonMap.get(addonId))
    .filter((addon): addon is CanonicalAddonV5 => Boolean(addon))
    .map((addon) => ({
      id: addon.id,
      label: addon.name,
      summary: addon.summary,
      startingPriceBdt: addon.startingPriceBdt,
      startingPriceMinor: addon.startingPriceMinor,
      note: addon.note,
    })),
  salesMode: svc.salesMode,
  legacyIds: svc.legacyIds,
  displayOrder: svc.displayOrder,
}));

export const addons = canonicalAddonsV5;

const serviceByIdMap = new Map<string, ServiceOffer>(services.map((s) => [s.id, s]));
const serviceBySlugMap = new Map<string, ServiceOffer>(services.map((s) => [s.slug, s]));
const legacyAliasByIdMap = new Map<string, LegacyServiceAlias>(
  legacyServiceAliases.map((alias) => [alias.legacyId, alias])
);
const legacyAliasBySlugMap = new Map<string, LegacyServiceAlias>(
  legacyServiceAliases.map((alias) => [alias.legacySlug, alias])
);
const retiredServiceSet = new Set<string>(RETIRED_SERVICE_IDS);
const retiredAddonSet = new Set<string>(RETIRED_ADDON_IDS);

export const serviceById = (id: string): ServiceOffer | undefined => serviceByIdMap.get(id);
export const serviceBySlug = (slug: string): ServiceOffer | undefined => serviceBySlugMap.get(slug);
export const addonById = (id: string): CanonicalAddonV5 | undefined => addonMap.get(id);

export const standaloneServices = services.filter((s) => s.segment === "standalone");
export const coreTechnicalServices = services.filter((s) => s.segment === "core_technical");

export function isRetiredServiceId(id: string): boolean {
  return retiredServiceSet.has(id);
}

export function isRetiredAddonId(id: string): boolean {
  return retiredAddonSet.has(id);
}

export function getCompatibleAddons(serviceId: string): readonly CanonicalAddonV5[] {
  const service = serviceByIdMap.get(serviceId);
  if (!service) return [];
  return service.addons
    .map((a) => addonMap.get(a.id))
    .filter((a): a is CanonicalAddonV5 => Boolean(a));
}

export function isCompatibleAddon(serviceId: string, addonId: string): boolean {
  if (retiredAddonSet.has(addonId)) return false;
  const service = serviceByIdMap.get(serviceId);
  if (!service) return false;
  return service.addons.some((a) => a.id === addonId);
}

export function resolveLegacyAlias(ref: string): LegacyServiceAlias | undefined {
  return legacyAliasByIdMap.get(ref) ?? legacyAliasBySlugMap.get(ref);
}

/**
 * Resolves a human-readable label for BOTH active v5 services (`S01`–`S24`)
 * and historical archived legacy IDs (`SVC-*`) so Client & Admin portals
 * display historical orders, quotes, and projects cleanly.
 */
export function resolveServiceLabel(serviceRef: string | null | undefined): {
  id: string;
  name: string;
  isLegacy: boolean;
  mappedV5Ids: readonly string[];
} {
  if (!serviceRef) {
    return { id: "UNSPECIFIED", name: "Scoped Custom Engagement", isLegacy: false, mappedV5Ids: [] };
  }
  const v5 = serviceByIdMap.get(serviceRef) ?? serviceBySlugMap.get(serviceRef);
  if (v5) {
    return { id: v5.id, name: v5.name, isLegacy: false, mappedV5Ids: [v5.id] };
  }
  const legacy = resolveLegacyAlias(serviceRef);
  if (legacy) {
    return {
      id: legacy.legacyId,
      name: `${legacy.legacyName} (Legacy)`,
      isLegacy: true,
      mappedV5Ids: legacy.v5ServiceIds,
    };
  }
  return { id: serviceRef, name: serviceRef, isLegacy: false, mappedV5Ids: [] };
}

/**
 * Resolves a verified database `services.id` for order-to-project provisioning.
 * Accepts active v5 IDs/slugs and preserved archival `SVC-*` IDs for historical orders;
 * strictly rejects retired IDs (`S16`, `S20`) and arbitrary strings.
 */
export function resolveProvisionableServiceId(candidateRef: string): string | undefined {
  const trimmed = candidateRef.trim();
  if (!trimmed || retiredServiceSet.has(trimmed)) return undefined;
  const v5 = serviceByIdMap.get(trimmed) ?? serviceBySlugMap.get(trimmed);
  if (v5) return v5.id;
  const legacy = legacyAliasByIdMap.get(trimmed);
  if (legacy) return legacy.legacyId;
  return undefined;
}

/**
 * Computes transparent `Starting From` integer minor-unit & BDT estimate
 * for a v5 service plus its compatible add-ons (never double-counting duplicates).
 */
export function calculateStartingEstimateBdt(
  serviceId: string,
  addonIds: readonly string[]
): {
  baseBdt: number;
  baseMinor: number;
  addonsBdt: number;
  addonsMinor: number;
  totalBdt: number;
  totalMinor: number;
  validAddons: readonly CanonicalAddonV5[];
} | null {
  const service = serviceByIdMap.get(serviceId);
  if (!service) return null;

  const uniqueAddonIds = Array.from(new Set(addonIds));
  const validAddons: CanonicalAddonV5[] = [];
  let addonsMinor = 0;
  let addonsBdt = 0;

  for (const addonId of uniqueAddonIds) {
    if (!isCompatibleAddon(service.id, addonId)) continue;
    const addon = addonMap.get(addonId);
    if (!addon) continue;
    validAddons.push(addon);
    addonsMinor += addon.startingPriceMinor;
    addonsBdt += addon.startingPriceBdt;
  }

  return {
    baseBdt: service.startingPriceBdt,
    baseMinor: service.startingPriceMinor,
    addonsBdt,
    addonsMinor,
    totalBdt: service.startingPriceBdt + addonsBdt,
    totalMinor: service.startingPriceMinor + addonsMinor,
    validAddons,
  };
}

/**
 * Archival governance reference only — MUST NOT be displayed on public discovery pages.
 * Legacy BDT 999 campaign was retired in Catalog v5 (2026-11-21).
 */
export const singlePagePromotion = {
  amount: 999,
  currency: "BDT",
  archived: true,
  publicVisible: false,
  approvedForCheckout: false,
  note: "Archived legacy campaign record. Removed from public discovery in Canonical Catalog v5; never approved for automated checkout.",
} as const;
