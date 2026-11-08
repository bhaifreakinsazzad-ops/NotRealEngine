import { FileText, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function BillingPage() {
  const { supabase } = await requireUser();

  const [{ data: invoices }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, status, total_minor, currency, issued_at, due_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_transactions")
      .select("id, provider, state, amount_minor, currency, verified_at, created_at")
      .order("created_at", { ascending: false })
  ]);

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Billing & Financial Invoices</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Track invoices, cleared payment receipts, and commercial accounting statements.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Invoices */}
        <div className="panel">
          <div className="panel-head">
            <h2>Official Invoices</h2>
            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
              {invoices?.length ?? 0} Invoices Issued
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>INVOICE REF</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATUS</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ISSUED</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>DUE</th>
                </tr>
              </thead>
              <tbody>
                {invoices && invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">
                        INV-{inv.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={inv.status === "paid" ? "status ready" : "status pending"}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                        {inv.currency} {(inv.total_minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {inv.due_at ? new Date(inv.due_at).toLocaleDateString() : "Upon Receipt"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                      <FileText size={32} style={{ margin: "0 auto 0.5rem", color: "var(--line-strong)" }} />
                      <span style={{ display: "block", color: "var(--silver)" }}>No invoices generated yet.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Clearance Log */}
        <div className="panel">
          <div className="panel-head">
            <h2>Payment Transactions Log</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>TRANSACTION REF</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>GATEWAY / PROVIDER</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATUS</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>VERIFIED AT</th>
                </tr>
              </thead>
              <tbody>
                {payments && payments.length > 0 ? (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                        TX-{p.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>{p.provider}</td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={p.state === "paid" ? "status ready" : "status pending"}>
                          {p.state.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                        {p.currency} {(p.amount_minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {p.verified_at ? new Date(p.verified_at).toLocaleString() : "Awaiting verification"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                      <ShieldCheck size={32} style={{ margin: "0 auto 0.5rem", color: "var(--line-strong)" }} />
                      <span style={{ display: "block", color: "var(--silver)" }}>No payment transactions recorded.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
