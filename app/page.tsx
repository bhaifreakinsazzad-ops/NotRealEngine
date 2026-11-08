import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { SolutionFinder } from "@/components/solution-finder";
import { categories, services } from "@/lib/catalog";

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="hero">
        <div className="shell hero-inner">
          <div className="hero-copy">
            <h1><span>Digital engineering,</span><span>configured around</span><span>your business.</span></h1>
            <p>Discover the right service, shape the scope, and submit a production-ready brief—without translating your goals into technical jargon.</p>
            <div className="hero-actions"><Link className="btn btn-primary" href="/build">Start a project <ArrowRight size={18} /></Link><Link className="btn" href="/solutions">Find my solution</Link></div>
          </div>
          <div className="product-window" aria-label="Project configuration preview">
            <div className="window-top"><span>ENGINE<span className="cyan">{"//"}</span>OS · configure_project</span><span>SECURE DRAFT</span></div>
            <div className="window-body"><div className="window-steps"><div className="window-step active">Goal</div><div className="window-step">Service</div><div className="window-step">Features</div><div className="window-step">Review</div></div><div className="window-config"><div className="code-row"><span>goal</span><span>:</span><strong>Grow operations</strong></div><div className="code-row"><span>service</span><span>:</span><strong>To be recommended</strong></div><div className="code-row"><span>scope</span><span>:</span><strong>Customer controlled</strong></div><div className="code-row"><span>pricing</span><span>:</span><strong>Quote required</strong></div></div></div>
            <div className="window-progress"><span>PROJECT SETUP</span><div className="progress-line"><i /></div><span>2 / 6</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="services"><div className="shell"><div className="section-head"><div><div className="section-code">CANONICAL SERVICE REGISTRY</div><h2>12 offers. 10 clear categories.</h2></div><p>Choose by business outcome. Technical architecture comes after the problem is understood.</p></div><div className="service-groups">{categories.map((category, categoryIndex) => { const group = services.filter((service) => service.categoryId === category.id); return <div className="service-group" key={category.id}><div className="service-category"><span>CATEGORY {String(categoryIndex + 1).padStart(2, "0")}</span><h3>{category.name}</h3></div><div className="service-list">{group.map((service, serviceIndex) => <Link className="service-link" key={service.id} href={`/services/${service.slug}`}><span className="service-number">{String(serviceIndex + 1).padStart(2, "0")}</span><div><h4>{service.name}</h4><p>{service.summary}</p></div><ArrowRight size={18} /></Link>)}</div></div>; })}</div></div></section>

      <section className="section section-dark" id="finder"><div className="shell finder-grid"><div><div className="section-code">SOLUTION FINDER</div><h2 style={{ fontSize: "3rem", letterSpacing: "-.04em", marginTop: 0 }}>Start with the outcome, not the technology.</h2><p className="muted" style={{ lineHeight: 1.7 }}>An auditable ruleset maps structured answers to the canonical service registry. Ambiguous combinations go to a guided quote instead of an invented recommendation.</p></div><SolutionFinder /></div></section>

      <section className="section"><div className="shell"><div className="section-head"><div><div className="section-code">OPERATING FLOW</div><h2>From first click to delivered project.</h2></div></div><div className="flow">{[["01","Discover","Find the service or guided path that fits your goal."],["02","Configure","Shape scope, requirements, design, budget, and timing."],["03","Quote","Review an auditable commercial proposal before acceptance."],["04","Build","Track real requirements, milestones, reviews, and revisions."],["05","Deliver","Record approval and delivery in the secure workspace."]].map(([n,t,p]) => <div className="flow-step" key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></div>)}</div><div className="integrity-note"><LockKeyhole size={20} className="gold" /><div><strong>Pricing is shown only when approved.</strong> Unapproved packages and unresolved promotions remain quote-only.</div></div></div></section>

      <section className="section section-dark"><div className="shell section-head" style={{ marginBottom: 0 }}><div><h2>Ready to build what your business needs?</h2><p style={{ marginTop: "1rem" }}>Create a structured project brief in six clear steps.</p></div><div className="hero-actions"><Link className="btn btn-primary" href="/build">Start a project <ArrowRight size={18} /></Link><Link className="btn" href="/solutions">Find my solution</Link></div></div></section>
    </MarketingShell>
  );
}
