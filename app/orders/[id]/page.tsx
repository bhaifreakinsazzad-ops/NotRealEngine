import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, FolderKanban, AlertCircle, ArrowRight, Layers, FileText } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type OrderState } from "@/lib/domain/states";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      state,
      currency,
      total_minor,
      commercial_snapshot,
      created_at,
      organization_id,
      quote_id,
      organizations (
        name,
        slug
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Check if project exists
  const { data: project } = await supabase
    .from("projects")
    .select("id, state, service_id, revision_limit, revision_count")
    .eq("order_id", id)
    .maybeSingle();

  // Check for payment transactions
  const { data: transactions } = await supabase
    .from("payment_transactions")
    .select("id, provider, state, amount_minor, currency, verified_at, created_at")
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const orgName = (order.organizations as unknown as { name?: string })?.name || "Client Organization";
  const formattedTotal = (order.total_minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const snapshot = (order.commercial_snapshot as {
    scope?: {
      summary?: string;
      deliverables?: string[];
      exclusions?: string[];
      milestones?: string[];
    };
    items?: Array<{
      label: string;
      description?: string;
      quantity: number;
      unitAmountMinor: number;
      recurringInterval?: string;
    }>;
    termsVersion?: string;
  }) || {};

  const stateBadges: Record<OrderState, string> = {
    draft: "status pending",
    awaiting_acceptance: "status pending",
    awaiting_payment: "status pending",
    confirmed: "status ready",
    in_production: "status info",
    completed: "status ready",
    cancelled: "status danger",
    on_hold: "status danger"
  };

  return (
    <main id="main" className="shell section" style={{ maxWidth: "1050px", padding: "40px 0 80px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/dashboard/orders"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Orders
        </Link>
      </div>

      <div className="panel">
        {/* Header */}
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem" }}>
                Order ORD-{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <span className={stateBadges[order.state as OrderState] || "status"}>
                {order.state.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Organization: {orgName} · Placed {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              ORDER VALUATION
            </span>
            <strong style={{ fontSize: "1.8rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
              {order.currency} {formattedTotal}
            </strong>
          </div>
        </div>

        <div className="panel-body" style={{ padding: "2rem" }}>
          {/* Project Workspace Link Banner */}
          {project ? (
            <div
              style={{
                border: "1px solid var(--cyan)",
                background: "var(--cyan-dim)",
                padding: "1.5rem",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
              }}
            >
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <FolderKanban size={28} className="cyan" />
                <div>
                  <h3 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem", color: "var(--text)" }}>
                    Dedicated Project Workspace Active
                  </h3>
                  <span className="mono muted" style={{ fontSize: "0.82rem" }}>
                    Status: <strong className="cyan">{project.state.replace("_", " ").toUpperCase()}</strong> · Included Revisions: {project.revision_count}/{project.revision_limit}
                  </span>
                </div>
              </div>
              <Link href={`/dashboard/projects/${project.id}`} className="btn btn-primary">
                Open Workspace <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--line-strong)",
                background: "var(--bg-deep)",
                padding: "1.2rem",
                marginBottom: "2rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start"
              }}
            >
              <Clock size={22} className="gold" style={{ flexShrink: 0, marginTop: "0.2rem" }} />
              <div>
                <strong style={{ display: "block", color: "var(--silver)", fontSize: "0.95rem" }}>
                  Workspace Provisioning Status
                </strong>
                <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {order.state === "awaiting_payment"
                    ? "Your engineering workspace will be provisioned automatically once payment confirmation is logged."
                    : "Your dedicated engineering workspace is being prepared by technical operations."}
                </p>
              </div>
            </div>
          )}

          {/* Payment Details & Security Notice */}
          <div style={{ marginBottom: "2.5rem", border: "1px solid var(--line)", padding: "1.5rem", background: "var(--surface)" }}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} className="cyan" /> Commercial Payment Clearance
            </h3>

            <p style={{ color: "var(--silver)", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1rem" }}>
              To complete payment for this order, please remit funds using the unique reference code:
              <strong className="mono cyan" style={{ marginLeft: "0.5rem", background: "var(--bg-deep)", padding: "0.2rem 0.5rem", border: "1px solid var(--line)" }}>
                ORD-{order.id.slice(0, 8).toUpperCase()}
              </strong>
            </p>

            <div style={{ border: "1px solid var(--gold)", background: "var(--gold-dim)", padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--silver)", display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <AlertCircle size={16} className="gold" style={{ flexShrink: 0 }} />
              <span>
                <strong>System Security Integrity:</strong> Commercial payment states become &ldquo;paid&rdquo; exclusively through verified idempotent payment provider webhooks or signed operational clearance.
              </span>
            </div>

            {/* Transactions Log if present */}
            {transactions && transactions.length > 0 && (
              <div style={{ marginTop: "1.2rem" }}>
                <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  RECORDED PAYMENT TRANSACTIONS
                </h4>
                <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                        <th style={{ padding: "0.5rem 0.75rem" }}>PROVIDER</th>
                        <th style={{ padding: "0.5rem 0.75rem" }}>STATE</th>
                        <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>AMOUNT</th>
                        <th style={{ padding: "0.5rem 0.75rem" }}>TIMESTAMP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td style={{ padding: "0.5rem 0.75rem" }}>{tx.provider}</td>
                          <td style={{ padding: "0.5rem 0.75rem" }}>
                            <span className={tx.state === "paid" ? "status ready" : "status pending"}>
                              {tx.state.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }} className="mono">
                            {tx.currency} {(tx.amount_minor / 100).toLocaleString()}
                          </td>
                          <td style={{ padding: "0.5rem 0.75rem" }} className="muted">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Scope and Deliverables from Commercial Snapshot */}
          {snapshot.scope && (
            <div style={{ marginBottom: "2.5rem" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={18} className="cyan" /> Committed Scope & Deliverables
              </h3>
              {snapshot.scope.summary && (
                <p style={{ color: "var(--silver)", lineHeight: 1.6, fontSize: "0.92rem", marginBottom: "1rem" }}>
                  {snapshot.scope.summary}
                </p>
              )}

              {snapshot.scope.deliverables && snapshot.scope.deliverables.length > 0 && (
                <div style={{ border: "1px solid var(--line)", padding: "1.2rem", background: "var(--bg-deep)" }}>
                  <h4 style={{ margin: "0 0 0.5rem", color: "var(--cyan)", fontSize: "0.88rem" }}>
                    Approved Deliverables
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--silver)", fontSize: "0.85rem", lineHeight: 1.6 }}>
                    {snapshot.scope.deliverables.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Line Items Table from Snapshot */}
          {snapshot.items && snapshot.items.length > 0 && (
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Layers size={18} className="cyan" /> Ordered Commercial Items
              </h3>
              <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>ITEM</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>QTY</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>UNIT PRICE</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>LINE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <strong>{item.label}</strong>
                          {item.description && (
                            <span style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem" }}>
                              {item.description}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.8rem 1rem", textAlign: "center" }} className="mono">{item.quantity}</td>
                        <td style={{ padding: "0.8rem 1rem", textAlign: "right" }} className="mono">
                          {(item.unitAmountMinor / 100).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.8rem 1rem", textAlign: "right" }} className="mono">
                          <strong>{((item.quantity * item.unitAmountMinor) / 100).toLocaleString()}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--bg-deep)", fontWeight: "bold" }}>
                      <td colSpan={3} style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--silver)" }}>
                        TOTAL:
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "1.05rem", color: "var(--cyan)" }}>
                        {order.currency} {formattedTotal}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
