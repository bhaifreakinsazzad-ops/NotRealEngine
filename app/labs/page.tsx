import Link from "next/link";
import { ShieldCheck, ArrowRight, FlaskConical } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { NreLabWorkbench } from "@/components/nre-lab-workbench";

export const metadata = {
  title: "NRE LAB — Free Visitor Planning & Scoping Tools",
  description:
    "Use NotRealEngine's free, no-login visitor tools: Starting-Scope & Add-On Estimator, Website Launch Readiness Checklist, Landing Page Blueprint Generator, and App vs PWA Advisor.",
};

export default function LabsPage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">NRE LAB · FREE VISITOR UTILITY SUITE</div>
          <h1>Plan your build before spending a single taka.</h1>
          <p>
            Four practical, deterministic engineering tools built directly on NotRealEngine&apos;s
            Canonical Catalog v5. No login required, no third-party popups, and every generated
            blueprint is editable and exportable for free.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <NreLabWorkbench />
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="labs-spec-grid">
            <div className="spec-card">
              <FlaskConical size={22} className="cyan" />
              <h4>Deterministic Catalog v5 Rules</h4>
              <p>
                Every Starting From figure and add-on compatibility check runs against the same
                authoritative v5 catalog used by our engineering team—zero invented prices.
              </p>
            </div>
            <div className="spec-card">
              <ShieldCheck size={22} className="cyan" />
              <h4>Zero Login Walls or Popup Prompts</h4>
              <p>
                Visitors can run tools, customize Markdown drafts, and download outputs freely
                without creating accounts or authenticating external browser services.
              </p>
            </div>
            <div className="spec-card">
              <ArrowRight size={22} className="cyan" />
              <h4>Seamless Project Builder Handoff</h4>
              <p>
                When you are ready for human engineering review, transfer your recommended service
                directly into the 6-step Project Builder for a written quotation.
              </p>
            </div>
          </div>

          <div className="integrity-note">
            <ShieldCheck size={20} className="gold" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Transparency note:</strong> NRE LAB outputs are planning aids and non-binding{" "}
              <strong>Starting From</strong> baselines. Need human review on an existing website or
              complex architecture?{" "}
              <Link href="/contact" className="cyan" style={{ textDecoration: "underline" }}>
                Contact our engineering desk
              </Link>
              .
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
