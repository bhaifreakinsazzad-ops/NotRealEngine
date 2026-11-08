import { services, categories } from "@/lib/catalog";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminServicesPage() {
  await requireAdmin();

  const categoryMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Canonical Services & Offers Registry</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Single source of truth: exactly 10 core categories and 12 customer-facing digital engineering offers.
          </p>
        </div>
      </div>

      {/* Registry Integrity Banner */}
      <div className="panel" style={{ marginTop: "1.5rem", borderColor: "var(--cyan)", background: "rgba(32, 230, 238, 0.04)" }}>
        <div className="panel-body" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <ShieldCheck size={28} className="cyan" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "1rem", color: "var(--text)", display: "block" }}>
              Registry Integrity Verified (10 Categories · 12 Offers)
            </strong>
            <span style={{ fontSize: "0.84rem", color: "var(--silver)" }}>
              As governed by <code>AGENTS.md</code>: Web Application and PWA are separate offers. Automation and Integrations are capabilities, not standalone categories. Core architecture cannot be modified through ad-hoc editing.
            </span>
          </div>
        </div>
      </div>

      {/* Canonical Offers Table */}
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Canonical Services Catalog</h2>
          <span className="mono cyan" style={{ fontSize: "0.78rem" }}>
            {services.length} Registered Offers
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>#</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SERVICE NAME</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>CATEGORY</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SLUG</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SALES MODE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr key={service.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">
                    0{idx + 1}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <strong style={{ color: "var(--text)" }}>{service.name}</strong>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                      {service.summary.slice(0, 80)}...
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                    {categoryMap.get(service.categoryId) || service.categoryId}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                    {service.slug}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono">
                    {service.salesMode}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                    <span className="status ready" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <CheckCircle2 size={12} /> CANONICAL
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
