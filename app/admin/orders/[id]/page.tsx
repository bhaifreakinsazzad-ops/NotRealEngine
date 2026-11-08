import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderKanban, ShieldCheck, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type OrderState } from "@/lib/domain/states";
import { AdminOrderControls } from "@/components/admin-order-controls";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

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
        id,
        name,
        slug
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  // Fetch project if linked
  const { data: project } = await supabase
    .from("projects")
    .select("id, state, service_id, revision_limit, revision_count, created_at")
    .eq("order_id", id)
    .maybeSingle();

  // Fetch payments
  const { data: payments } = await supabase
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
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href="/admin/orders"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Orders Register
        </Link>
      </div>

      {/* Main Order Card */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
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
              Client: <strong>{orgName}</strong> · Placed {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              ORDER VALUATION
            </span>
            <strong style={{ fontSize: "1.75rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
              {order.currency} {formattedTotal}
            </strong>
          </div>
        </div>

        <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
          <AdminOrderControls
            orderId={order.id}
            state={order.state as OrderState}
            hasProject={Boolean(project)}
            projectId={project?.id}
          />
        </div>
      </div>

      {/* Project Status Card */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FolderKanban size={18} className="cyan" /> Associated Project Workspace
          </h2>
        </div>
        <div className="panel-body">
          {project ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <strong style={{ display: "block", fontSize: "1rem", color: "var(--text)" }}>
                  Project #{project.id.slice(0, 8)} ({project.service_id})
                </strong>
                <span className="mono muted" style={{ fontSize: "0.82rem" }}>
                  Current State: <strong className="cyan">{project.state.toUpperCase()}</strong> · Revisions: {project.revision_count}/{project.revision_limit}
                </span>
              </div>
              <Link href={`/admin/projects`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                Open Project Management <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
              <p style={{ margin: "0 0 0.5rem" }}>
                No project record has been provisioned yet for this order.
              </p>
              {order.state === "confirmed" && (
                <p style={{ margin: 0, color: "var(--cyan)" }}>
                  Use the &ldquo;Initialize Project Workspace&rdquo; action above to create the project workspace and initial milestone schedule.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment Transactions Register */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={18} className="cyan" /> Payment Clearance & Transactions
          </h2>
        </div>
        <div className="panel-body">
          {payments && payments.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>PROVIDER</th>
                  <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>STATE</th>
                  <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>VERIFIED</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="mono muted" style={{ padding: "0.6rem 0.8rem" }}>{p.id.slice(0, 8)}</td>
                    <td style={{ padding: "0.6rem 0.8rem" }}>{p.provider}</td>
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span className={p.state === "paid" ? "status ready" : "status pending"}>
                        {p.state.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem", textAlign: "right" }} className="mono">
                      {p.currency} {(p.amount_minor / 100).toLocaleString()}
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem" }} className="muted">
                      {p.verified_at ? new Date(p.verified_at).toLocaleString() : "Pending"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
              No external payment transactions logged yet. Commercial state is currently {order.state}.
            </p>
          )}
        </div>
      </div>

      {/* Snapshot Items */}
      {snapshot.items && snapshot.items.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Commercial Scope & Line Items</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>ITEM</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>QTY</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>UNIT PRICE</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>TOTAL</th>
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
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
