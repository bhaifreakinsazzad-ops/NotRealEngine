import { describe, expect, it } from "vitest";
import { categories, services, singlePagePromotion } from "@/lib/catalog";

describe("canonical service architecture", () => {
  it("keeps exactly ten categories and twelve distinct offers", () => {
    expect(categories).toHaveLength(10);
    expect(services).toHaveLength(12);
    expect(new Set(services.map((service) => service.id)).size).toBe(12);
    expect(new Set(services.map((service) => service.categoryId))).toEqual(new Set(categories.map((category) => category.id)));
  });

  it("keeps web applications and PWAs distinct and automation out of the registry", () => {
    expect(services.find((service) => service.id === "SVC-06-WAP")?.name).toBe("Custom Web Application Development");
    expect(services.find((service) => service.id === "SVC-07-PWA")?.name).toBe("PWA Development");
    expect(services.some((service) => /automation/i.test(service.name))).toBe(false);
  });

  it("records but does not activate the BDT 999 promotion", () => {
    expect(singlePagePromotion.amount).toBe(999);
    expect(singlePagePromotion.approvedForCheckout).toBe(false);
  });
});
