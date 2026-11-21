import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { ServiceCatalogExplorer } from "@/components/service-catalog-explorer";
import { addons, formatStartingFromBdt } from "@/lib/catalog";

export const metadata = {
  title: "Services — NRE SELECT Canonical Catalog v5",
  description:
    "Browse all 22 official NotRealEngine digital engineering services (13 Standalone + 9 Core Technical) and 13 compatible add-ons with Starting From BDT baselines.",
};

export default function ServicesPage() {
  return (
    <MarketingShell>
      <section className="page-hero">
        <div className="shell">
          <div className="section-code">NRE SELECT · CANONICAL CATALOG V5</div>
          <h1>22 digital engineering services, organized with clarity.</h1>
          <p>
            Explore 13 Standalone Builds and 9 Core Technical Services—plus 13 strictly mapped
            compatible add-ons. Web Application (S08) and Progressive Web App (S09) remain distinct,
            and every engagement starts with a written quotation.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <ServiceCatalogExplorer />
        </div>
      </section>

      <section className="section section-dark">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-code">COMPATIBLE ADD-ONS ({addons.length})</div>
              <h2>Modular capabilities mapped strictly per service.</h2>
            </div>
            <p>
              Add-ons can be attached inside the Project Builder only when compatible with the
              selected core service—preventing incompatible stacks or duplicate billing.
            </p>
          </div>
          <div className="service-card-grid">
            {addons.map((addon) => (
              <div key={addon.id} className="service-card">
                <div className="service-card-top">
                  <span className="service-code-tag">{addon.id} · ADD-ON</span>
                  <span className="service-price-tag tabular">
                    {formatStartingFromBdt(addon.startingPriceBdt)}
                  </span>
                </div>
                <h3>{addon.name}</h3>
                <p>{addon.summary}</p>
                <div className="service-card-foot">
                  <span className="mono" style={{ fontSize: ".72rem", color: "var(--muted)" }}>
                    Compatible with: {addon.compatibleServiceIds.join(", ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/build" className="btn btn-primary">
              Configure a project with compatible add-ons
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
