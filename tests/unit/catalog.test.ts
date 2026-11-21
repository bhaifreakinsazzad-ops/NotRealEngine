import { describe, expect, it } from "vitest";
import {
  RETIRED_ADDON_IDS,
  RETIRED_SERVICE_IDS,
  addons,
  calculateStartingEstimateBdt,
  coreTechnicalServices,
  isCompatibleAddon,
  legacyServiceAliases,
  pulseCoverageModules,
  pulsePlans,
  resolveProvisionableServiceId,
  resolveServiceLabel,
  services,
  singlePagePromotion,
  standaloneServices,
} from "@/lib/catalog";

describe("canonical v5 service architecture", () => {
  it("keeps exactly 22 active services (13 Standalone + 9 Core Technical) and 13 compatible add-ons", () => {
    expect(services).toHaveLength(22);
    expect(standaloneServices).toHaveLength(13);
    expect(coreTechnicalServices).toHaveLength(9);
    expect(addons).toHaveLength(13);
    expect(new Set(services.map((s) => s.id)).size).toBe(22);
    expect(new Set(services.map((s) => s.slug)).size).toBe(22);
    expect(new Set(addons.map((a) => a.id)).size).toBe(13);
  });

  it("excludes all retired services (S16, S20) and retired add-ons (A04, A05, A07, A08, A12, A16, A20, A21)", () => {
    const activeServiceIds = new Set(services.map((s) => s.id));
    for (const retired of RETIRED_SERVICE_IDS) {
      expect(activeServiceIds.has(retired)).toBe(false);
      expect(resolveProvisionableServiceId(retired)).toBeUndefined();
    }

    const activeAddonIds = new Set(addons.map((a) => a.id));
    for (const retired of RETIRED_ADDON_IDS) {
      expect(activeAddonIds.has(retired)).toBe(false);
    }
  });

  it("keeps Web Application (S08) and PWA (S09) distinct and all offers quote_required", () => {
    expect(services.find((s) => s.id === "S08")?.name).toBe("Web Application Development");
    expect(services.find((s) => s.id === "S09")?.name).toBe("Progressive Web App Development");
    expect(services.every((s) => s.salesMode === "quote_required")).toBe(true);
    expect(services.every((s) => s.approvedForCheckout === false)).toBe(true);
    expect(services.every((s) => s.startingPriceMinor === s.startingPriceBdt * 100)).toBe(true);
  });

  it("enforces exact v5 add-on compatibility and integer minor-unit Starting From math", () => {
    expect(isCompatibleAddon("S05", "A06")).toBe(true);
    expect(isCompatibleAddon("S05", "A17")).toBe(true);
    expect(isCompatibleAddon("S01", "A06")).toBe(false);
    expect(isCompatibleAddon("S07", "A01")).toBe(false);
    expect(isCompatibleAddon("S10", "A09")).toBe(true);
    expect(isCompatibleAddon("S02", "A09")).toBe(false);

    // Deduplicates duplicate add-ons and ignores incompatible ones
    const est = calculateStartingEstimateBdt("S05", ["A06", "A06", "A17", "A09"]);
    expect(est).not.toBeNull();
    expect(est?.baseBdt).toBe(7890);
    expect(est?.addonsBdt).toBe(1990 + 2500);
    expect(est?.totalBdt).toBe(7890 + 1990 + 2500);
    expect(est?.totalMinor).toBe((7890 + 1990 + 2500) * 100);
  });

  it("preserves historical SVC-* legacy aliases for existing orders/projects while archiving BDT 999 campaign", () => {
    expect(legacyServiceAliases).toHaveLength(12);
    expect(resolveProvisionableServiceId("SVC-01-SPW")).toBe("SVC-01-SPW");
    expect(resolveProvisionableServiceId("S08")).toBe("S08");
    expect(resolveServiceLabel("SVC-06-WAP").isLegacy).toBe(true);
    expect(resolveServiceLabel("S08").isLegacy).toBe(false);
    expect(singlePagePromotion.amount).toBe(999);
    expect(singlePagePromotion.archived).toBe(true);
    expect(singlePagePromotion.publicVisible).toBe(false);
    expect(singlePagePromotion.approvedForCheckout).toBe(false);
  });

  it("defines 3 NRE PULSE plans (billing disabled) and 7 coverage modules M01-M07", () => {
    expect(pulsePlans).toHaveLength(3);
    expect(pulsePlans.map((p) => p.code)).toEqual(["FLEX", "CORE", "PRIME"]);
    expect(pulsePlans.every((p) => p.billingEnabled === false)).toBe(true);
    expect(pulsePlans.every((p) => p.monthlyPricingStatus === "founder_approved_starting_from")).toBe(true);
    expect(pulsePlans.map((p) => p.proposedMonthlyPriceBdt)).toEqual([9990, 16990, 39990]);
    expect(pulsePlans.every((p) => p.proposedMonthlyPriceMinor === p.proposedMonthlyPriceBdt * 100)).toBe(true);
    expect(pulseCoverageModules).toHaveLength(7);
    expect(pulseCoverageModules.map((m) => m.id)).toEqual(["M01", "M02", "M03", "M04", "M05", "M06", "M07"]);
  });
});
