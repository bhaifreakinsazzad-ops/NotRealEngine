/**
 * NotRealEngine — Canonical Branded Launch Master Catalog v5 (2026-11-21)
 * Authoritative source: NotRealEngine_Official_Branded_Launch_Master_Catalog_v5_2026-11-21
 * & NRE_GitHub_Source_Reuse_Migration_Manifest_2026-11-21.json
 *
 * Commercial governance:
 * - All public BDT prices are `Starting From` launch estimates only (`quote_required`).
 * - Direct checkout and recurring billing remain OFF until explicit founder approval
 *   and verified payment provider configuration.
 * - Retired IDs (S16, S20, A04, A05, A07, A08, A12, A16, A20, A21) are excluded from
 *   active public catalogs and validated out on intake.
 * - Legacy SVC-* records are preserved solely in the archival alias layer so existing
 *   orders, quotes, project briefs, and historical projects remain readable.
 */

export type ServiceSegment = "standalone" | "core_technical";

export type CatalogSalesMode = "quote_required";

export interface CanonicalServiceV5 {
  readonly id: string;
  readonly slug: string;
  readonly segment: ServiceSegment;
  readonly category: string;
  readonly name: string;
  readonly shortLabel: string;
  readonly summary: string;
  readonly idealFor: string;
  readonly startingPriceBdt: number;
  readonly startingPriceMinor: number; // paisa (integer minor units)
  readonly currency: "BDT";
  readonly priceLabelPrefix: "Starting From";
  readonly pricingModel: "starting_from_quote";
  readonly salesMode: CatalogSalesMode;
  readonly approvedForCheckout: false;
  readonly compatibleAddonIds: readonly string[];
  readonly deliverables: readonly string[];
  readonly timelineRange: string;
  readonly scopeCaveat?: string;
  readonly legacyIds: readonly string[];
  readonly displayOrder: number;
}

export interface CanonicalAddonV5 {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly summary: string;
  readonly startingPriceBdt: number;
  readonly startingPriceMinor: number;
  readonly currency: "BDT";
  readonly priceLabelPrefix: "Starting From";
  readonly compatibleServiceIds: readonly string[];
  readonly note?: string;
}

export interface LegacyServiceAlias {
  readonly legacyId: string;
  readonly legacySlug: string;
  readonly legacyName: string;
  readonly v5ServiceIds: readonly string[];
  readonly relationship: "direct" | "partial_split" | "archived_campaign";
  readonly notes: string;
}

export interface PulseCoverageModule {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
}

export interface PulsePlan {
  readonly id: "PULSE_FLEX" | "PULSE_CORE" | "PULSE_PRIME";
  readonly code: "FLEX" | "CORE" | "PRIME";
  readonly name: string;
  readonly audience: string;
  readonly summary: string;
  readonly weeklyStartingPriceBdt: number;
  readonly weeklyStartingPriceMinor: number;
  readonly weeklyPricingStatus: "founder_directed_starting_from";
  /** Historical field name; this amount was approved by the founder on 2026-11-21. */
  readonly proposedMonthlyPriceBdt: number;
  readonly proposedMonthlyPriceMinor: number;
  readonly monthlyPricingStatus: "founder_approved_starting_from";
  readonly billingEnabled: false;
  readonly eligibilityNote: string;
  readonly coverageFocus: readonly string[];
}

export const RETIRED_SERVICE_IDS = ["S16", "S20"] as const;
export const RETIRED_ADDON_IDS = [
  "A04",
  "A05",
  "A07",
  "A08",
  "A12",
  "A16",
  "A20",
  "A21",
] as const;

export const CATALOG_V5_VERSION = "2026-11-21-v5";

export const canonicalServicesV5: readonly CanonicalServiceV5[] = [
  // =========================================================================
  // 13 STANDALONE SERVICES (S01 – S13)
  // =========================================================================
  {
    id: "S01",
    slug: "mini-website",
    segment: "standalone",
    category: "Web Presence",
    name: "Mini Website",
    shortLabel: "Mini Website",
    summary:
      "Compact, fast-loading brand presence for founders, professionals, and early-stage ventures needing clarity without sprawl.",
    idealFor: "Solo founders, local clinics, studios, and personal portfolios launching fast.",
    startingPriceBdt: 4780,
    startingPriceMinor: 478000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A14", "A15", "A19"],
    deliverables: [
      "Responsive core brand pages with mobile-first layout",
      "Direct WhatsApp, phone, and inquiry contact routing",
      "Clean on-page SEO metadata and fast asset delivery",
      "Production deployment readiness checklist",
    ],
    timelineRange: "4–7 business days",
    legacyIds: ["SVC-02-MIN"],
    displayOrder: 1,
  },
  {
    id: "S02",
    slug: "business-website",
    segment: "standalone",
    category: "Web Presence",
    name: "Business Website",
    shortLabel: "Business Website",
    summary:
      "Structured multi-page company website engineered for brand authority, service clarity, and measurable lead capture.",
    idealFor: "Growing companies, agencies, consultancies, and regional brands.",
    startingPriceBdt: 5500,
    startingPriceMinor: 550000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A01", "A02", "A03", "A10", "A13", "A14", "A15", "A18", "A19"],
    deliverables: [
      "Multi-page information architecture and service hierarchy",
      "Lead intake form with clear conversion path",
      "Performance-tuned responsive build across 320px–1440px+",
      "Baseline SEO metadata, OpenGraph tags, and sitemap",
    ],
    timelineRange: "1–2 weeks",
    legacyIds: ["SVC-03-BIZ"],
    displayOrder: 2,
  },
  {
    id: "S03",
    slug: "landing-page-development",
    segment: "standalone",
    category: "Conversion & Growth",
    name: "Landing Page Development",
    shortLabel: "Landing Page",
    summary:
      "Focused single-objective conversion page built for product launches, ad campaigns, waitlists, or lead generation.",
    idealFor: "Campaigns, offer validation, event registrations, and paid acquisition.",
    startingPriceBdt: 2999,
    startingPriceMinor: 299900,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A13", "A14", "A15", "A19"],
    deliverables: [
      "Focused conversion hierarchy with clear hero and CTA flow",
      "Fast mobile layout optimized for campaign traffic",
      "Lead form or direct inquiry trigger",
      "Clean analytics-ready event hooks",
    ],
    timelineRange: "3–5 business days",
    legacyIds: [],
    displayOrder: 3,
  },
  {
    id: "S04",
    slug: "sales-funnel-development",
    segment: "standalone",
    category: "Conversion & Growth",
    name: "Sales Funnel Development",
    shortLabel: "Sales Funnel",
    summary:
      "Multi-step acquisition journey combining offer positioning, qualification steps, and conversion follow-through.",
    idealFor: "High-intent offers, service bookings, coaching, and B2B lead qualification.",
    startingPriceBdt: 3999,
    startingPriceMinor: 399900,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A15"],
    deliverables: [
      "Multi-step offer, qualification, and confirmation flow",
      "Structured lead capture routed into your CRM or workspace",
      "Conversion-focused copy blocks and proof structure",
      "End-to-end funnel QA before launch",
    ],
    timelineRange: "5–10 business days",
    legacyIds: ["SVC-04-FUN"],
    displayOrder: 4,
  },
  {
    id: "S05",
    slug: "ecommerce-website-development",
    segment: "standalone",
    category: "Commerce",
    name: "E-commerce Website Development",
    shortLabel: "E-commerce",
    summary:
      "Complete online storefront with structured catalog, cart, order workflow, and store management foundations.",
    idealFor: "Retail brands, D2C merchants, and multi-SKU local or cross-border stores.",
    startingPriceBdt: 7890,
    startingPriceMinor: 789000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A06", "A10", "A13", "A14", "A15", "A17", "A18", "A19"],
    deliverables: [
      "Category, product detail, cart, and order intake flow",
      "Inventory and order status structure for operations",
      "Mobile-first shopping ergonomics for Bangladesh & global buyers",
      "Ready for verified courier and payment gateway integrations",
    ],
    timelineRange: "2–3 weeks",
    legacyIds: ["SVC-05-EFC"],
    displayOrder: 5,
  },
  {
    id: "S06",
    slug: "client-portal-development",
    segment: "standalone",
    category: "Portals & Operations",
    name: "Client Portal Development",
    shortLabel: "Client Portal",
    summary:
      "Authenticated workspace where your clients track milestones, exchange files, approve deliverables, and submit requests.",
    idealFor: "Agencies, law/accounting firms, B2B service providers, and consultancies.",
    startingPriceBdt: 8500,
    startingPriceMinor: 850000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A10", "A13", "A14", "A15"],
    deliverables: [
      "Role-isolated client login and organization scoping",
      "Project status, milestone approvals, and file exchange",
      "Structured request and support intake inside the portal",
      "Audit-friendly activity history",
    ],
    timelineRange: "2–4 weeks",
    legacyIds: ["SVC-12-BCP"],
    displayOrder: 6,
  },
  {
    id: "S07",
    slug: "business-dashboard-development",
    segment: "standalone",
    category: "Portals & Operations",
    name: "Business Dashboard Development",
    shortLabel: "Business Dashboard",
    summary:
      "Focused operational dashboard turning sales, pipeline, inventory, or delivery data into clear decision views.",
    idealFor: "Founders and operations leads replacing scattered spreadsheets.",
    startingPriceBdt: 4500,
    startingPriceMinor: 450000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "Structured KPI views, filterable tables, and status boards",
      "Role-aware data access backed by clean queries",
      "Export-friendly operational summaries",
      "Responsive desktop and tablet usability",
    ],
    timelineRange: "1–3 weeks",
    legacyIds: ["SVC-11-BMS"],
    displayOrder: 7,
  },
  {
    id: "S08",
    slug: "web-application-development",
    segment: "standalone",
    category: "Web & App Engineering",
    name: "Web Application Development",
    shortLabel: "Web Application",
    summary:
      "Custom browser-based software with tailored business logic, accounts, workflows, and database architecture.",
    idealFor: "Businesses automating core workflows or launching bespoke web platforms.",
    startingPriceBdt: 9500,
    startingPriceMinor: 950000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A10", "A11", "A13", "A14", "A15", "A18", "A19"],
    deliverables: [
      "Custom domain data model and authenticated user flows",
      "Server-validated API routes and role-based permissions",
      "Modular full-stack web architecture built for iteration",
      "Staging handoff and technical documentation",
    ],
    timelineRange: "3–6 weeks",
    legacyIds: ["SVC-06-WAP"],
    displayOrder: 8,
  },
  {
    id: "S09",
    slug: "progressive-web-app-development",
    segment: "standalone",
    category: "Web & App Engineering",
    name: "Progressive Web App Development",
    shortLabel: "Progressive Web App",
    summary:
      "Installable web software with standalone app experience, mobile-first ergonomics, and safe offline resilience.",
    idealFor: "Teams wanting app-like mobile access without separate native store overhead.",
    startingPriceBdt: 12500,
    startingPriceMinor: 1250000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A02", "A03", "A10", "A11", "A13", "A14", "A15", "A18", "A19"],
    deliverables: [
      "Installable Web App Manifest and safe service worker strategy",
      "Standalone mobile UX with offline fallback handling",
      "Full-stack web application foundation with fast repeat loads",
      "Cross-browser installability verification",
    ],
    timelineRange: "3–6 weeks",
    legacyIds: ["SVC-07-PWA"],
    displayOrder: 9,
  },
  {
    id: "S10",
    slug: "android-app-development",
    segment: "standalone",
    category: "Mobile Applications",
    name: "Android App Development",
    shortLabel: "Android App",
    summary:
      "Dedicated Android mobile application engineered for reliable device performance and clean API integration.",
    idealFor: "Customer-facing mobile products, field ops, and Bangladesh Android-first audiences.",
    startingPriceBdt: 18500,
    startingPriceMinor: 1850000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A09", "A10", "A11"],
    deliverables: [
      "Production Android app build with structured navigation",
      "Secure backend API integration and session handling",
      "Device responsiveness across common Android screen sizes",
      "Release bundle prepared for Play Console review",
    ],
    timelineRange: "4–8 weeks",
    legacyIds: ["SVC-08-MOB"],
    displayOrder: 10,
  },
  {
    id: "S11",
    slug: "ios-app-development",
    segment: "standalone",
    category: "Mobile Applications",
    name: "iOS App Development",
    shortLabel: "iOS App",
    summary:
      "Dedicated iOS mobile application designed for Apple Human Interface ergonomics and App Store readiness.",
    idealFor: "Premium consumer apps, executive tools, and iOS-focused markets.",
    startingPriceBdt: 22500,
    startingPriceMinor: 2250000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A09", "A10", "A11"],
    deliverables: [
      "Production iOS build adhering to Apple UX standards",
      "Authenticated API integration and secure storage",
      "TestFlight distribution readiness for client verification",
      "App Store submission package preparation",
    ],
    timelineRange: "4–8 weeks",
    legacyIds: ["SVC-08-MOB"],
    displayOrder: 11,
  },
  {
    id: "S12",
    slug: "custom-business-software-erp",
    segment: "standalone",
    category: "Business Systems",
    name: "Custom Business Software / ERP",
    shortLabel: "Custom Software / ERP",
    summary:
      "Tailored internal software for operational workflows—from compact single-module tools to phased multi-department ERP.",
    idealFor: "Operations teams outgrowing spreadsheets or off-the-shelf SaaS constraints.",
    startingPriceBdt: 5000,
    startingPriceMinor: 500000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A10", "A11"],
    deliverables: [
      "Scoped workflow modules mapped to actual business processes",
      "Role-based permissions and audit trail foundations",
      "Relational data schema engineered for reporting accuracy",
      "Phased rollout plan with written scope boundaries",
    ],
    timelineRange: "2–10 weeks (scope-dependent)",
    scopeCaveat:
      "Starting From ৳5,000 applies to a small, single-purpose custom business utility—not a full multi-module ERP suite. Full ERP builds are scoped and quoted in milestones.",
    legacyIds: ["SVC-09-CSE"],
    displayOrder: 12,
  },
  {
    id: "S13",
    slug: "saas-mvp-development",
    segment: "standalone",
    category: "Web & App Engineering",
    name: "SaaS MVP Development",
    shortLabel: "SaaS MVP",
    summary:
      "Launch-ready multi-tenant software product built to validate market demand, onboard early users, and scale cleanly.",
    idealFor: "Startup founders and product teams shipping v1 software to real customers.",
    startingPriceBdt: 19500,
    startingPriceMinor: 1950000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A10", "A11"],
    deliverables: [
      "Multi-tenant workspace architecture with auth and RBAC",
      "Core differentiating product workflow scoped for launch",
      "Admin oversight and billing-ready data structures",
      "Deployment pipeline and clean repository handoff",
    ],
    timelineRange: "4–8 weeks",
    legacyIds: ["SVC-10-MVP"],
    displayOrder: 13,
  },

  // =========================================================================
  // 9 CORE TECHNICAL SERVICES (S14, S15, S17, S18, S19, S21, S22, S23, S24)
  // (Retired: S16, S20)
  // =========================================================================
  {
    id: "S14",
    slug: "payment-gateway-integration",
    segment: "core_technical",
    category: "Core Technical",
    name: "Payment Gateway Integration",
    shortLabel: "Payment Gateway",
    summary:
      "Server-verified integration of approved payment gateways (SSLCommerz, Stripe, or regional providers) with webhook integrity.",
    idealFor: "Existing stores, SaaS platforms, or booking systems enabling verified payments.",
    startingPriceBdt: 3500,
    startingPriceMinor: 350000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "Server-side checkout session and callback verification",
      "Idempotent webhook processing and payment state logging",
      "Sandbox end-to-end test validation before production switch",
    ],
    timelineRange: "3–7 business days",
    legacyIds: [],
    displayOrder: 14,
  },
  {
    id: "S15",
    slug: "domain-and-hosting-setup",
    segment: "core_technical",
    category: "Core Technical",
    name: "Domain & Hosting Setup",
    shortLabel: "Domain & Hosting",
    summary:
      "Clean DNS, SSL/TLS, custom domain routing, and reliable hosting configuration for new or migrating sites.",
    idealFor: "Businesses launching a site or moving cleanly onto modern cloud hosting.",
    startingPriceBdt: 1500,
    startingPriceMinor: 150000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "DNS record configuration (A, CNAME, MX, SPF/DKIM hygiene)",
      "HTTPS / SSL certificate provisioning and redirect rules",
      "Production environment verification and handoff notes",
    ],
    timelineRange: "1–2 business days",
    legacyIds: [],
    displayOrder: 15,
  },
  {
    id: "S17",
    slug: "ui-ux-design",
    segment: "core_technical",
    category: "Core Technical",
    name: "UI/UX Design",
    shortLabel: "UI/UX Design",
    summary:
      "Conversion-aware interface architecture, design systems, and clickable prototypes ready for engineering handoff.",
    idealFor: "Products and websites needing refined visual hierarchy before or during development.",
    startingPriceBdt: 4990,
    startingPriceMinor: 499000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "User flow mapping and wireframes for core screens",
      "High-fidelity responsive UI mockups (desktop + mobile)",
      "Reusable color, typography, and component specification",
    ],
    timelineRange: "5–10 business days",
    legacyIds: [],
    displayOrder: 16,
  },
  {
    id: "S18",
    slug: "website-redesign-and-revamp",
    segment: "core_technical",
    category: "Core Technical",
    name: "Website Redesign & Revamp",
    shortLabel: "Website Redesign",
    summary:
      "Modernize an outdated site's visual polish, mobile responsiveness, speed, and conversion clarity without losing equity.",
    idealFor: "Established businesses whose current website feels dated or underperforms on mobile.",
    startingPriceBdt: 3500,
    startingPriceMinor: 350000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A01", "A03", "A13", "A14", "A15", "A18", "A19"],
    deliverables: [
      "Audit of existing pages, messaging, and technical bottlenecks",
      "Refreshed responsive visual system and clean page rebuild",
      "URL redirect hygiene to preserve existing search links",
    ],
    timelineRange: "1–2 weeks",
    legacyIds: [],
    displayOrder: 17,
  },
  {
    id: "S19",
    slug: "database-development-and-setup",
    segment: "core_technical",
    category: "Core Technical",
    name: "Database Development & Setup",
    shortLabel: "Database Setup",
    summary:
      "Normalized schema design, row-level security policies, indexing, and migration discipline for reliable production data.",
    idealFor: "Apps and growing systems needing clean relational architecture or Supabase/PostgreSQL hardening.",
    startingPriceBdt: 6990,
    startingPriceMinor: 699000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A10", "A11"],
    deliverables: [
      "Normalized entity-relationship schema and versioned migrations",
      "Access-control policies (RLS) and query index tuning",
      "Backup and recovery readiness documentation",
    ],
    timelineRange: "4–10 business days",
    legacyIds: [],
    displayOrder: 18,
  },
  {
    id: "S21",
    slug: "website-bug-fixing-and-troubleshooting",
    segment: "core_technical",
    category: "Core Technical",
    name: "Website Bug Fixing & Troubleshooting",
    shortLabel: "Bug Fixing",
    summary:
      "Targeted root-cause diagnosis and verified repair for layout regressions, broken forms, API errors, or performance bottlenecks.",
    idealFor: "Teams needing quick, disciplined engineering help on a live or staging site.",
    startingPriceBdt: 1200,
    startingPriceMinor: 120000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "Root-cause investigation and reproducible diagnosis",
      "Clean, tested fix with regression check",
      "Plain-language summary of what broke and how it was resolved",
    ],
    timelineRange: "1–3 business days",
    legacyIds: [],
    displayOrder: 19,
  },
  {
    id: "S22",
    slug: "website-feature-development",
    segment: "core_technical",
    category: "Core Technical",
    name: "Website Feature Development",
    shortLabel: "Feature Development",
    summary:
      "Scoped engineering additions to an existing website—new interactive modules, filters, portals, or workflow integrations.",
    idealFor: "Live sites that need new capabilities without rebuilding from scratch.",
    startingPriceBdt: 2500,
    startingPriceMinor: 250000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A03", "A13", "A18"],
    deliverables: [
      "Scoped technical design compatible with existing stack",
      "Implemented feature with input validation and responsive UI",
      "Verification notes for safe deployment",
    ],
    timelineRange: "3–7 business days",
    legacyIds: [],
    displayOrder: 20,
  },
  {
    id: "S23",
    slug: "custom-admin-panel-development",
    segment: "core_technical",
    category: "Core Technical",
    name: "Custom Admin Panel Development",
    shortLabel: "Custom Admin Panel",
    summary:
      "Dedicated staff operations console for managing content, leads, orders, permissions, and approvals safely.",
    idealFor: "Teams needing tailored back-office control over an existing web app or store.",
    startingPriceBdt: 4400,
    startingPriceMinor: 440000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: ["A10", "A11"],
    deliverables: [
      "Role-protected staff console with structured tables and filters",
      "Server-enforced mutations and audit logging",
      "Clean approval and status workflow controls",
    ],
    timelineRange: "1–3 weeks",
    legacyIds: ["SVC-11-BMS"],
    displayOrder: 21,
  },
  {
    id: "S24",
    slug: "seo-and-aeo-optimization",
    segment: "core_technical",
    category: "Core Technical",
    name: "SEO & AEO Optimization",
    shortLabel: "SEO & AEO",
    summary:
      "Technical search and answer-engine optimization covering semantic markup, structured schema, crawl hygiene, and page speed.",
    idealFor: "Businesses improving discoverability across Google search and AI answer engines.",
    startingPriceBdt: 3200,
    startingPriceMinor: 320000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    pricingModel: "starting_from_quote",
    salesMode: "quote_required",
    approvedForCheckout: false,
    compatibleAddonIds: [],
    deliverables: [
      "Technical SEO audit, metadata cleanup, and crawl/sitemap checks",
      "Structured JSON-LD schema drafted with AI assistance and reviewed by human engineers",
      "Core Web Vitals & semantic heading improvements",
    ],
    timelineRange: "4–7 business days",
    scopeCaveat:
      "Includes AI-assisted structured schema with mandatory human review. Search engine and AI answer rankings cannot be guaranteed.",
    legacyIds: [],
    displayOrder: 22,
  },
] as const;

// =========================================================================
// 13 COMPATIBLE ADD-ONS (A01, A02, A03, A06, A09, A10, A11, A13, A14, A15, A17, A18, A19)
// (Retired: A04, A05, A07, A08, A12, A16, A20, A21)
// =========================================================================
export const canonicalAddonsV5: readonly CanonicalAddonV5[] = [
  {
    id: "A01",
    slug: "extra-website-page",
    name: "Extra Website Page",
    summary: "Add an additional custom-designed responsive page matching your site architecture.",
    startingPriceBdt: 1500,
    startingPriceMinor: 150000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S02", "S18"],
  },
  {
    id: "A02",
    slug: "booking-and-appointment-system",
    name: "Booking & Appointment System",
    summary: "Interactive scheduling, availability slots, and booking confirmation workflow.",
    startingPriceBdt: 1810,
    startingPriceMinor: 181000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S01", "S02", "S03", "S04", "S05", "S06", "S08", "S09"],
  },
  {
    id: "A03",
    slug: "forms-and-lead-capture",
    name: "Forms & Lead Capture",
    summary: "Multi-field validated inquiry forms with spam protection and CRM/email routing.",
    startingPriceBdt: 1490,
    startingPriceMinor: 149000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S01", "S02", "S03", "S04", "S06", "S08", "S09", "S18", "S22"],
  },
  {
    id: "A06",
    slug: "ecommerce-product-upload-catalog-setup",
    name: "E-commerce Product Upload & Catalog Setup",
    summary: "Structured SKU entry, category mapping, variants, and optimized product media setup.",
    startingPriceBdt: 1990,
    startingPriceMinor: 199000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S05"],
  },
  {
    id: "A09",
    slug: "app-store-play-store-publishing",
    name: "App Store / Play Store Publishing",
    summary: "Store listing compliance prep, signing configuration, and submission handoff for Google Play or Apple App Store.",
    startingPriceBdt: 4990,
    startingPriceMinor: 499000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S10", "S11"],
    note: "Client developer account fees are paid directly to Apple/Google.",
  },
  {
    id: "A10",
    slug: "software-testing-and-qa",
    name: "Software Testing & QA",
    summary: "Structured functional, responsive, edge-case, and regression verification suite before launch.",
    startingPriceBdt: 1500,
    startingPriceMinor: 150000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S02", "S05", "S06", "S08", "S09", "S10", "S11", "S12", "S13", "S19", "S23"],
  },
  {
    id: "A11",
    slug: "software-deployment",
    name: "Software Deployment",
    summary: "Production environment configuration, CI/CD wiring, environment hardening, and verified go-live.",
    startingPriceBdt: 1500,
    startingPriceMinor: 150000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S08", "S09", "S10", "S11", "S12", "S13", "S19", "S23"],
  },
  {
    id: "A13",
    slug: "responsive-design-optimization",
    name: "Responsive Design Optimization",
    summary: "Fine-tuned mobile, tablet, and ultra-wide layout polish with 320px overflow and tap-target verification.",
    startingPriceBdt: 1490,
    startingPriceMinor: 149000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S02", "S03", "S05", "S06", "S08", "S09", "S18", "S22"],
  },
  {
    id: "A14",
    slug: "multi-language-website-setup",
    name: "Multi-Language Website Setup",
    summary: "Bilingual or multilingual content structure (including Bangla + English typography and locale switching).",
    startingPriceBdt: 2500,
    startingPriceMinor: 250000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S01", "S02", "S03", "S05", "S06", "S08", "S09", "S18"],
  },
  {
    id: "A15",
    slug: "custom-animation-and-interactive-effects",
    name: "Custom Animation & Interactive Effects",
    summary: "Tasteful, reduced-motion-safe interactive transitions and micro-interactions engineered for smooth frame rates.",
    startingPriceBdt: 2990,
    startingPriceMinor: 299000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S01", "S02", "S03", "S04", "S05", "S06", "S08", "S09", "S18"],
  },
  {
    id: "A17",
    slug: "ecommerce-shipping-and-courier-integration",
    name: "E-commerce Shipping & Courier Integration",
    summary: "Delivery zone rates and courier workflow integration tailored for Bangladesh and regional fulfillment.",
    startingPriceBdt: 2500,
    startingPriceMinor: 250000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S05"],
  },
  {
    id: "A18",
    slug: "customer-login-and-account-system",
    name: "Customer Login & Account System",
    summary: "Authenticated customer accounts, saved profiles, password recovery, and order/history visibility.",
    startingPriceBdt: 2990,
    startingPriceMinor: 299000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S02", "S05", "S08", "S09", "S18", "S22"],
  },
  {
    id: "A19",
    slug: "custom-website-calculator-quotation-tool",
    name: "Custom Website Calculator / Quotation Tool",
    summary: "Interactive scope, ROI, or instant quotation estimator built directly into your site.",
    startingPriceBdt: 4500,
    startingPriceMinor: 450000,
    currency: "BDT",
    priceLabelPrefix: "Starting From",
    compatibleServiceIds: ["S01", "S02", "S03", "S05", "S08", "S09", "S18"],
  },
] as const;

// =========================================================================
// LEGACY SVC-* ARCHIVAL ALIAS MAP (Read-only historical compatibility)
// =========================================================================
export const legacyServiceAliases: readonly LegacyServiceAlias[] = [
  {
    legacyId: "SVC-01-SPW",
    legacySlug: "single-page-website",
    legacyName: "Single Page Website (Legacy Campaign — Archived)",
    v5ServiceIds: ["S03", "S01"],
    relationship: "archived_campaign",
    notes: "Legacy BDT 999 campaign is archived and removed from public discovery; see S03 Landing Page or S01 Mini Website.",
  },
  {
    legacyId: "SVC-02-MIN",
    legacySlug: "mini-website",
    legacyName: "Mini Website",
    v5ServiceIds: ["S01"],
    relationship: "direct",
    notes: "Migrated directly to S01 Mini Website.",
  },
  {
    legacyId: "SVC-03-BIZ",
    legacySlug: "business-website",
    legacyName: "Business Website",
    v5ServiceIds: ["S02"],
    relationship: "direct",
    notes: "Migrated directly to S02 Business Website.",
  },
  {
    legacyId: "SVC-04-FUN",
    legacySlug: "sales-funnel",
    legacyName: "Sales Funnel",
    v5ServiceIds: ["S04"],
    relationship: "direct",
    notes: "Migrated directly to S04 Sales Funnel Development.",
  },
  {
    legacyId: "SVC-05-EFC",
    legacySlug: "ecommerce-website",
    legacyName: "E-Commerce Website",
    v5ServiceIds: ["S05"],
    relationship: "direct",
    notes: "Migrated directly to S05 E-commerce Website Development.",
  },
  {
    legacyId: "SVC-06-WAP",
    legacySlug: "web-application",
    legacyName: "Web Application",
    v5ServiceIds: ["S08"],
    relationship: "direct",
    notes: "Migrated directly to S08 Web Application Development.",
  },
  {
    legacyId: "SVC-07-PWA",
    legacySlug: "progressive-web-app",
    legacyName: "Progressive Web App (PWA)",
    v5ServiceIds: ["S09"],
    relationship: "direct",
    notes: "Migrated directly to S09 Progressive Web App Development.",
  },
  {
    legacyId: "SVC-08-MOB",
    legacySlug: "mobile-application",
    legacyName: "Mobile Application",
    v5ServiceIds: ["S10", "S11"],
    relationship: "partial_split",
    notes: "Split into dedicated S10 Android App Development and S11 iOS App Development.",
  },
  {
    legacyId: "SVC-09-CSE",
    legacySlug: "custom-business-software-erp",
    legacyName: "Custom Business Software / ERP",
    v5ServiceIds: ["S12"],
    relationship: "direct",
    notes: "Migrated to S12 Custom Business Software / ERP with written scope caveat.",
  },
  {
    legacyId: "SVC-10-MVP",
    legacySlug: "saas-mvp",
    legacyName: "SaaS MVP",
    v5ServiceIds: ["S13"],
    relationship: "direct",
    notes: "Migrated directly to S13 SaaS MVP Development.",
  },
  {
    legacyId: "SVC-11-BMS",
    legacySlug: "business-management-system",
    legacyName: "Business Management System / Admin",
    v5ServiceIds: ["S07", "S23"],
    relationship: "partial_split",
    notes: "Split into S07 Business Dashboard Development and S23 Custom Admin Panel Development.",
  },
  {
    legacyId: "SVC-12-BCP",
    legacySlug: "branded-client-portal",
    legacyName: "Branded Client Portal",
    v5ServiceIds: ["S06"],
    relationship: "direct",
    notes: "Migrated directly to S06 Client Portal Development.",
  },
] as const;

// =========================================================================
// NRE PULSE — TECHNICAL CARE (3 Plans + 7 Coverage Modules M01 – M07)
// =========================================================================
export const pulsePositioning = {
  tagline: "Human-led · Expert-backed · AI-assisted",
  requestIntakeClarification:
    "24/7 availability applies to digital request submission and live ticket status tracking inside NRE OFFICE — not 24/7 live human engineering.",
  scopeClarification:
    "Plans do not impose rigid hour buckets or arbitrary system counts, and they are not unlimited. Every active plan operates under a written scope schedule agreed before activation.",
  billingStatus: "disabled_pending_approval" as const,
};

export const pulseCoverageModules: readonly PulseCoverageModule[] = [
  {
    id: "M01",
    name: "Website Maintenance & Support",
    summary: "Routine framework hygiene, dependency updates, broken-link checks, and production health verification.",
  },
  {
    id: "M02",
    name: "Database Management",
    summary: "Schema monitoring, query health reviews, migration supervision, and storage/performance hygiene.",
  },
  {
    id: "M03",
    name: "Website Security Monitoring & Maintenance",
    summary: "Security header checks, dependency vulnerability triage, access-control review, and incident response.",
  },
  {
    id: "M04",
    name: "Automated Backup Management",
    summary: "Scheduled backup verification, retention hygiene, and documented restoration drills.",
  },
  {
    id: "M05",
    name: "Website Content Update & Management",
    summary: "Structured copy, banner, pricing, and page updates handled cleanly without breaking layout integrity.",
  },
  {
    id: "M06",
    name: "Mobile App Maintenance & Updates",
    summary: "OS compatibility updates, dependency maintenance, crash triage, and release build support.",
  },
  {
    id: "M07",
    name: "Technical Support & Troubleshooting",
    summary: "Root-cause debugging, third-party integration diagnostics, and human-reviewed operational assistance.",
  },
] as const;

export const pulsePlans: readonly PulsePlan[] = [
  {
    id: "PULSE_FLEX",
    code: "FLEX",
    name: "NRE PULSE — FLEX",
    audience: "Smaller websites, landing systems, and early-stage teams needing dependable baseline care.",
    summary:
      "Structured maintenance, backup oversight, and routine troubleshooting for eligible live properties.",
    weeklyStartingPriceBdt: 2990,
    weeklyStartingPriceMinor: 299000,
    weeklyPricingStatus: "founder_directed_starting_from",
    proposedMonthlyPriceBdt: 9990,
    proposedMonthlyPriceMinor: 999000,
    monthlyPricingStatus: "founder_approved_starting_from",
    billingEnabled: false,
    eligibilityNote:
      "Eligibility review and written scope required before onboarding. Best suited for straightforward sites built or audited by NotRealEngine.",
    coverageFocus: [
      "Core maintenance, backups, and security hygiene (M01, M03, M04)",
      "Structured content & minor troubleshooting requests (M05, M07)",
      "24/7 ticket submission & status visibility in NRE OFFICE",
      "Written scope boundaries with human engineer review",
    ],
  },
  {
    id: "PULSE_CORE",
    code: "CORE",
    name: "NRE PULSE — CORE",
    audience: "Active business websites, e-commerce stores, portals, and web applications in daily operation.",
    summary:
      "Continuous operational stability across frontend, database, security monitoring, and ongoing technical updates.",
    weeklyStartingPriceBdt: 4990,
    weeklyStartingPriceMinor: 499000,
    weeklyPricingStatus: "founder_directed_starting_from",
    proposedMonthlyPriceBdt: 16990,
    proposedMonthlyPriceMinor: 1699000,
    monthlyPricingStatus: "founder_approved_starting_from",
    billingEnabled: false,
    eligibilityNote:
      "Includes initial technical onboarding check and written coverage schedule across agreed properties.",
    coverageFocus: [
      "Full web, database, security, backup & content care (M01–M05)",
      "Priority technical troubleshooting & release hygiene (M07)",
      "Human-led engineering triage with AI-assisted diagnostics",
      "Scheduled health summaries inside NRE OFFICE",
    ],
  },
  {
    id: "PULSE_PRIME",
    code: "PRIME",
    name: "NRE PULSE — PRIME",
    audience: "Revenue-critical platforms, SaaS products, custom business software, and multi-channel web + mobile ecosystems.",
    summary:
      "Highest-tier engineering stewardship spanning web, mobile, database reliability, security posture, and proactive evolution.",
    weeklyStartingPriceBdt: 11990,
    weeklyStartingPriceMinor: 1199000,
    weeklyPricingStatus: "founder_directed_starting_from",
    proposedMonthlyPriceBdt: 39990,
    proposedMonthlyPriceMinor: 3999000,
    monthlyPricingStatus: "founder_approved_starting_from",
    billingEnabled: false,
    eligibilityNote:
      "Dedicated onboarding audit, written SLA/scope schedule, and executive escalation path.",
    coverageFocus: [
      "Complete M01–M07 coverage including Mobile App Maintenance (M06)",
      "Database optimization, security posture & backup verification",
      "Fast-track human engineering escalation during business operations",
      "Quarterly architecture & performance advisory notes",
    ],
  },
] as const;

export function formatBdt(amountBdt: number): string {
  return `৳${amountBdt.toLocaleString("en-US")}`;
}

export function formatStartingFromBdt(amountBdt: number): string {
  return `Starting From ${formatBdt(amountBdt)}`;
}
