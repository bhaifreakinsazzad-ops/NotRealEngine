import { CreditCard, ShieldAlert, Webhook } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPaymentsPage() {
  const { supabase } = await requireAdmin();

  const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";

  const [{ data: transactions }, { data: webhookEvents }] = await Promise.all([
    supabase
      .from("payment_transactions")
      .select(`
        id,
        order_id,
        provider,
        provider_event_id,
        provider_transaction_id,
        state,
        amount_minor,
        currency,
        verified_at,
        created_at,
        organizations (
          name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("webhook_events")
      .select("id, provider, provider_event_id, state, processed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  const paidTx = (transactions || []).filter((t) => t.state === "paid" && Boolean(t.verified_at));
  const pendingTx = (transactions || []).filter((t) => t.state === "pending" || t.state === "processing");
  const paidBdtMinor = paidTx.filter((t) => t.currency === "BDT").reduce((acc, t) => acc + t.amount_minor, 0);
  const paidUsdMinor = paidTx.filter((t) => t.currency === "USD").reduce((acc, t) => acc + t.amount_minor, 0);

  const formatMinor = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Payment Records & Webhook Ledger</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Verified provider settlement events, currency-isolated receipts, and idempotent webhook audit log.
          </p>
        </div>
      </div>

      {/* Policy Gate Banner */}
      <div
        className="panel"
        style={{
          marginTop: "1.5rem",
          borderColor: paymentsEnabled ? "var(--cyan)" : "var(--gold)",
          background: paymentsEnabled ? "rgba(32, 230, 238, 0.04)" : "var(--gold-dim)"
        }}
      >
        <div className="panel-body" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <ShieldAlert size={24} className={paymentsEnabled ? "cyan" : "gold"} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ fontSize: "0.95rem", color: "var(--text)", display: "block" }}>
              {paymentsEnabled
                ? "Online Payment Gateway Flag Enabled (PAYMENTS_ENABLED=true)"
                : "Live Payment Collection Disabled by Policy (PAYMENTS_ENABLED=false)"}
            </strong>
            <span style={{ fontSize: "0.84rem", color: "var(--silver)" }}>
              Payment state may become <code>paid</code> only from a verified idempotent provider event with matching currency and minor-unit amount.
            </span>
          </div>
        </div>
      </div>

      {/* Currency-Separated Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0"
        }}
      >
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>VERIFIED PAID (BDT)</span>
          <strong style={{ display: "block", fontSize: "1.5rem", marginTop: "0.2rem", color: "var(--success)" }} className="mono">
            BDT {formatMinor(paidBdtMinor)}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>VERIFIED PAID (USD)</span>
          <strong style={{ display: "block", fontSize: "1.5rem", marginTop: "0.2rem", color: "var(--cyan)" }} className="mono">
            USD {formatMinor(paidUsdMinor)}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>PENDING / PROCESSING</span>
          <strong style={{ display: "block", fontSize: "1.5rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {pendingTx.length}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>WEBHOOK EVENTS</span>
          <strong style={{ display: "block", fontSize: "1.5rem", marginTop: "0.2rem" }}>
            {webhookEvents?.length ?? 0}
          </strong>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Payment Transactions</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {transactions?.length ?? 0} Recorded Transactions
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>TX / ORDER</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>PROVIDER</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>VERIFIED AT</th>
              </tr>
            </thead>
            <tbody>
              {transactions && transactions.length > 0 ? (
                transactions.map((tx) => {
                  const orgName = (tx.organizations as unknown as { name?: string })?.name || "Client Organization";
                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        <span className="cyan">TX-{tx.id.slice(0, 8)}</span>
                        <span className="muted" style={{ display: "block", fontSize: "0.74rem" }}>
                          ORD-{tx.order_id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong>{orgName}</strong>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        {tx.provider}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={tx.state === "paid" ? "status ready" : tx.state === "failed" ? "status danger" : "status pending"}>
                          {tx.state.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                        {tx.currency} {formatMinor(tx.amount_minor)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {tx.verified_at ? new Date(tx.verified_at).toLocaleString() : "Unverified"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <CreditCard size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No payment records yet.</strong>
                    <span style={{ fontSize: "0.82rem" }}>
                      Verified provider events will appear here after merchant approval and configuration.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Idempotent Webhook Log */}
      <div className="panel">
        <div className="panel-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Webhook size={18} className="cyan" /> Inbound Webhook Events
          </h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {webhookEvents?.length ?? 0} Events Logged
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>PROVIDER</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>EVENT ID</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>RECEIVED</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>PROCESSED</th>
              </tr>
            </thead>
            <tbody>
              {webhookEvents && webhookEvents.length > 0 ? (
                webhookEvents.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">{ev.provider}</td>
                    <td style={{ padding: "0.85rem 1rem" }} className="mono">{ev.provider_event_id}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className={ev.state === "processed" ? "status ready" : ev.state === "rejected" || ev.state === "failed" ? "status danger" : "status pending"}>
                        {ev.state.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }} className="muted">
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }} className="muted">
                      {ev.processed_at ? new Date(ev.processed_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    No inbound webhook events recorded yet.
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
