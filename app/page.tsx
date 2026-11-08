import Link from "next/link";
import { ArrowRight, LockKeyhole, Calendar, Sparkles, ExternalLink } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { SolutionFinder } from "@/components/solution-finder";
import { EngineShowcase } from "@/components/engine-showcase";
import { categories, services } from "@/lib/catalog";
import { SOCIAL_LINKS } from "@/components/social-links";

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero Section */}
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <div className="hero-pill">
              <Sparkles size={14} className="cyan" />
              <span>NEXT-GEN SYSTEM ENGINEERING</span>
            </div>
            <h1>
              <span>Digital engineering,</span>
              <span>configured around</span>
              <span>your business.</span>
            </h1>
            <p>
              Discover the right service, shape the scope, and submit a production-ready brief—without translating your goals into technical jargon.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/build">
                Start a project <ArrowRight size={18} />
              </Link>
              <Link className="btn" href="/solutions">
                Find my solution
              </Link>
              <a
                href={SOCIAL_LINKS.clientPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-quiet hero-portal-btn"
              >
                <span>Client Portal</span>
                <ExternalLink size={15} className="cyan" />
              </a>
            </div>
          </div>

          <div className="product-window" aria-label="Project configuration preview">
            <div className="window-top">
              <span>
                ENGINE<span className="cyan">{"//"}</span>OS · configure_project
              </span>
              <span>SECURE DRAFT</span>
            </div>
            <div className="window-body">
              <div className="window-steps">
                <div className="window-step active">Goal</div>
                <div className="window-step">Service</div>
                <div className="window-step">Features</div>
                <div className="window-step">Review</div>
              </div>
              <div className="window-config">
                <div className="code-row">
                  <span>goal</span>
                  <span>:</span>
                  <strong>Grow operations</strong>
                </div>
                <div className="code-row">
                  <span>service</span>
                  <span>:</span>
                  <strong>To be recommended</strong>
                </div>
                <div className="code-row">
                  <span>scope</span>
                  <span>:</span>
                  <strong>Customer controlled</strong>
                </div>
                <div className="code-row">
                  <span>pricing</span>
                  <span>:</span>
                  <strong>Quote required</strong>
                </div>
              </div>
            </div>
            <div className="window-progress">
              <span>PROJECT SETUP</span>
              <div className="progress-line">
                <i />
              </div>
              <span>2 / 6</span>
            </div>
          </div>
        </div>
      </section>

      {/* Engine Visual Pipeline Showcase Section */}
      <section className="section section-showcase" id="engine-reel">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">ENGINE ARCHITECTURE & VISUAL REEL</div>
              <h2>High-fidelity engineering in motion.</h2>
            </div>
            <p>
              Experience the core visual pipeline of NOTREAL ENGINE. Built for zero-compromise real-time systems, 3D graphics, and computational workflows.
            </p>
          </div>

          <EngineShowcase
            title="ENGINE//OS CORE VISUAL PIPELINE"
            subtitle="Real-time rendering, physics simulation, and architectural visualization engine (4K 60FPS)."
          />
        </div>
      </section>

      {/* Direct Consultation & Fast Intake Banner */}
      <section className="consultation-banner-section">
        <div className="shell">
          <div className="consultation-banner">
            <div className="consultation-copy">
              <span className="mono banner-tag">DIRECT TECHNICAL CONSULTATION</span>
              <h3>Need architectural advice before configuring?</h3>
              <p>
                Connect directly with our engineering triage team via live video or direct messaging. We evaluate feasibility, scope, and canonical pricing without sales friction.
              </p>
            </div>
            <div className="consultation-actions">
              <Link href="/contact" className="btn btn-primary">
                <Calendar size={16} />
                <span>Schedule Consultation</span>
              </Link>
              <a
                href={SOCIAL_LINKS.whatsappBD}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-whatsapp"
              >
                <span>WhatsApp Direct</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Canonical Service Registry (10 Categories, 12 Offers) */}
      <section className="section" id="services">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">CANONICAL SERVICE REGISTRY</div>
              <h2>12 offers. 10 clear categories.</h2>
            </div>
            <p>
              Choose by business outcome. Technical architecture comes after the problem is understood.
            </p>
          </div>
          <div className="service-groups">
            {categories.map((category, categoryIndex) => {
              const group = services.filter((service) => service.categoryId === category.id);
              return (
                <div className="service-group" key={category.id}>
                  <div className="service-category">
                    <span>CATEGORY {String(categoryIndex + 1).padStart(2, "0")}</span>
                    <h3>{category.name}</h3>
                  </div>
                  <div className="service-list">
                    {group.map((service, serviceIndex) => (
                      <Link
                        className="service-link"
                        key={service.id}
                        href={`/services/${service.slug}`}
                      >
                        <span className="service-number">{String(serviceIndex + 1).padStart(2, "0")}</span>
                        <div>
                          <h4>{service.name}</h4>
                          <p>{service.summary}</p>
                        </div>
                        <ArrowRight size={18} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rules-Based Solution Finder */}
      <section className="section section-dark" id="finder">
        <div className="shell finder-grid">
          <div>
            <div className="section-code">SOLUTION FINDER</div>
            <h2 style={{ fontSize: "3rem", letterSpacing: "-.04em", marginTop: 0 }}>
              Start with the outcome, not the technology.
            </h2>
            <p className="muted" style={{ lineHeight: 1.7 }}>
              An auditable ruleset maps structured answers to the canonical service registry. Ambiguous combinations go to a guided quote instead of an invented recommendation.
            </p>
          </div>
          <SolutionFinder />
        </div>
      </section>

      {/* Operating Flow */}
      <section className="section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">OPERATING FLOW</div>
              <h2>From first click to delivered project.</h2>
            </div>
          </div>
          <div className="flow">
            {[
              ["01", "Discover", "Find the service or guided path that fits your goal."],
              ["02", "Configure", "Shape scope, requirements, design, budget, and timing."],
              ["03", "Quote", "Review an auditable commercial proposal before acceptance."],
              ["04", "Build", "Track real requirements, milestones, reviews, and revisions."],
              ["05", "Deliver", "Record approval and delivery in the secure workspace."],
            ].map(([n, t, p]) => (
              <div className="flow-step" key={n}>
                <span>{n}</span>
                <h3>{t}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <div className="integrity-note">
            <LockKeyhole size={20} className="gold" />
            <div>
              <strong>Pricing is shown only when approved.</strong> Unapproved packages and unresolved promotions remain quote-only.
            </div>
          </div>
        </div>
      </section>

      {/* Final Action CTA */}
      <section className="section section-dark">
        <div className="shell section-head" style={{ marginBottom: 0 }}>
          <div>
            <h2>Ready to build what your business needs?</h2>
            <p style={{ marginTop: "1rem" }}>
              Create a structured project brief in six clear steps or consult with our engineers.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/build">
              Start a project <ArrowRight size={18} />
            </Link>
            <Link className="btn" href="/contact">
              <Calendar size={16} />
              <span>Book Briefing</span>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
