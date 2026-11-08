import Link from "next/link";
import { AlertTriangle, Bell, Database, FileText, LockKeyhole } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [
    briefsRes,
    auditRes,
    leadsRes,
    quotesRes,
    ordersRes,
    paymentsRes,
    invoicesRes,
    projectsRes
  ] = await Promise.all([
    supabase
      .from("project_briefs")
      .select("id,reference,status,service_id,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("leads").select("id,status", { count: "exact" }),
    supabase.from("quotes").select("id,state,total_minor,currency"),
    supabase.from("orders").select("id,state,total_minor,currency"),
    supabase.from("payment_transactions").select("id,state,amount_minor,currency,verified_at"),
    supabase.from("invoices").select("id,status,total_minor,currency"),
    supabase.from("projects").select("id,state")
  ]);

  const queryErrors = [
    briefsRes.error,
    auditRes.error,
    leadsRes.error,
    quotesRes.error,
    ordersRes.error,
    paymentsRes.error,
    invoicesRes.error,
    projectsRes.error
  ].filter(Boolean);

  const briefs = briefsRes.data;
  const audit = auditRes.data;
  const leads = leadsRes.data;
  const quotes = quotesRes.data;
  const orders = ordersRes.data;
  const payments = paymentsRes.data;
  const invoices = invoicesRes.data;
  const projects = projectsRes.data;

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Operational pipeline metrics
  const totalLeads = leads?.length ?? 0;
  const totalQuotes = quotes?.length ?? 0;
  const acceptedQuotes = quotes?.filter((q) => q.state === "accepted").length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const activeProjects =
    projects?.filter((p) => p.state !== "delivered" && p.state !== "cancelled").length ?? 0;

  // 1. Total Order Value (non-cancelled orders, strictly separated by currency)
  const validOrders = orders?.filter((o) => o.state !== "cancelled") ?? [];
  const totalOrderValueBdtMinor = validOrders
    .filter((o) => o.currency === "BDT")
    .reduce((acc, o) => acc + o.total_minor, 0);
  const totalOrderValueUsdMinor = validOrders
    .filter((o) => o.currency === "USD")
    .reduce((acc, o) => acc + o.total_minor, 0);

  // 2. Unpaid Orders (awaiting_payment)
  const unpaidOrders = orders?.filter((o) => o.state === "awaiting_payment") ?? [];
  const unpaidOrdersCount = unpaidOrders.length;
  const unpaidOrderValueBdtMinor = unpaidOrders
    .filter((o) => o.currency === "BDT")
    .reduce((acc, o) => acc + o.total_minor, 0);
  const unpaidOrderValueUsdMinor = unpaidOrders
    .filter((o) => o.currency === "USD")
    .reduce((acc, o) => acc + o.total_minor, 0);

  // 3. Verified Payments Received (strictly from payment_transactions where state = 'paid' AND verified_at IS NOT NULL)
  const verifiedPaidTx =
    payments?.filter((tx) => tx.state === "paid" && Boolean(tx.verified_at)) ?? [];
  const verifiedPaidBdtMinor = verifiedPaidTx
    .filter((tx) => tx.currency === "BDT")
    .reduce((acc, tx) => acc + tx.amount_minor, 0);
  const verifiedPaidUsdMinor = verifiedPaidTx
    .filter((tx) => tx.currency === "USD")
    .reduce((acc, tx) => acc + tx.amount_minor, 0);

  // 4. Refunds (payment_transactions where state IN ('refunded', 'partially_refunded'))
  const refundedTx =
    payments?.filter((tx) => tx.state === "refunded" || tx.state === "partially_refunded") ?? [];
  const refundedCount = refundedTx.length;
  const refundedBdtMinor = refundedTx
    .filter((tx) => tx.currency === "BDT")
    .reduce((acc, tx) => acc + tx.amount_minor, 0);
  const refundedUsdMinor = refundedTx
    .filter((tx) => tx.currency === "USD")
    .reduce((acc, tx) => acc + tx.amount_minor, 0);

  // 5. Outstanding Invoices (invoices where status IN ('issued', 'overdue'))
  const outstandingInvoices =
    invoices?.filter((inv) => inv.status === "issued" || inv.status === "overdue") ?? [];
  const outstandingInvoicesCount = outstandingInvoices.length;
  const outstandingInvoicesBdtMinor = outstandingInvoices
    .filter((inv) => inv.currency === "BDT")
    .reduce((acc, inv) => acc + inv.total_minor, 0);
  const outstandingInvoicesUsdMinor = outstandingInvoices
    .filter((inv) => inv.currency === "USD")
    .reduce((acc, inv) => acc + inv.total_minor, 0);

  const formatMinor = (minor: number) =>
    (minor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  return (
    <div>
      <div className="release-banner">
        Live payments and external email/SMS notifications remain disabled by policy until approved provider credentials are verified.
      </div>

      {queryErrors.length > 0 && (
        <div
          className="error-box"
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem"
          }}
        >
          <AlertTriangle size={18} />
          <span>
            <strong>Telemetry Query Warning:</strong> {queryErrors.length} database metric query(s) reported an issue ({queryErrors[0]?.message}). Displayed figures reflect partial query results.
          </span>
        </div>
      )}

      {/* Primary Operational Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0 1rem"
        }}
      >
        <div className="panel" style={{ padding: "1.2rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>INBOUND LEADS</span>
          <strong style={{ display: "block", fontSize: "1.8rem", marginTop: "0.2rem" }}>{totalLeads}</strong>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>Total verified briefs</span>
        </div>

        <div className="panel" style={{ padding: "1.2rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>QUOTES ISSUED</span>
          <strong style={{ display: "block", fontSize: "1.8rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {totalQuotes}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>{acceptedQuotes} accepted by clients</span>
        </div>

        <div className="panel" style={{ padding: "1.2rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>ACTIVE PROJECTS</span>
          <strong style={{ display: "block", fontSize: "1.8rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {activeProjects}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>In engineering production</span>
        </div>
      </div>

      {/* Separated Commercial & Payment Accounting Metrics (BDT / USD Isolated) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          margin: "0 0 1.5rem"
        }}
      >
        <div className="panel" style={{ padding: "1.1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>TOTAL ORDER VALUE</span>
          <strong style={{ display: "block", fontSize: "1.35rem", marginTop: "0.25rem", color: "var(--text)" }} className="mono">
            BDT {formatMinor(totalOrderValueBdtMinor)}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem", display: "block", marginTop: "0.15rem" }}>
            USD {formatMinor(totalOrderValueUsdMinor)} · {totalOrders} total orders
          </span>
        </div>

        <div className="panel" style={{ padding: "1.1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>UNPAID ORDERS</span>
          <strong style={{ display: "block", fontSize: "1.35rem", marginTop: "0.25rem", color: "var(--gold)" }} className="mono">
            {unpaidOrdersCount} Orders
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem", display: "block", marginTop: "0.15rem" }}>
            BDT {formatMinor(unpaidOrderValueBdtMinor)} / USD {formatMinor(unpaidOrderValueUsdMinor)}
          </span>
        </div>

        <div className="panel" style={{ padding: "1.1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>VERIFIED PAYMENTS RECEIVED</span>
          <strong style={{ display: "block", fontSize: "1.35rem", marginTop: "0.25rem", color: "var(--success)" }} className="mono">
            BDT {formatMinor(verifiedPaidBdtMinor)}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem", display: "block", marginTop: "0.15rem" }}>
            USD {formatMinor(verifiedPaidUsdMinor)} · {verifiedPaidTx.length} verified tx
          </span>
        </div>

        <div className="panel" style={{ padding: "1.1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>REFUNDS RECORDED</span>
          <strong style={{ display: "block", fontSize: "1.35rem", marginTop: "0.25rem", color: "var(--silver)" }} className="mono">
            {refundedCount} Refunds
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem", display: "block", marginTop: "0.15rem" }}>
            BDT {formatMinor(refundedBdtMinor)} / USD {formatMinor(refundedUsdMinor)}
          </span>
        </div>

        <div className="panel" style={{ padding: "1.1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>OUTSTANDING INVOICES</span>
          <strong style={{ display: "block", fontSize: "1.35rem", marginTop: "0.25rem", color: "var(--cyan)" }} className="mono">
            {outstandingInvoicesCount} Open
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem", display: "block", marginTop: "0.15rem" }}>
            BDT {formatMinor(outstandingInvoicesBdtMinor)} / USD {formatMinor(outstandingInvoicesUsdMinor)}
          </span>
        </div>
      </div>

      <div className="app-grid">
        {/* Left Column: Operational Queue */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Recent Inbound Project Briefs</h2>
              <Link href="/admin/leads" className="mono cyan" style={{ fontSize: "0.8rem" }}>
                All Leads ({totalLeads})
              </Link>
            </div>

            {briefs && briefs.length > 0 ? (
              <div className="panel-body">
                {briefs.map((brief) => (
                  <div className="gate-row" key={brief.id} style={{ alignItems: "center" }}>
                    <div>
                      <strong className="mono cyan" style={{ fontSize: "0.85rem" }}>{brief.reference}</strong>
                      <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                        {brief.service_id}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                      <span className="status pending">{brief.status.toUpperCase()}</span>
                      <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                        {new Date(brief.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div>
                  <FileText size={44} style={{ margin: "0 auto 0.75rem", color: "var(--line-strong)" }} />
                  <strong>No production records yet.</strong>
                  <span>Validated project briefs will appear here.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Release Gates & Audit */}
        <aside style={{ display: "grid", gap: "1.5rem" }}>
          <div className="panel">
            <div className="panel-head">
              <h2>Release Gates</h2>
            </div>
            <div className="panel-body">
              <div className="gate-row">
                <span><LockKeyhole size={15} /> Authentication & SSR</span>
                <span className={`status ${configured ? "ready" : "pending"}`}>{configured ? "CONFIGURED" : "PENDING"}</span>
              </div>
              <div className="gate-row">
                <span><Database size={15} /> Database & RLS</span>
                <span className={`status ${configured ? "ready" : "pending"}`}>{configured ? "CONFIGURED" : "PENDING"}</span>
              </div>
              <div className="gate-row">
                <span>Payments Clearance</span>
                <span className="status pending">DISABLED</span>
              </div>
              <div className="gate-row">
                <span><Bell size={15} /> Notifications Outbox</span>
                <span className="status pending">DURABLE / DISABLED</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Recent Audit Stream</h2>
            </div>
            <div className="panel-body">
              {audit && audit.length > 0 ? (
                audit.map((item) => (
                  <div className="gate-row" key={item.id}>
                    <span className="mono" style={{ fontSize: "0.8rem", color: "var(--silver)" }}>{item.action}</span>
                    <span className="mono muted" style={{ fontSize: "0.72rem" }}>
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty" style={{ minHeight: 140 }}>
                  <div><strong>No audit activity yet.</strong></div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
