import Link from "next/link";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import {
  addons,
  coreTechnicalServices,
  formatBdt,
  formatStartingFromBdt,
  pulsePlans,
  standaloneServices,
} from "@/lib/catalog";

export const metadata = {
  title: "Pricing — Starting From Launch Baselines",
  description:
    "Transparent BDT Starting From launch baselines across all 22 canonical NotRealEngine services, 13 compatible add-ons, and NRE PULSE technical care.",
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">COMMERCIAL TRANSPARENCY · CANONICAL CATALOG V5</div>
          <h1>Commercial clarity before commitment.</h1>
          <p>
            Every public BDT figure below is an honest <strong>Starting From</strong> launch
            baseline—never a hidden teaser or automated charge. All 22 services remain{" "}
            <strong>quote-required</strong> until scope, deliverables, and timeline are approved in
            writing.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="integrity-note" style={{ marginTop: 0, marginBottom: "2.5rem" }}>
            <ShieldCheck size={20} className="gold" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Current safe mode: guided quotation.</strong> All 22 canonical services remain
              quote-required. Live automated checkout and recurring subscription billing are OFF
              until explicit owner approval and verified payment provider setup.
            </div>
          </div>

          <div className="section-head">
            <div>
              <div className="section-code">STANDALONE SERVICES ({standaloneServices.length})</div>
              <h2>Websites, Commerce, Portals & Apps</h2>
            </div>
            <Link className="btn btn-primary" href="/build">
              <span>Start a project</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="panel" style={{ marginBottom: "3rem" }}>
            <div className="panel-body" style={{ padding: 0 }}>
              {standaloneServices.map((svc) => (
                <div
                  key={svc.id}
                  className="gate-row"
                  style={{ padding: "1rem 1.25rem", flexWrap: "wrap" }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <Link href={`/services/${svc.slug}`} style={{ fontWeight: 700, color: "var(--text)" }}>
                      <span className="mono cyan" style={{ marginRight: 10 }}>{svc.id}</span>
                      {svc.name}
                    </Link>
                    <div className="muted" style={{ fontSize: ".82rem", marginTop: 3 }}>
                      {svc.categoryName} · {svc.timelineRange}
                      {svc.scopeCaveat ? ` — ${svc.scopeCaveat}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <strong className="mono tabular" style={{ color: "var(--text)" }}>
                      {formatStartingFromBdt(svc.startingPriceBdt)}
                    </strong>
                    <Link href={`/build?service=${svc.id}`} className="mono cyan" style={{ fontSize: ".78rem", fontWeight: 700 }}>
                      Quote →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-head">
            <div>
              <div className="section-code">CORE TECHNICAL SERVICES ({coreTechnicalServices.length})</div>
              <h2>Integrations, Revamps, Databases & Engineering</h2>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: "3rem" }}>
            <div className="panel-body" style={{ padding: 0 }}>
              {coreTechnicalServices.map((svc) => (
                <div
                  key={svc.id}
                  className="gate-row"
                  style={{ padding: "1rem 1.25rem", flexWrap: "wrap" }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <Link href={`/services/${svc.slug}`} style={{ fontWeight: 700, color: "var(--text)" }}>
                      <span className="mono cyan" style={{ marginRight: 10 }}>{svc.id}</span>
                      {svc.name}
                    </Link>
                    <div className="muted" style={{ fontSize: ".82rem", marginTop: 3 }}>
                      {svc.timelineRange}
                      {svc.scopeCaveat ? ` — ${svc.scopeCaveat}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <strong className="mono tabular" style={{ color: "var(--text)" }}>
                      {formatStartingFromBdt(svc.startingPriceBdt)}
                    </strong>
                    <Link href={`/build?service=${svc.id}`} className="mono cyan" style={{ fontSize: ".78rem", fontWeight: 700 }}>
                      Quote →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-head">
            <div>
              <div className="section-code">COMPATIBLE ADD-ONS ({addons.length})</div>
              <h2>Optional Modular Extensions</h2>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: "3rem" }}>
            <div className="panel-body" style={{ padding: 0 }}>
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="gate-row"
                  style={{ padding: ".9rem 1.25rem", flexWrap: "wrap" }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <strong style={{ color: "var(--text)" }}>
                      <span className="mono cyan" style={{ marginRight: 10 }}>{addon.id}</span>
                      {addon.name}
                    </strong>
                    <div className="muted" style={{ fontSize: ".8rem", marginTop: 3 }}>
                      Compatible services: {addon.compatibleServiceIds.join(", ")}
                    </div>
                  </div>
                  <strong className="mono tabular" style={{ color: "var(--text)" }}>
                    {formatStartingFromBdt(addon.startingPriceBdt)}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* NRE PULSE SUMMARY */}
          <div className="section-head">
            <div>
              <div className="section-code">NRE PULSE · TECHNICAL CARE</div>
              <h2>Ongoing Maintenance & Stewardship</h2>
            </div>
            <Link className="btn" href="/pulse">
              View full NRE PULSE & M01–M07 modules
            </Link>
          </div>

          <div className="pulse-grid">
            {pulsePlans.map((plan) => (
              <div key={plan.id} className={`pulse-card${plan.code === "CORE" ? " featured" : ""}`}>
                <div>
                  <span className="mono cyan" style={{ fontSize: ".72rem", fontWeight: 700 }}>
                    {plan.id}
                  </span>
                  <h3 style={{ margin: ".35rem 0 .4rem" }}>{plan.name}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{plan.summary}</p>
                </div>
                <div className="pulse-price-block">
                  <div>
                    <span className="mono muted" style={{ fontSize: ".7rem", display: "block" }}>
                      WEEKLY (FOUNDER-DIRECTED BASELINE)
                    </span>
                    <strong className="mono tabular" style={{ fontSize: "1.15rem" }}>
                      Starting From {formatBdt(plan.weeklyStartingPriceBdt)}/wk
                    </strong>
                  </div>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: ".6rem" }}>
                    <span className="mono gold" style={{ fontSize: ".7rem", display: "block" }}>
                      MONTHLY STARTING FROM (FOUNDER-APPROVED)
                    </span>
                    <strong className="mono tabular silver" style={{ fontSize: ".98rem" }}>
                      {formatBdt(plan.proposedMonthlyPriceBdt)}/mo (Not yet billable)
                    </strong>
                  </div>
                </div>
                <div style={{ fontSize: ".78rem", color: "var(--muted)", display: "flex", gap: ".45rem" }}>
                  <AlertCircle size={14} className="gold" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{plan.eligibilityNote}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
