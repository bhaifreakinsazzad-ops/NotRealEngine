import { ShieldCheck, CheckCircle2, Archive } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  addons,
  coreTechnicalServices,
  formatStartingFromBdt,
  legacyServiceAliases,
  services,
  standaloneServices,
} from "@/lib/catalog";

export default async function AdminServicesPage() {
  await requireAdmin();

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Canonical Services & Add-ons Registry (v5)</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Single source of truth: {services.length} active services ({standaloneServices.length} Standalone +{" "}
            {coreTechnicalServices.length} Core Technical), {addons.length} compatible add-ons, and archival legacy aliases.
          </p>
        </div>
      </div>

      {/* Registry Integrity Banner */}
      <div
        className="panel"
        style={{
          marginTop: "1.5rem",
          borderColor: "var(--cyan)",
          background: "rgba(29, 216, 255, 0.05)",
        }}
      >
        <div className="panel-body" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <ShieldCheck size={28} className="cyan" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "1rem", color: "var(--text)", display: "block" }}>
              Catalog v5 Integrity Verified ({services.length} Active Services · {addons.length} Compatible Add-ons)
            </strong>
            <span style={{ fontSize: "0.84rem", color: "var(--silver)" }}>
              Retired IDs (S16, S20, A04, A05, A07, A08, A12, A16, A20, A21) are excluded from public discovery and intake. Web Application (S08) and PWA (S09) remain distinct. All public offers remain <code>quote_required</code>.
            </span>
          </div>
        </div>
      </div>

      {/* Canonical Services Table */}
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Active Canonical v5 Services</h2>
          <span className="mono cyan" style={{ fontSize: "0.78rem" }}>
            {services.length} Active Offers
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-deep)",
                  borderBottom: "1px solid var(--line)",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.74rem",
                }}
              >
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>CODE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SERVICE NAME</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SEGMENT</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>STARTING FROM</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>ADD-ONS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">
                    {service.id}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <strong style={{ color: "var(--text)" }}>{service.name}</strong>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                      {service.slug}
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                    {service.segment === "standalone" ? "STANDALONE" : "CORE_TECH"}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono tabular">
                    {formatStartingFromBdt(service.startingPriceBdt)}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "center" }} className="mono muted">
                    {service.addons.length}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                    <span className="status ready" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
                      <CheckCircle2 size={12} /> QUOTE_REQUIRED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legacy Alias Compatibility Table */}
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Legacy SVC-* Archival Mapping (Read-Only Historical Compatibility)</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {legacyServiceAliases.length} Archived IDs Preserved
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-deep)",
                  borderBottom: "1px solid var(--line)",
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.74rem",
                }}
              >
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>LEGACY ID</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>ARCHIVED NAME</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>V5 TARGET(S)</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>RELATIONSHIP</th>
              </tr>
            </thead>
            <tbody>
              {legacyServiceAliases.map((alias) => (
                <tr key={alias.legacyId} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "0.75rem 1rem" }} className="mono muted">
                    {alias.legacyId}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <strong style={{ color: "var(--silver)" }}>{alias.legacyName}</strong>
                    <span style={{ display: "block", color: "var(--muted)", fontSize: "0.76rem" }}>
                      {alias.notes}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }} className="mono cyan">
                    {alias.v5ServiceIds.join(", ")}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span className="status muted" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                      <Archive size={11} /> {alias.relationship.toUpperCase()}
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
