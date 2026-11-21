import Link from "next/link";
import { ShieldCheck, Check, AlertCircle, ArrowRight, Activity } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import {
  formatBdt,
  pulseCoverageModules,
  pulsePlans,
  pulsePositioning,
} from "@/lib/catalog";

export const metadata = {
  title: "NRE PULSE — Technical Care & Maintenance",
  description:
    "Human-led, expert-backed, AI-assisted technical care across 7 coverage modules (M01–M07). FLEX, CORE, and PRIME care plans with transparent written scope.",
};

export default function PulsePage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">NRE PULSE · TECHNICAL CARE</div>
          <h1>{pulsePositioning.tagline}</h1>
          <p>
            Dependable post-launch stewardship for websites, e-commerce stores, databases, web
            apps, and mobile applications—backed by real engineers, structured coverage modules
            (M01–M07), and 24/7 digital ticket tracking inside NRE OFFICE.
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">CARE TIERS · FLEX · CORE · PRIME</div>
              <h2>Three structured care plans. Zero hidden billing.</h2>
            </div>
            <p>
              Weekly baselines are founder-directed Starting From rates. Monthly rates are proposed
              and held pending explicit owner approval—automated recurring billing is OFF.
            </p>
          </div>

          <div className="pulse-grid">
            {pulsePlans.map((plan) => (
              <article
                key={plan.id}
                className={`pulse-card${plan.code === "CORE" ? " featured" : ""}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono cyan" style={{ fontSize: ".74rem", fontWeight: 700 }}>
                    {plan.id}
                  </span>
                  {plan.code === "CORE" && (
                    <span className="status info">MOST COMMON FOR ACTIVE SITES</span>
                  )}
                </div>

                <div>
                  <h3 style={{ margin: "0 0 .45rem", fontSize: "1.3rem" }}>{plan.name}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: ".88rem", lineHeight: 1.55 }}>
                    {plan.summary}
                  </p>
                </div>

                <div className="pulse-price-block">
                  <div>
                    <span className="mono muted" style={{ fontSize: ".7rem", display: "block" }}>
                      WEEKLY BASELINE (FOUNDER-DIRECTED)
                    </span>
                    <strong className="mono tabular" style={{ fontSize: "1.25rem" }}>
                      Starting From {formatBdt(plan.weeklyStartingPriceBdt)} / week
                    </strong>
                  </div>
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: ".6rem" }}>
                    <span className="mono gold" style={{ fontSize: ".7rem", display: "block" }}>
                      MONTHLY (PROPOSED — OWNER APPROVAL PENDING)
                    </span>
                    <strong className="mono tabular" style={{ fontSize: "1rem", color: "var(--silver)" }}>
                      {formatBdt(plan.proposedMonthlyPriceBdt)} / month (Billing disabled)
                    </strong>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <span className="mono muted" style={{ fontSize: ".7rem", display: "block", marginBottom: ".5rem" }}>
                    COVERAGE FOCUS
                  </span>
                  <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: ".45rem", fontSize: ".86rem", color: "var(--silver)", lineHeight: 1.5 }}>
                    {plan.coverageFocus.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    fontSize: ".78rem",
                    color: "var(--gold)",
                    background: "var(--gold-dim)",
                    border: "1px solid rgba(228, 187, 77, 0.3)",
                    padding: ".65rem .75rem",
                    borderRadius: 4,
                  }}
                >
                  <strong>Eligibility & Scope:</strong> {plan.eligibilityNote}
                </div>

                <Link
                  href={`/contact`}
                  className={`btn${plan.code === "CORE" ? " btn-primary" : ""}`}
                  style={{ width: "100%" }}
                >
                  <span>Request {plan.code} Scope & Eligibility</span>
                  <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7 COVERAGE MODULES M01-M07 */}
      <section className="section section-dark">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">7 COVERAGE MODULES (M01 – M07)</div>
              <h2>What NRE PULSE actively protects and maintains.</h2>
            </div>
            <p>
              Coverage modules are assigned cleanly in your written onboarding schedule based on
              your stack and care tier.
            </p>
          </div>

          <div className="pulse-modules-grid">
            {pulseCoverageModules.map((mod) => (
              <div key={mod.id} className="pulse-module-card">
                <div style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
                  <Activity size={15} className="cyan" />
                  <span className="mono cyan" style={{ fontSize: ".74rem", fontWeight: 700 }}>
                    {mod.id}
                  </span>
                </div>
                <h4>{mod.name}</h4>
                <p>{mod.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLICIT BOUNDARIES & HONESTY */}
      <section className="section">
        <div className="shell detail-grid">
          <div>
            <div className="section-code">OPERATIONAL HONESTY</div>
            <h2>Clear boundaries before onboarding.</h2>

            <div className="list-rail" style={{ marginTop: "1.5rem" }}>
              <div className="list-row">
                <Check size={18} />
                <div>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
                    24/7 Request Submission & Live Status Tracking
                  </strong>
                  <span>{pulsePositioning.requestIntakeClarification}</span>
                </div>
              </div>
              <div className="list-row">
                <Check size={18} />
                <div>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
                    No Artificial Hour Buckets — Written Scope Instead of &ldquo;Unlimited&rdquo;
                  </strong>
                  <span>{pulsePositioning.scopeClarification}</span>
                </div>
              </div>
              <div className="list-row">
                <Check size={18} />
                <div>
                  <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
                    Human-Led Execution with AI-Assisted Diagnostics
                  </strong>
                  <span>
                    Every production change, backup check, security patch, and client ticket update
                    is reviewed and executed by human engineers—never autonomous unverified pushes.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="aside-panel">
            <div className="section-code">BILLING GOVERNANCE</div>
            <h2 style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
              <ShieldCheck size={20} className="gold" />
              <span>Recurring Billing Is OFF</span>
            </h2>
            <p>
              NRE PULSE cannot be auto-charged online today. Onboarding begins with a technical
              eligibility check and a written coverage schedule approved by both parties.
            </p>
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                fontSize: ".8rem",
                color: "var(--gold)",
                marginBottom: "1.25rem",
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Monthly rates shown are proposed figures pending formal founder approval.</span>
            </div>
            <div style={{ display: "grid", gap: ".7rem" }}>
              <Link href="/contact" className="btn btn-primary">
                Request PULSE Eligibility Check
              </Link>
              <Link href="/dashboard/support" className="btn">
                Existing Client? Open Support Desk
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}
