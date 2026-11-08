import { ShieldAlert, DollarSign } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminPriceApproval } from "@/components/admin-price-approval";

export default async function AdminPricingPage() {
  const { supabase } = await requireAdmin();

  const { data: priceVersions } = await supabase
    .from("price_versions")
    .select(`
      id,
      package_id,
      kind,
      amount_minor,
      currency,
      market,
      status,
      valid_from,
      valid_to,
      approved_at,
      approved_by,
      packages (
        name,
        service_id,
        status,
        active
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Commercial Pricing Governance</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Governed integer minor-unit price schedules, market eligibility, and operational sign-off.
          </p>
        </div>
      </div>

      {/* Commercial Policy Alert */}
      <div className="panel" style={{ marginTop: "1.5rem", borderColor: "var(--gold)", background: "var(--gold-dim)" }}>
        <div className="panel-body" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <ShieldAlert size={26} className="gold" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "0.95rem", color: "var(--text)", display: "block" }}>
              Commercial Invariant Policy
            </strong>
            <span style={{ fontSize: "0.84rem", color: "var(--silver)" }}>
              As required by company rules: All customer-visible prices require integer minor units, active service, approved package, market/currency applicability, valid effective dates, and authenticated staff sign-off. The recorded BDT 999 promotional reference remains unorderable until founder approval.
            </span>
          </div>
        </div>
      </div>

      {/* Price Versions Table */}
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Price Versions Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {priceVersions?.length ?? 0} Recorded Price Points
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>PACKAGE / SERVICE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>KIND</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>MARKET</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATUS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>EFFECTIVE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>APPROVAL ACTION</th>
              </tr>
            </thead>
            <tbody>
              {priceVersions && priceVersions.length > 0 ? (
                priceVersions.map((pv) => {
                  const pkg = pv.packages as unknown as { name?: string; service_id?: string };
                  const amountMajor = (pv.amount_minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

                  return (
                    <tr key={pv.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong style={{ color: "var(--text)" }}>{pkg?.name || "Package"}</strong>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.76rem" }}>
                          {pkg?.service_id}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        {pv.kind}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono cyan">
                        {pv.currency} {amountMajor}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }} className="mono">
                        {pv.market}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={pv.status === "approved" ? "status ready" : "status pending"}>
                          {pv.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem" }} className="mono muted">
                        {new Date(pv.valid_from).toLocaleDateString()} {pv.valid_to ? `to ${new Date(pv.valid_to).toLocaleDateString()}` : "onwards"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <AdminPriceApproval priceVersionId={pv.id} status={pv.status} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <DollarSign size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No price versions recorded.</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
