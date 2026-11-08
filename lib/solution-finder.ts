import { services } from "@/lib/catalog";

export type FinderAnswers = {
  goal: "presence" | "sell" | "operations" | "product" | "client_access";
  complexity?: "focused" | "broad" | "custom";
  offline?: boolean;
};

type Rule = { id: string; score: number; serviceId: string; when: (answers: FinderAnswers) => boolean; reason: string };

const rules: readonly Rule[] = [
  { id: "presence-focused", score: 100, serviceId: "SVC-01-SPW", when: (a) => a.goal === "presence" && a.complexity === "focused", reason: "A focused one-page presence matches the stated scope." },
  { id: "presence-broad", score: 100, serviceId: "SVC-03-BIZ", when: (a) => a.goal === "presence" && a.complexity === "broad", reason: "A multi-page business website fits the broader information need." },
  { id: "sell", score: 100, serviceId: "SVC-05-EFC", when: (a) => a.goal === "sell", reason: "A store is the direct match for catalogue, checkout, and order operations." },
  { id: "operations", score: 100, serviceId: "SVC-11-BMS", when: (a) => a.goal === "operations", reason: "An operations dashboard aligns with internal order and record management." },
  { id: "product-offline", score: 110, serviceId: "SVC-07-PWA", when: (a) => a.goal === "product" && a.offline === true, reason: "An installable PWA fits the mobile and offline requirement." },
  { id: "product-web", score: 100, serviceId: "SVC-06-WAP", when: (a) => a.goal === "product" && !a.offline, reason: "A custom web application fits an authenticated browser workflow." },
  { id: "client-access", score: 100, serviceId: "SVC-12-BCP", when: (a) => a.goal === "client_access", reason: "A branded portal matches private client access." }
];

export function recommend(answers: FinderAnswers) {
  const match = rules.filter((rule) => rule.when(answers)).sort((a, b) => b.score - a.score)[0];
  if (!match) return { kind: "guided_quote" as const, reason: "The answers span multiple service boundaries; a guided quotation is the safe path." };
  const service = services.find((item) => item.id === match.serviceId);
  return service ? { kind: "service" as const, service, ruleId: match.id, reason: match.reason } : { kind: "guided_quote" as const, reason: "No canonical service matched safely." };
}
