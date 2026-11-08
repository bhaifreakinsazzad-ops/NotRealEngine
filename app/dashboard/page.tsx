import Link from "next/link";
import { FolderKanban, ArrowRight, Clock, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type ProjectState } from "@/lib/domain/states";

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  // Fetch client projects, quotes, orders, and invoices under RLS
  const [
    { data: projects },
    { data: pendingQuotes },
    { data: orders },
    { data: invoices }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(`
        id,
        state,
        service_id,
        revision_count,
        revision_limit,
        created_at,
        updated_at,
        milestones (
          id,
          state
        )
      `)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("quotes")
      .select("id, currency, total_minor, valid_until, state, created_at")
      .eq("state", "sent")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("orders")
      .select("id, state, currency, total_minor, created_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("invoices")
      .select("id, status, total_minor, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(4)
  ]);

  const stateBadges: Record<ProjectState, string> = {
    awaiting_requirements: "status pending",
    requirements_review: "status pending",
    ready_for_production: "status info",
    in_progress: "status info",
    internal_qa: "status info",
    client_review: "status gold",
    revision: "status danger",
    approved: "status ready",
    delivered: "status ready",
    on_hold: "status danger",
    cancelled: "status danger"
  };

  return (
    <div>
      {/* Top Welcome Banner */}
      <div className="panel" style={{ marginBottom: "1.5rem", background: "linear-gradient(180deg, var(--surface) 0%, var(--bg-deep) 100%)" }}>
        <div className="panel-body" style={{ padding: "1.8rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.35rem" }}>Client Delivery Workspace</h1>
            <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>
              Active engineering projects, technical milestones, deliverable sign-offs, and billing registers.
            </p>
          </div>
          <Link href="/build" className="btn btn-primary">
            <Plus size={16} /> Configure New Project
          </Link>
        </div>
      </div>

      {/* Pending Actions Callout if any quotes are awaiting client decision */}
      {pendingQuotes && pendingQuotes.length > 0 && (
        <div className="panel" style={{ marginBottom: "1.5rem", borderColor: "var(--cyan)" }}>
          <div className="panel-body" style={{ background: "rgba(32, 230, 238, 0.05)" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                <Clock size={24} className="cyan" />
                <div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--cyan)", display: "block" }}>
                    {pendingQuotes.length} Commercial Quotation{pendingQuotes.length > 1 ? "s" : ""} Awaiting Sign-off
                  </strong>
                  <span className="mono muted" style={{ fontSize: "0.82rem" }}>
                    Review engineering scope, deliverables, and commercial terms to authorize order placement.
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                {pendingQuotes.map((q) => (
                  <Link key={q.id} href={`/quotes/${q.id}`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
                    Review Quote #{q.id.slice(0, 8)} <ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Projects & Sidebar */}
      <div className="app-grid">
        {/* Left Column: Projects */}
        <div>
          <div className="panel">
            <div className="panel-head">
              <h2>Active Projects</h2>
              <Link href="/dashboard/projects" className="mono cyan" style={{ fontSize: "0.82rem" }}>
                View All ({projects?.length ?? 0})
              </Link>
            </div>

            <div className="panel-body">
              {projects && projects.length > 0 ? (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {projects.map((proj) => {
                    const milestones = (proj.milestones as Array<{ id: string; state: string }>) || [];
                    const completed = milestones.filter((m) => m.state === "complete").length;
                    const progressPercent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

                    return (
                      <div
                        key={proj.id}
                        style={{
                          border: "1px solid var(--line)",
                          padding: "1.2rem",
                          background: "var(--bg-deep)",
                          borderRadius: "2px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.6rem" }}>
                          <div>
                            <Link href={`/dashboard/projects/${proj.id}`} style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                              Project #{proj.id.slice(0, 8)}
                            </Link>
                            <span className="mono muted" style={{ display: "block", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                              Service: {proj.service_id}
                            </span>
                          </div>
                          <span className={stateBadges[proj.state as ProjectState] || "status"}>
                            {proj.state.replace("_", " ").toUpperCase()}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginTop: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.3rem" }}>
                            <span className="mono muted">Milestone Completion</span>
                            <span className="mono cyan">{completed}/{milestones.length} ({progressPercent}%)</span>
                          </div>
                          <div style={{ height: "4px", background: "var(--surface-3)", borderRadius: "2px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${progressPercent}%`,
                                height: "100%",
                                background: "var(--cyan)",
                                transition: "width 300ms ease"
                              }}
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.8rem", borderTop: "1px solid var(--line)" }}>
                          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
                            Revisions: {proj.revision_count}/{proj.revision_limit} Used
                          </span>
                          <Link href={`/dashboard/projects/${proj.id}`} className="mono cyan" style={{ fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            Open Workspace <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty">
                  <div>
                    <FolderKanban size={44} style={{ margin: "0 auto 0.75rem", color: "var(--line-strong)" }} />
                    <strong>No active projects found.</strong>
                    <span>Your projects will appear here once an accepted quote order is confirmed.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Orders & Billing */}
        <aside style={{ display: "grid", gap: "1.5rem" }}>
          {/* Orders */}
          <div className="panel">
            <div className="panel-head">
              <h2>Recent Orders</h2>
              <Link href="/dashboard/orders" className="mono cyan" style={{ fontSize: "0.78rem" }}>
                All Orders
              </Link>
            </div>
            <div className="panel-body">
              {orders && orders.length > 0 ? (
                orders.map((ord) => (
                  <div key={ord.id} className="gate-row" style={{ alignItems: "center" }}>
                    <div>
                      <Link href={`/orders/${ord.id}`} className="mono cyan" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        ORD-{ord.id.slice(0, 8).toUpperCase()}
                      </Link>
                      <span className="muted" style={{ display: "block", fontSize: "0.75rem" }}>
                        {ord.currency} {(ord.total_minor / 100).toLocaleString()}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.74rem", color: ord.state === "confirmed" ? "var(--success)" : "var(--gold)" }}>
                      {ord.state.toUpperCase()}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.84rem", padding: "1rem 0" }}>
                  No orders placed yet.
                </div>
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="panel">
            <div className="panel-head">
              <h2>Billing & Invoices</h2>
              <Link href="/dashboard/billing" className="mono cyan" style={{ fontSize: "0.78rem" }}>
                View Invoices
              </Link>
            </div>
            <div className="panel-body">
              {invoices && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <div key={inv.id} className="gate-row" style={{ alignItems: "center" }}>
                    <span className="mono" style={{ fontSize: "0.82rem" }}>
                      INV-{inv.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="mono" style={{ fontSize: "0.82rem" }}>
                      {inv.currency} {(inv.total_minor / 100).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--muted)", fontSize: "0.84rem", padding: "1rem 0" }}>
                  No invoices issued yet.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
