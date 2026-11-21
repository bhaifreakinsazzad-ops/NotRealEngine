import { services } from "@/lib/catalog";

export type FinderAnswers = {
  goal: "presence" | "sell" | "operations" | "product" | "client_access" | "upgrade";
  complexity?: "focused" | "broad" | "custom";
  offline?: boolean;
};

type Rule = {
  id: string;
  score: number;
  serviceId: string;
  when: (answers: FinderAnswers) => boolean;
  reason: string;
};

const rules: readonly Rule[] = [
  {
    id: "presence-focused",
    score: 100,
    serviceId: "S03",
    when: (a) => a.goal === "presence" && a.complexity === "focused",
    reason: "A focused single-objective Landing Page (S03) delivers rapid campaign or brand conversion without unnecessary bloat.",
  },
  {
    id: "presence-broad",
    score: 100,
    serviceId: "S02",
    when: (a) => a.goal === "presence" && a.complexity === "broad",
    reason: "A structured multi-page Business Website (S02) fits multiple services, credibility proof, and lead capture.",
  },
  {
    id: "presence-custom",
    score: 100,
    serviceId: "S01",
    when: (a) => a.goal === "presence" && a.complexity === "custom",
    reason: "A compact Mini Website (S01) gives founders a fast, structured presence with optional booking or lead-capture add-ons.",
  },
  {
    id: "sell-funnel",
    score: 110,
    serviceId: "S04",
    when: (a) => a.goal === "sell" && a.complexity === "focused",
    reason: "A Sales Funnel (S04) is purpose-built for a focused single offer, qualification flow, and direct booking or inquiry.",
  },
  {
    id: "sell",
    score: 100,
    serviceId: "S05",
    when: (a) => a.goal === "sell",
    reason: "E-commerce Website Development (S05) matches multi-product catalog, cart, courier, and order workflows.",
  },
  {
    id: "operations-admin",
    score: 110,
    serviceId: "S23",
    when: (a) => a.goal === "operations" && a.complexity === "custom",
    reason: "Custom Admin Panel Development (S23) gives your staff controlled back-office operations with audit trails.",
  },
  {
    id: "operations",
    score: 100,
    serviceId: "S07",
    when: (a) => a.goal === "operations",
    reason: "Business Dashboard Development (S07) turns internal sales, orders, and KPIs into a clean operational view.",
  },
  {
    id: "product-offline",
    score: 120,
    serviceId: "S09",
    when: (a) => a.goal === "product" && a.offline === true,
    reason: "Progressive Web App Development (S09) delivers installable mobile ergonomics and safe offline resilience without app-store friction.",
  },
  {
    id: "product-mvp",
    score: 110,
    serviceId: "S13",
    when: (a) => a.goal === "product" && a.complexity === "custom" && !a.offline,
    reason: "SaaS MVP Development (S13) gives startup teams a launch-ready multi-tenant software foundation.",
  },
  {
    id: "product-web",
    score: 100,
    serviceId: "S08",
    when: (a) => a.goal === "product" && !a.offline,
    reason: "Web Application Development (S08) fits an authenticated browser-based platform with custom business workflows.",
  },
  {
    id: "client-access",
    score: 100,
    serviceId: "S06",
    when: (a) => a.goal === "client_access",
    reason: "Client Portal Development (S06) provides organization-scoped login, deliverables, files, and milestone approvals.",
  },
  {
    id: "upgrade-focused",
    score: 110,
    serviceId: "S21",
    when: (a) => a.goal === "upgrade" && a.complexity === "focused",
    reason: "Website Bug Fixing & Troubleshooting (S21) targets root-cause repair quickly without rebuilding working systems.",
  },
  {
    id: "upgrade-broad",
    score: 100,
    serviceId: "S18",
    when: (a) => a.goal === "upgrade" && a.complexity === "broad",
    reason: "Website Redesign & Revamp (S18) modernizes layout, mobile responsiveness, speed, and conversion clarity.",
  },
  {
    id: "upgrade-custom",
    score: 100,
    serviceId: "S22",
    when: (a) => a.goal === "upgrade" && a.complexity === "custom",
    reason: "Website Feature Development (S22) extends your existing site with scoped new capabilities safely.",
  },
];

export function recommend(answers: FinderAnswers) {
  const match = rules
    .filter((rule) => rule.when(answers))
    .sort((a, b) => b.score - a.score)[0];

  if (!match) {
    return {
      kind: "guided_quote" as const,
      reason: "Your requirements span multiple service boundaries; a guided scoping brief is the safest path.",
    };
  }

  const service = services.find((item) => item.id === match.serviceId);
  return service
    ? { kind: "service" as const, service, ruleId: match.id, reason: match.reason }
    : { kind: "guided_quote" as const, reason: "No canonical v5 service matched safely." };
}
