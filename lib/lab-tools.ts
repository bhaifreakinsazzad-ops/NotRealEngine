import { z } from "zod";
import {
  calculateStartingEstimateBdt,
  formatBdt,
  formatStartingFromBdt,
  isCompatibleAddon,
  isRetiredAddonId,
  isRetiredServiceId,
  serviceById,
} from "@/lib/catalog";

export const labToolSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("scope_estimator"),
    serviceId: z.string().trim().min(2).max(16),
    addonIds: z.array(z.string().trim().min(2).max(16)).max(15).default([]),
    businessName: z.string().trim().max(120).default(""),
    goalSummary: z.string().trim().max(400).default(""),
  }),
  z.object({
    tool: z.literal("launch_readiness"),
    siteUrl: z.string().trim().max(240).default(""),
    checks: z.object({
      hasCustomDomainSsl: z.boolean(),
      mobileResponsiveVerified: z.boolean(),
      clearPrimaryCta: z.boolean(),
      seoMetadataReady: z.boolean(),
      fastCoreLoad: z.boolean(),
      backupAndSecurityPlan: z.boolean(),
      banglaOrTargetCopyReady: z.boolean(),
      contactAndTrackingTested: z.boolean(),
    }),
  }),
  z.object({
    tool: z.literal("landing_blueprint"),
    businessName: z.string().trim().min(2).max(120),
    targetAudience: z.string().trim().min(3).max(200),
    coreOffer: z.string().trim().min(5).max(300),
    language: z.enum(["en", "bn", "bilingual"]).default("en"),
    primaryCta: z.string().trim().max(80).default("Request a Quote"),
  }),
  z.object({
    tool: z.literal("app_vs_pwa"),
    needsOfflineUse: z.boolean(),
    needsAppStorePresence: z.boolean(),
    needsNativeDeviceApis: z.boolean(),
    primaryAudience: z.enum(["android_first", "ios_first", "both_mobile", "web_and_mobile"]),
    budgetPriority: z.enum(["lean_launch", "balanced", "native_investment"]),
  }),
]);

export type LabToolInput = z.infer<typeof labToolSchema>;

export interface LabToolResult {
  tool: LabToolInput["tool"];
  engine: "deterministic-rules-v1";
  title: string;
  summary: string;
  recommendedServiceId: string;
  recommendedServiceName: string;
  startingPriceLabel: string;
  highlights: string[];
  markdown: string;
}

function sanitizeText(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, " ").trim();
}

export function runLabTool(input: LabToolInput): { ok: true; result: LabToolResult } | { ok: false; error: string } {
  if (input.tool === "scope_estimator") {
    if (isRetiredServiceId(input.serviceId)) {
      return { ok: false, error: `Service ${input.serviceId} is retired and unavailable in Catalog v5.` };
    }
    const service = serviceById(input.serviceId);
    if (!service) {
      return { ok: false, error: "Selected service does not exist in Canonical Catalog v5." };
    }
    const uniqueAddons = Array.from(new Set(input.addonIds));
    for (const addonId of uniqueAddons) {
      if (isRetiredAddonId(addonId)) {
        return { ok: false, error: `Add-on ${addonId} is retired.` };
      }
      if (!isCompatibleAddon(service.id, addonId)) {
        return { ok: false, error: `Add-on ${addonId} is not compatible with ${service.id} (${service.name}).` };
      }
    }

    const estimate = calculateStartingEstimateBdt(service.id, uniqueAddons)!;
    const biz = sanitizeText(input.businessName) || "Your Business";
    const goal = sanitizeText(input.goalSummary) || "Launch a reliable digital platform with clear written scope.";

    const highlights = [
      `Base Service: ${service.id} ${service.name} (${formatStartingFromBdt(estimate.baseBdt)})`,
      `Compatible Add-ons: ${estimate.validAddons.length} selected (+${formatBdt(estimate.addonsBdt)})`,
      `Indicative Launch Total: ${formatStartingFromBdt(estimate.totalBdt)} (non-binding until formal quotation)`,
      `Typical Delivery Window: ${service.timelineRange}`,
    ];
    if (service.scopeCaveat) {
      highlights.push(`Scope Caveat: ${service.scopeCaveat}`);
    }

    const markdown = [
      `# Scope & Starting From Estimate — ${biz}`,
      "",
      `- **Canonical Service:** ${service.id} — ${service.name} (${service.segment === "standalone" ? "Standalone" : "Core Technical"})`,
      `- **Base Launch Baseline:** ${formatStartingFromBdt(estimate.baseBdt)}`,
      `- **Selected Compatible Add-ons:** ${
        estimate.validAddons.length > 0
          ? estimate.validAddons.map((a) => `${a.id} ${a.name} (${formatStartingFromBdt(a.startingPriceBdt)})`).join(", ")
          : "None"
      }`,
      `- **Combined Indicative Baseline:** ${formatStartingFromBdt(estimate.totalBdt)}`,
      `- **Typical Timeline:** ${service.timelineRange}`,
      "",
      "## Business Objective",
      goal,
      "",
      "## Core Deliverables Included",
      ...service.included.map((d) => `- ${d}`),
      ...(service.scopeCaveat ? ["", `> **Scope Note:** ${service.scopeCaveat}`] : []),
      "",
      "---",
      "Generated via NRE LAB (Deterministic Catalog v5 Rules). Non-binding Starting From estimate; final pricing requires human review and written quotation.",
    ].join("\n");

    return {
      ok: true,
      result: {
        tool: "scope_estimator",
        engine: "deterministic-rules-v1",
        title: `${service.id} — ${service.name} Blueprint`,
        summary: `Indicative baseline ${formatStartingFromBdt(estimate.totalBdt)} across ${estimate.validAddons.length} compatible add-on(s).`,
        recommendedServiceId: service.id,
        recommendedServiceName: service.name,
        startingPriceLabel: formatStartingFromBdt(estimate.totalBdt),
        highlights,
        markdown,
      },
    };
  }

  if (input.tool === "launch_readiness") {
    const items: Array<[keyof typeof input.checks, string, string]> = [
      ["hasCustomDomainSsl", "Custom domain, DNS & HTTPS/SSL verified", "S15 Domain & Hosting Setup"],
      ["mobileResponsiveVerified", "Mobile layout verified down to 320px width", "S18 Website Redesign / A13 Responsive Optimization"],
      ["clearPrimaryCta", "Single clear headline & primary call-to-action above the fold", "S03 Landing Page / S17 UI/UX Design"],
      ["seoMetadataReady", "Title, meta description, OpenGraph & structured schema configured", "S24 SEO & AEO Optimization"],
      ["fastCoreLoad", "Optimized media and fast initial page paint", "S21 Bug Fixing / S18 Website Redesign"],
      ["backupAndSecurityPlan", "Automated backups & security headers maintained", "NRE PULSE (M03 Security & M04 Backups)"],
      ["banglaOrTargetCopyReady", "Final English/Bangla copy proofread without placeholders", "A14 Multi-Language Setup"],
      ["contactAndTrackingTested", "Forms, WhatsApp links & inquiry notifications tested end-to-end", "A03 Forms & Lead Capture"],
    ];

    const passed = items.filter(([key]) => input.checks[key]);
    const missing = items.filter(([key]) => !input.checks[key]);
    const score = Math.round((passed.length / items.length) * 100);

    let recommendedServiceId = "S24";
    if (!input.checks.hasCustomDomainSsl) recommendedServiceId = "S15";
    else if (!input.checks.mobileResponsiveVerified || !input.checks.clearPrimaryCta) recommendedServiceId = "S18";
    else if (!input.checks.contactAndTrackingTested || !input.checks.fastCoreLoad) recommendedServiceId = "S21";
    else if (!input.checks.seoMetadataReady) recommendedServiceId = "S24";

    const svc = serviceById(recommendedServiceId)!;
    const targetUrl = sanitizeText(input.siteUrl) || "Your Website";

    const markdown = [
      `# Website & Launch Readiness Report — ${targetUrl}`,
      "",
      `- **Readiness Score:** ${score}/100 (${passed.length} of ${items.length} checks verified by you)`,
      `- **Suggested Next Step:** ${svc.id} — ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})`,
      "",
      "## Verified Checks",
      ...(passed.length > 0 ? passed.map(([, label]) => `- [x] ${label}`) : ["- None verified yet"]),
      "",
      "## Action Items Before Launch",
      ...(missing.length > 0
        ? missing.map(([, label, fix]) => `- [ ] ${label} — *Suggested remediation: ${fix}*`)
        : ["- All 8 core checks verified! Consider NRE PULSE for ongoing post-launch backups & security monitoring."]),
    ].join("\n");

    return {
      ok: true,
      result: {
        tool: "launch_readiness",
        engine: "deterministic-rules-v1",
        title: `Readiness Score: ${score}/100`,
        summary:
          missing.length === 0
            ? "All 8 launch fundamentals are checked. You are in strong shape for go-live and ongoing NRE PULSE maintenance."
            : `${missing.length} priority gap(s) identified before launch.`,
        recommendedServiceId: svc.id,
        recommendedServiceName: svc.name,
        startingPriceLabel: formatStartingFromBdt(svc.startingPriceBdt),
        highlights: [
          `Verified: ${passed.length}/${items.length} launch checks`,
          missing.length > 0 ? `Top gap: ${missing[0][1]}` : "Zero critical pre-launch gaps flagged",
          `Recommended canonical service: ${svc.id} ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})`,
        ],
        markdown,
      },
    };
  }

  if (input.tool === "landing_blueprint") {
    const biz = sanitizeText(input.businessName);
    const audience = sanitizeText(input.targetAudience);
    const offer = sanitizeText(input.coreOffer);
    const cta = sanitizeText(input.primaryCta) || "Request a Quote";
    const svc = serviceById("S03")!;
    const bilingualNote =
      input.language === "bilingual"
        ? "Pair with A14 Multi-Language Website Setup (+Starting From ৳2,500) for synchronized English + Bangla sections."
        : input.language === "bn"
          ? "Use Noto Sans Bengali with generous line-height (1.65) and clear Bengali action verbs."
          : "Use Inter for crisp hierarchy and tabular numerals for pricing.";

    const markdown = [
      `# Landing Page Blueprint — ${biz}`,
      "",
      `- **Target Audience:** ${audience}`,
      `- **Core Offer:** ${offer}`,
      `- **Language Strategy:** ${input.language.toUpperCase()} (${bilingualNote})`,
      `- **Recommended Build:** ${svc.id} — ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})`,
      "",
      "## Section 1: Above-the-Fold Hero",
      `- **Headline:** Clear outcome statement for ${audience}`,
      `- **Subheadline:** Explain how ${biz} delivers "${offer}" without jargon.`,
      `- **Primary CTA:** ${cta}`,
      "- **Visual:** Clean product screenshot, workflow diagram, or authentic operational preview.",
      "",
      "## Section 2: Problem & Solution Clarity",
      `- Contrast what slows down ${audience} today against your structured process.`,
      "",
      "## Section 3: What Is Included (Scope Transparency)",
      "- Present 3–5 concrete deliverables and honest Starting From pricing or qualification criteria.",
      "",
      "## Section 4: Proof & Risk Reversal",
      "- Include real verifiable credentials, workflow milestones, and direct WhatsApp/inquiry contact.",
      "",
      "## Section 5: Focused Conversion Block",
      `- Repeat **${cta}** with a short 3–4 field validated inquiry form (compatible add-on: A03 Forms & Lead Capture).`,
    ].join("\n");

    return {
      ok: true,
      result: {
        tool: "landing_blueprint",
        engine: "deterministic-rules-v1",
        title: `5-Section Blueprint for ${biz}`,
        summary: `Conversion-structured outline for ${audience}, aligned with ${svc.id} (${formatStartingFromBdt(svc.startingPriceBdt)}).`,
        recommendedServiceId: svc.id,
        recommendedServiceName: svc.name,
        startingPriceLabel: formatStartingFromBdt(svc.startingPriceBdt),
        highlights: [
          "5 focused conversion sections (Hero -> Problem -> Deliverables -> Proof -> CTA)",
          bilingualNote,
          `Recommended build: ${svc.id} ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})`,
        ],
        markdown,
      },
    };
  }

  // app_vs_pwa advisor
  let recommendedId = "S08";
  let rationale =
    "A browser-based Web Application (S08) delivers custom workflows without app-store approval delays.";

  if (input.needsNativeDeviceApis || (input.needsAppStorePresence && input.budgetPriority === "native_investment")) {
    if (input.primaryAudience === "ios_first") {
      recommendedId = "S11";
      rationale =
        "Native device APIs and an iOS-first audience point directly to iOS App Development (S11), optionally paired with A09 App Store Publishing.";
    } else {
      recommendedId = "S10";
      rationale =
        "Native hardware access and Play Store distribution point to Android App Development (S10), optionally paired with A09 Play Store Publishing (and S11 if iOS is also required).";
    }
  } else if (input.needsOfflineUse || input.budgetPriority === "lean_launch") {
    recommendedId = "S09";
    rationale =
      "Progressive Web App Development (S09) gives users home-screen installability, mobile-first ergonomics, and safe offline fallback at lower launch cost than dual native apps.";
  }

  const svc = serviceById(recommendedId)!;
  const markdown = [
    "# Architecture Decision Brief: Web App vs PWA vs Native Mobile",
    "",
    `- **Recommended Path:** ${svc.id} — ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})`,
    `- **Why:** ${rationale}`,
    "",
    "## Inputs Evaluated",
    `- Offline resilience needed: ${input.needsOfflineUse ? "Yes" : "No"}`,
    `- App Store / Play Store listing required: ${input.needsAppStorePresence ? "Yes" : "No"}`,
    `- Deep native device APIs (Bluetooth/biometrics/background GPS): ${input.needsNativeDeviceApis ? "Yes" : "No"}`,
    `- Primary audience: ${input.primaryAudience}`,
    `- Budget priority: ${input.budgetPriority}`,
    "",
    "## Practical Comparison (Canonical Catalog v5)",
    "- **S08 Web Application (Starting From ৳9,500):** Fastest iteration for browser-based portals and operational software.",
    "- **S09 Progressive Web App (Starting From ৳12,500):** Installable standalone mobile experience + offline shell without store gatekeepers.",
    "- **S10 Android App (Starting From ৳18,500) / S11 iOS App (Starting From ৳22,500):** Dedicated store-distributed mobile builds when native APIs or store presence are essential.",
  ].join("\n");

  return {
    ok: true,
    result: {
      tool: "app_vs_pwa",
      engine: "deterministic-rules-v1",
      title: `Recommended: ${svc.id} — ${svc.name}`,
      summary: rationale,
      recommendedServiceId: svc.id,
      recommendedServiceName: svc.name,
      startingPriceLabel: formatStartingFromBdt(svc.startingPriceBdt),
      highlights: [
        `Best match: ${svc.id} ${svc.name}`,
        `Launch baseline: ${formatStartingFromBdt(svc.startingPriceBdt)}`,
        svc.addons.length > 0
          ? `Key compatible add-ons: ${svc.addons.slice(0, 3).map((a) => `${a.id} ${a.label}`).join(", ")}`
          : "Scoped directly via written quotation",
      ],
      markdown,
    },
  };
}
