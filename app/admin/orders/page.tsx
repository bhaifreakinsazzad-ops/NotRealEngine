import Link from "next/link";
import { FolderKanban, ShoppingCart } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type OrderState } from "@/lib/domain/states";

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateFilter } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("orders")
    .select(`
      id,
      state,
      currency,
      total_minor,
      created_at,
      quote_id,
      organizations (
        id,
        name,
        slug
      ),
      projects (
        id,
        state
      )
    `)
    .order("created_at", { ascending: false });

  if (stateFilter && stateFilter !== "all") {
    query = query.eq("state", stateFilter);
  }

  const { data: orders } = await query;

  const totalCount = orders?.length ?? 0;
  const awaitingCount = orders?.filter((o) => o.state === "awaiting_payment").length ?? 0;
  const confirmedCount = orders?.filter((o) => o.state === "confirmed").length ?? 0;
  const inProdCount = orders?.filter((o) => o.state === "in_production").length ?? 0;
  const completedCount = orders?.filter((o) => o.state === "completed").length ?? 0;

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
    <div>
      <div className="app-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Orders Operations Center</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Track client orders, operational clearance, payment verification, and production handoffs.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0"
        }}
      >
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>TOTAL ORDERS</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem" }}>{totalCount}</strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>AWAITING PAYMENT</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {awaitingCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>CONFIRMED</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {confirmedCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>IN PRODUCTION</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {inProdCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>COMPLETED</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--success)" }}>
            {completedCount}
          </strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {[
          { label: "All Orders", val: "all" },
          { label: "Awaiting Payment", val: "awaiting_payment" },
          { label: "Confirmed", val: "confirmed" },
          { label: "In Production", val: "in_production" },
          { label: "Completed", val: "completed" },
          { label: "On Hold / Cancelled", val: "on_hold" }
        ].map((tab) => {
          const isActive = (stateFilter ?? "all") === tab.val;
          return (
            <Link
              key={tab.val}
              href={`/admin/orders${tab.val === "all" ? "" : `?state=${tab.val}`}`}
              className="mono"
              style={{
                padding: "0.45rem 0.9rem",
                fontSize: "0.78rem",
                color: isActive ? "var(--cyan)" : "var(--silver)",
                background: isActive ? "var(--cyan-dim)" : "transparent",
                border: "1px solid",
                borderColor: isActive ? "var(--cyan)" : "var(--line)",
                borderRadius: "2px"
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="panel">
        <div className="panel-head">
          <h2>Orders Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {orders?.length ?? 0} records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-deep)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem" }}>ORDER REF</th>
                <th style={{ padding: "0.85rem 1rem" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem" }}>STATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem" }}>WORKSPACE</th>
                <th style={{ padding: "0.85rem 1rem" }}>DATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? (
                orders.map((o) => {
                  const orgName = (o.organizations as unknown as { name?: string })?.name || "Unassigned";
                  const totalFormatted = (o.total_minor / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                  const hasProject = Boolean(o.projects);

                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <Link href={`/admin/orders/${o.id}`} className="mono cyan" style={{ fontWeight: 600 }}>
                          ORD-{o.id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <strong>{orgName}</strong>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span className={stateBadges[o.state as OrderState] || "status"}>
                          {o.state.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", textAlign: "right" }} className="mono">
                        {o.currency} {totalFormatted}
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        {hasProject ? (
                          <span className="mono cyan" style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <FolderKanban size={13} /> Active
                          </span>
                        ) : (
                          <span className="mono muted" style={{ fontSize: "0.78rem" }}>Not provisioned</span>
                        )}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem" }} className="muted">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <Link href={`/admin/orders/${o.id}`} className="btn btn-quiet" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", minHeight: "32px" }}>
                            Manage
                          </Link>
                          <Link href={`/orders/${o.id}`} className="btn btn-quiet" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", minHeight: "32px" }}>
                            Client View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <ShoppingCart size={36} style={{ margin: "0 auto 0.75rem", color: "var(--line-strong)" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--silver)" }}>No orders registered.</p>
                    <span style={{ fontSize: "0.82rem" }}>
                      Orders are created automatically upon customer quotation acceptance.
                    </span>
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
