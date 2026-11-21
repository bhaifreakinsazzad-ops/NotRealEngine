import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { runLabTool } from "@/lib/lab-tools";
import { POST as runLabApi } from "@/app/api/lab/run/route";

describe("NRE LAB deterministic tools", () => {
  it("computes Starting From scope estimate for v5 service and compatible add-ons", () => {
    const out = runLabTool({
      tool: "scope_estimator",
      serviceId: "S02",
      addonIds: ["A01", "A03"],
      businessName: "Dhaka Dental Clinic",
      goalSummary: "Modern business website with appointment leads",
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.recommendedServiceId).toBe("S02");
      expect(out.result.startingPriceLabel).toContain("8,490"); // 5500 + 1500 + 1490
      expect(out.result.markdown).toContain("Dhaka Dental Clinic");
    }
  });

  it("rejects retired services and incompatible add-ons in scope estimator", () => {
    const retired = runLabTool({
      tool: "scope_estimator",
      serviceId: "S16",
      addonIds: [],
      businessName: "",
      goalSummary: "",
    });
    expect(retired.ok).toBe(false);

    const incompat = runLabTool({
      tool: "scope_estimator",
      serviceId: "S01",
      addonIds: ["A09"],
      businessName: "",
      goalSummary: "",
    });
    expect(incompat.ok).toBe(false);
  });

  it("scores launch readiness honestly from user-verified checkboxes", () => {
    const out = runLabTool({
      tool: "launch_readiness",
      siteUrl: "example.com",
      checks: {
        hasCustomDomainSsl: false,
        mobileResponsiveVerified: true,
        clearPrimaryCta: true,
        seoMetadataReady: true,
        fastCoreLoad: true,
        backupAndSecurityPlan: false,
        banglaOrTargetCopyReady: true,
        contactAndTrackingTested: true,
      },
    });

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result.title).toContain("75/100");
      expect(out.result.recommendedServiceId).toBe("S15");
    }
  });

  it("generates landing page blueprint and App vs PWA recommendation", () => {
    const bp = runLabTool({
      tool: "landing_blueprint",
      businessName: "KnitWear BD",
      targetAudience: "Export buyers",
      coreOffer: "Custom apparel sourcing",
      language: "bilingual",
      primaryCta: "Request Catalog",
    });
    expect(bp.ok).toBe(true);
    if (bp.ok) {
      expect(bp.result.recommendedServiceId).toBe("S03");
      expect(bp.result.markdown).toContain("A14 Multi-Language");
    }

    const pwa = runLabTool({
      tool: "app_vs_pwa",
      needsOfflineUse: true,
      needsAppStorePresence: false,
      needsNativeDeviceApis: false,
      primaryAudience: "web_and_mobile",
      budgetPriority: "lean_launch",
    });
    expect(pwa.ok).toBe(true);
    if (pwa.ok) {
      expect(pwa.result.recommendedServiceId).toBe("S09");
    }
  });

  it("validates payloads and serves deterministic output via POST /api/lab/run", async () => {
    const okReq = new NextRequest("http://localhost:3000/api/lab/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "198.51.100.88",
      },
      body: JSON.stringify({
        tool: "scope_estimator",
        serviceId: "S03",
        addonIds: ["A03"],
        businessName: "Test Co",
      }),
    });
    const okRes = await runLabApi(okReq);
    expect(okRes.status).toBe(200);
    const data = await okRes.json();
    expect(data.engine).toBe("deterministic-rules-v1");
    expect(data.recommendedServiceId).toBe("S03");

    const badReq = new NextRequest("http://localhost:3000/api/lab/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "198.51.100.89",
      },
      body: JSON.stringify({ tool: "unknown_tool" }),
    });
    const badRes = await runLabApi(badReq);
    expect(badRes.status).toBe(400);
  });
});
