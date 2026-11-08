export type ServiceCategory = {
  id: string;
  name: string;
};

export type ServiceOffer = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  summary: string;
  audience: string;
  included: readonly string[];
  addons: readonly { id: string; label: string; requires?: readonly string[]; conflicts?: readonly string[] }[];
  salesMode: "quote_required" | "fixed_checkout" | "configurable_checkout";
};

export const categories = [
  { id: "website-development", name: "Website Development" },
  { id: "sales-funnel-development", name: "Sales Funnel Development" },
  { id: "ecommerce-fcommerce", name: "E-commerce & F-commerce" },
  { id: "web-application-development", name: "Web Application Development" },
  { id: "progressive-web-app-development", name: "Progressive Web App Development" },
  { id: "mobile-app-development", name: "Mobile App Development" },
  { id: "custom-software-engineering", name: "Custom Software Engineering" },
  { id: "mvp-saas-engineering", name: "MVP & SaaS Engineering" },
  { id: "business-management-systems", name: "Business Management Systems" },
  { id: "client-platforms", name: "Client Platforms" }
] as const satisfies readonly ServiceCategory[];

export const services: readonly ServiceOffer[] = [
  {
    id: "SVC-01-SPW", categoryId: "website-development", slug: "single-page-website-development",
    name: "Single Page Website Development",
    summary: "A focused one-page website with a maximum of five sections, structured around one clear business objective.",
    audience: "New businesses, focused campaigns, and simple service validation",
    included: ["Responsive one-page structure", "Up to five approved content sections", "Core accessibility and performance setup"],
    addons: [
      { id: "spw-form", label: "Validated enquiry workflow" },
      { id: "spw-bilingual", label: "Bangla and English content layer" },
      { id: "spw-analytics", label: "Consent-aware analytics instrumentation" }
    ], salesMode: "quote_required"
  },
  {
    id: "SVC-02-MIN", categoryId: "website-development", slug: "mini-website-development",
    name: "Mini Website Development",
    summary: "A compact one-page website with a maximum of eight sections and a broader information hierarchy.",
    audience: "Small businesses that need more depth without a multi-page site",
    included: ["Responsive one-page structure", "Up to eight approved content sections", "Structured navigation between sections"],
    addons: [
      { id: "mini-content", label: "Admin-editable content area", conflicts: ["mini-static"] },
      { id: "mini-blog", label: "Blog or update section", requires: ["mini-content"] },
      { id: "mini-static", label: "Static content only", conflicts: ["mini-content", "mini-blog"] }
    ], salesMode: "quote_required"
  },
  {
    id: "SVC-03-BIZ", categoryId: "website-development", slug: "business-website-development",
    name: "Business Website Development",
    summary: "A structured multi-page website for established business information, services, proof, and enquiries.",
    audience: "Growing organizations with multiple audiences or service lines",
    included: ["Multi-page information architecture", "Responsive component system", "SEO and performance foundations"],
    addons: [
      { id: "biz-cms", label: "Admin-managed content types" },
      { id: "biz-portfolio", label: "Case study or portfolio module", requires: ["biz-cms"] },
      { id: "biz-private", label: "Private document library" }
    ], salesMode: "quote_required"
  },
  {
    id: "SVC-04-FUN", categoryId: "sales-funnel-development", slug: "sales-funnel-development",
    name: "Sales Funnel Development", summary: "A measured landing and qualification journey designed around a defined conversion objective.",
    audience: "Campaigns, offers, lead qualification, and appointment flows",
    included: ["Conversion-focused landing surface", "Validated lead capture", "Thank-you continuation"],
    addons: [{ id: "fun-multi", label: "Multi-step qualification" }, { id: "fun-ab", label: "A/B variant structure" }], salesMode: "quote_required"
  },
  {
    id: "SVC-05-EFC", categoryId: "ecommerce-fcommerce", slug: "ecommerce-fcommerce-store-development",
    name: "E-commerce / F-commerce Store Development", summary: "A selling system with catalogue, checkout, order workflow, and social-commerce patterns.",
    audience: "Product sellers and social-first commerce teams",
    included: ["Catalogue and product detail structure", "Cart and order creation", "Seller order view"],
    addons: [{ id: "efc-cod", label: "Cash-on-delivery confirmation" }, { id: "efc-stock", label: "Inventory tracking" }, { id: "efc-coupon", label: "Promotion rules", requires: ["efc-stock"] }], salesMode: "quote_required"
  },
  {
    id: "SVC-06-WAP", categoryId: "web-application-development", slug: "custom-web-application-development",
    name: "Custom Web Application Development", summary: "A browser-based business application with authenticated workflows, records, and role-scoped operations.",
    audience: "Organizations replacing manual or fragmented workflows",
    included: ["Server-backed data model", "Authenticated role-based access", "Audit trail for sensitive changes"],
    addons: [{ id: "wap-approval", label: "Configurable approval workflow" }, { id: "wap-report", label: "Reporting and exports" }], salesMode: "quote_required"
  },
  {
    id: "SVC-07-PWA", categoryId: "progressive-web-app-development", slug: "pwa-development",
    name: "PWA Development", summary: "An installable web application designed for resilient mobile use and appropriate offline behavior.",
    audience: "Field teams and mobile-first workflows that still need web distribution",
    included: ["Installable application shell", "Responsive application experience", "Defined offline strategy"],
    addons: [{ id: "pwa-sync", label: "Offline capture with background sync" }, { id: "pwa-push", label: "Consent-based push notifications" }], salesMode: "quote_required"
  },
  {
    id: "SVC-08-MOB", categoryId: "mobile-app-development", slug: "android-ios-mobile-app-development",
    name: "Android & iOS Mobile App Development", summary: "A mobile application scope for Android and iOS with secure API-backed data and platform-aware delivery.",
    audience: "Products that require native distribution or device capabilities",
    included: ["Cross-platform product architecture", "Authenticated API integration", "Release preparation"],
    addons: [{ id: "mob-device", label: "Device capability module" }, { id: "mob-offline", label: "Offline-first local data" }], salesMode: "quote_required"
  },
  {
    id: "SVC-09-CSE", categoryId: "custom-software-engineering", slug: "custom-software-full-stack-development",
    name: "Custom Software & Full-Stack Development", summary: "An engineering engagement for complex systems, integrations, modernization, or ongoing product work.",
    audience: "Teams with non-standard architecture or modernization needs",
    included: ["Architecture and delivery planning", "Full-stack implementation", "Verification and technical documentation"],
    addons: [{ id: "cse-migration", label: "Legacy data migration" }, { id: "cse-security", label: "Security hardening pass" }], salesMode: "quote_required"
  },
  {
    id: "SVC-10-MVP", categoryId: "mvp-saas-engineering", slug: "mvp-saas-development",
    name: "MVP & SaaS Development", summary: "A staged product build that validates a business model without weakening production boundaries.",
    audience: "Founders and teams launching a new digital product",
    included: ["Product-scope definition", "Core user journey", "Deployment-ready foundation"],
    addons: [{ id: "mvp-onboarding", label: "Self-service onboarding" }, { id: "mvp-admin", label: "Admin/operator console" }], salesMode: "quote_required"
  },
  {
    id: "SVC-11-BMS", categoryId: "business-management-systems", slug: "business-dashboard-order-management-system",
    name: "Business Dashboard & Order Management System", summary: "An internal control surface for orders, operational records, reporting, and role-scoped work.",
    audience: "Operations-heavy teams coordinating orders and fulfillment",
    included: ["Validated order lifecycle", "Operations dashboard", "Role-scoped visibility"],
    addons: [{ id: "bms-inventory", label: "Inventory ledger" }, { id: "bms-finance", label: "Invoice and payment-status view" }], salesMode: "quote_required"
  },
  {
    id: "SVC-12-BCP", categoryId: "client-platforms", slug: "branded-client-portal-development",
    name: "Branded Client Portal Development", summary: "A private branded area where an organization's clients access authorized records, files, and status.",
    audience: "Service organizations that need secure client self-service",
    included: ["Organization-scoped authentication", "Authorized record visibility", "Project and document history"],
    addons: [{ id: "bcp-approval", label: "Client approval workflow" }, { id: "bcp-files", label: "Private file exchange" }], salesMode: "quote_required"
  }
];

export const serviceBySlug = (slug: string) => services.find((service) => service.slug === slug);
export const serviceById = (id: string) => services.find((service) => service.id === id);

export const singlePagePromotion = {
  amount: 999,
  currency: "BDT",
  approvedForCheckout: false,
  note: "Recorded promotional amount; regular price, duration, package approval, and checkout readiness remain unresolved."
} as const;
