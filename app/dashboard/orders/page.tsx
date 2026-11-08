import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type OrderState } from "@/lib/domain/states";

export default async function ClientOrdersPage() {
  const { supabase } = await requireUser();

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id,
      state,
      currency,
      total_minor,
      created_at,
      projects (
        id
      )
    `)
    .order("created_at", { ascending: false });

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
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Commercial Orders</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Track order status, payment verification, and linked engineering workspaces.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Order History</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {orders?.length ?? 0} records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ORDER REF</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATUS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>DATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {orders && orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <Link href={`/orders/${o.id}`} className="mono cyan" style={{ fontWeight: 600 }}>
                        ORD-{o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className={stateBadges[o.state as OrderState] || "status"}>
                        {o.state.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                      {o.currency} {(o.total_minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }} className="muted">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                      <Link href={`/orders/${o.id}`} className="btn btn-quiet" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "30px" }}>
                        View Details <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <ShoppingCart size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No orders on record.</strong>
                    <span style={{ fontSize: "0.82rem" }}>
                      Accepted quotations convert into official orders automatically.
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
