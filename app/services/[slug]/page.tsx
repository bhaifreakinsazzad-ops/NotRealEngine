import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { formatStartingFromBdt, serviceBySlug, services } from "@/lib/catalog";

export const generateStaticParams = () => services.map((service) => ({ slug: service.slug }));

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) notFound();

  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">
            {service.id} · {service.segment === "standalone" ? "STANDALONE SERVICE" : "CORE TECHNICAL SERVICE"} · {service.categoryName.toUpperCase()}
          </div>
          <h1>{service.name}</h1>
          <p>{service.summary}</p>
        </div>
      </section>

      <section className="section">
        <div className="shell detail-grid">
          <div>
            {service.scopeCaveat && (
              <div className="integrity-note" style={{ marginTop: 0, marginBottom: "2rem" }}>
                <AlertCircle size={20} className="gold" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Scope boundary note:</strong> {service.scopeCaveat}
                </div>
              </div>
            )}

            <h2>Included engineering foundation</h2>
            <div className="list-rail">
              {service.included.map((item) => (
                <div key={item} className="list-row">
                  <Check size={18} />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <h2 style={{ marginTop: "3rem" }}>
              Compatible add-ons ({service.addons.length})
            </h2>
            {service.addons.length === 0 ? (
              <p className="muted" style={{ lineHeight: 1.65 }}>
                This service is scoped directly around your specific technical requirements without
                separate add-on modules.
              </p>
            ) : (
              <div className="list-rail">
                {service.addons.map((addon) => (
                  <div key={addon.id} className="list-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: ".85rem", alignItems: "flex-start" }}>
                      <Check size={18} />
                      <div>
                        <strong style={{ color: "var(--text)", display: "block" }}>
                          <span className="mono cyan" style={{ marginRight: 8 }}>{addon.id}</span>
                          {addon.label}
                        </strong>
                        <span className="muted" style={{ fontSize: ".86rem" }}>{addon.summary}</span>
                        {addon.note && (
                          <span style={{ display: "block", fontSize: ".78rem", color: "var(--gold)", marginTop: 4 }}>
                            {addon.note}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="mono tabular" style={{ fontSize: ".8rem", color: "var(--text)", whiteSpace: "nowrap" }}>
                      {formatStartingFromBdt(addon.startingPriceBdt)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <h2 style={{ marginTop: "3rem" }}>Ideal for</h2>
            <p className="muted" style={{ lineHeight: 1.7 }}>{service.audience}</p>
          </div>

          <aside className="aside-panel">
            <div className="section-code">INDICATIVE LAUNCH BASELINE</div>
            <h2 className="tabular" style={{ fontSize: "1.75rem", marginBottom: ".5rem" }}>
              {formatStartingFromBdt(service.startingPriceBdt)}
            </h2>
            <p style={{ marginTop: 0 }}>
              Typical timeline: <strong style={{ color: "var(--text)" }}>{service.timelineRange}</strong>
            </p>
            <p style={{ fontSize: ".86rem" }}>
              Every engagement starts with human review and a formal written quotation. Direct
              automated checkout is intentionally disabled.
            </p>
            <div style={{ display: "grid", gap: ".75rem", marginTop: "1.25rem" }}>
              <Link className="btn btn-primary" href={`/build?service=${service.id}`}>
                <span>Configure {service.id} in Builder</span>
                <ArrowRight size={15} />
              </Link>
              <Link className="btn" href="/services">
                Back to all 22 services
              </Link>
            </div>
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--line)",
                display: "flex",
                gap: ".6rem",
                fontSize: ".78rem",
                color: "var(--muted)",
              }}
            >
              <ShieldCheck size={15} className="cyan" style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Need ongoing post-launch maintenance? Pair with NRE PULSE technical care.</span>
            </div>
          </aside>
        </div>
      </section>
    </MarketingShell>
  );
}
