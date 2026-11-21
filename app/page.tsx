import Link from "next/link";
import { ArrowRight, Layers, ShieldCheck, FlaskConical, Briefcase, PhoneCall } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { ServiceCatalogExplorer } from "@/components/service-catalog-explorer";
import { SolutionFinder } from "@/components/solution-finder";
import { SOCIAL_LINKS } from "@/components/social-links";

const pillars = [
  {
    code: "01 · NRE SELECT",
    title: "22 Canonical Digital Services",
    summary:
      "13 Standalone builds and 9 Core Technical services with 13 compatible add-ons and transparent BDT Starting From launch baselines.",
    href: "/services",
    cta: "Explore NRE SELECT",
    Icon: Layers,
  },
  {
    code: "02 · NRE PULSE",
    title: "Human-Led Technical Care",
    summary:
      "FLEX, CORE, and PRIME care across 7 coverage modules (M01–M07). Human-led, expert-backed, AI-assisted with 24/7 request tracking.",
    href: "/pulse",
    cta: "View NRE PULSE",
    Icon: ShieldCheck,
  },
  {
    code: "03 · NRE LAB",
    title: "Free Visitor Planning Tools",
    summary:
      "No-login Scope & Add-On Estimator, Launch Readiness Checklist, Landing Page Blueprint, and App vs PWA decision guide.",
    href: "/labs",
    cta: "Open NRE LAB",
    Icon: FlaskConical,
  },
  {
    code: "04 · NRE OFFICE",
    title: "Client & Delivery Workspace",
    summary:
      "Organization-scoped quotes, immutable order approvals, file exchange, requirements tracking, and evidence-backed project timelines.",
    href: "/dashboard",
    cta: "Open NRE OFFICE",
    Icon: Briefcase,
  },
] as const;

const flow = [
  ["01", "Scope & Configure", "Choose a canonical v5 service, compatible add-ons, and export or submit your brief without payment obligation."],
  ["02", "Human Review & Quote", "An engineer validates scope boundaries and issues a written quotation with explicit deliverables and terms."],
  ["03", "Verified Approval", "Review immutable quote snapshots inside NRE OFFICE. Orders require verified settlement before build starts."],
  ["04", "Tracked Delivery", "Submit requirements, exchange files, and monitor real milestone updates—never fabricated progress bars."],
  ["05", "Handoff & PULSE Care", "Launch cleanly with verified QA and optional ongoing NRE PULSE technical stewardship."],
] as const;

export default function HomePage() {
  return (
    <MarketingShell>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span>NOTREAL ENGINE · CANONICAL CATALOG V5</span>
            </div>
            <h1>
              <span>Designed to impress.</span>
              <span>Engineered to work.</span>
            </h1>
            <p>
              From focused landing pages and e-commerce stores to custom web apps, installable
              PWAs, mobile apps, and dependable technical care—scoped transparently in BDT and
              delivered through NRE OFFICE.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/build">
                <span>Start a project</span>
                <ArrowRight size={16} />
              </Link>
              <Link className="btn" href="/services">
                Explore 22 Services
              </Link>
              <Link className="btn btn-quiet" href="/labs">
                Try Free NRE LAB Tools
              </Link>
            </div>
          </div>

          <div className="product-window" aria-label="NotRealEngine interactive configuration preview">
            <div className="window-top">
              <span>NRE SELECT · SCOPE BLUEPRINT</span>
              <span className="cyan">QUOTE-REQUIRED · SAFE MODE</span>
            </div>
            <div className="window-body">
              <div className="window-steps">
                <div className="window-step active">01 Goal</div>
                <div className="window-step active">02 Service</div>
                <div className="window-step">03 Add-ons</div>
                <div className="window-step">04 Export</div>
              </div>
              <div className="window-config">
                <div className="code-row">
                  <span>service</span>
                  <span>:</span>
                  <strong>S08 · Web Application Development</strong>
                </div>
                <div className="code-row">
                  <span>starting</span>
                  <span>:</span>
                  <strong className="tabular">Starting From ৳9,500</strong>
                </div>
                <div className="code-row">
                  <span>add-ons</span>
                  <span>:</span>
                  <strong>A10 QA · A11 Deployment · A18 Auth</strong>
                </div>
                <div className="code-row">
                  <span>checkout</span>
                  <span>:</span>
                  <strong>Written quotation before payment</strong>
                </div>
              </div>
            </div>
            <div className="window-progress">
              <span>22 CANONICAL SERVICES · 13 ADD-ONS · 7 PULSE MODULES</span>
              <div className="progress-line">
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-PILLAR ECOSYSTEM */}
      <section className="section section-dark">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">01 PLATFORM ARCHITECTURE</div>
              <h2>One unified digital engineering system.</h2>
            </div>
            <p>
              Every public tool, service specification, care module, and authenticated workspace
              shares the same canonical data model and human-in-the-loop discipline.
            </p>
          </div>
          <div className="pillar-grid">
            {pillars.map(({ code, title, summary, href, cta, Icon }) => (
              <Link key={code} href={href} className="pillar-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono cyan" style={{ fontSize: ".7rem", fontWeight: 700, letterSpacing: ".08em" }}>
                    {code}
                  </span>
                  <Icon size={18} className="blue" />
                </div>
                <h3>{title}</h3>
                <p>{summary}</p>
                <span className="pillar-link">
                  <span>{cta}</span>
                  <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE CANONICAL V5 SERVICE DISCOVERY */}
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">02 NRE SELECT · CANONICAL CATALOG V5</div>
              <h2>22 official services. Clear Starting From baselines.</h2>
            </div>
            <p>
              Filter between 13 Standalone Builds and 9 Core Technical Services. Every engagement
              starts with transparent scope review and a written quotation.
            </p>
          </div>
          <ServiceCatalogExplorer compact />
        </div>
      </section>

      {/* RULE-GROUNDED SOLUTION FINDER */}
      <section className="section section-dark">
        <div className="shell finder-grid">
          <div>
            <div className="section-code">03 SOLUTION FINDER</div>
            <h2 style={{ fontSize: "clamp(1.9rem, 2.8vw, 2.8rem)", lineHeight: 1.06, letterSpacing: "-.035em", margin: "0 0 1.2rem" }}>
              Not sure which build fits your stage?
            </h2>
            <p className="muted" style={{ lineHeight: 1.7, marginBottom: "1.5rem" }}>
              Answer two structured questions to match your business goal to the exact canonical v5
              service—or jump straight into free scoping tools in NRE LAB.
            </p>
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
              <Link className="btn" href="/labs">
                Open NRE LAB Tools
              </Link>
              <Link className="btn btn-quiet" href="/pulse">
                Need ongoing care? →
              </Link>
            </div>
          </div>
          <SolutionFinder />
        </div>
      </section>

      {/* OPERATING FLOW */}
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">04 DELIVERY DISCIPLINE</div>
              <h2>Transparent from first brief to launch.</h2>
            </div>
            <p>
              No unauthorized checkout, no inflated claims, and no hidden scope traps—every step is
              recorded and human-verified.
            </p>
          </div>
          <div className="flow">
            {flow.map(([num, title, body]) => (
              <div key={num} className="flow-step">
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
          <div className="integrity-note">
            <ShieldCheck size={20} className="gold" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Commercial transparency notice:</strong> All public BDT prices are{" "}
              <strong>Starting From</strong> launch baselines. Direct automated checkout and
              recurring billing remain disabled until written quotation acceptance and verified
              settlement.
            </div>
          </div>
        </div>
      </section>

      {/* DIRECT CONSULTATION BANNER */}
      <section className="consultation-banner-section">
        <div className="shell">
          <div className="consultation-banner">
            <div className="consultation-copy">
              <span className="mono banner-tag">DIRECT ENGINEERING CONSULTATION</span>
              <h3>Ready to scope your website, app, or technical upgrade?</h3>
              <p>
                Configure your brief in 2 minutes, export it for your team, or speak directly with
                NotRealEngine via WhatsApp in English or Bangla.
              </p>
            </div>
            <div className="consultation-actions">
              <Link href="/build" className="btn btn-primary">
                <span>Start Project Builder</span>
                <ArrowRight size={15} />
              </Link>
              <a
                href={SOCIAL_LINKS.whatsappBD}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-whatsapp"
              >
                <PhoneCall size={15} />
                <span>WhatsApp BD</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
