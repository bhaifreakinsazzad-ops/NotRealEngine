import Link from "next/link";
import { Bell, Database, FileText, LockKeyhole } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const [
    { data: briefs },
    { data: audit },
    { data: leads },
    { data: quotes },
    { data: orders },
    { data: projects }
  ] = await Promise.all([
    supabase.from("project_briefs").select("id,reference,status,service_id,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("audit_logs").select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("leads").select("id,status", { count: "exact" }),
    supabase.from("quotes").select("id,state,total_minor,currency"),
    supabase.from("orders").select("id,state,total_minor,currency"),
    supabase.from("projects").select("id,state")
  ]);

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Compute truth-grounded metrics
  const totalLeads = leads?.length ?? 0;
  const totalQuotes = quotes?.length ?? 0;
  const acceptedQuotes = quotes?.filter((q) => q.state === "accepted").length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const confirmedOrders = orders?.filter((o) => ["confirmed", "in_production", "completed"].includes(o.state)).length ?? 0;
  const activeProjects = projects?.filter((p) => p.state !== "delivered" && p.state !== "cancelled").length ?? 0;

  // Calculate confirmed revenue in BDT minor units
  const confirmedRevenueMinor = orders
    ?.filter((o) => ["confirmed", "in_production", "completed"].includes(o.state) && o.currency === "BDT")
    .reduce((acc, o) => acc + o.total_minor, 0) ?? 0;

  return (
    <div>
      <div className="release-banner">
        Live payments and external email/SMS notifications remain disabled by policy until approved provider credentials are verified.
      </div>

      {/* Real Operations Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0"
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
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>CONFIRMED REVENUE</span>
          <strong style={{ display: "block", fontSize: "1.8rem", marginTop: "0.2rem", color: "var(--success)" }}>
            BDT {(confirmedRevenueMinor / 100).toLocaleString()}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>{confirmedOrders} of {totalOrders} orders</span>
        </div>

        <div className="panel" style={{ padding: "1.2rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>ACTIVE PROJECTS</span>
          <strong style={{ display: "block", fontSize: "1.8rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {activeProjects}
          </strong>
          <span className="mono muted" style={{ fontSize: "0.72rem" }}>In engineering production</span>
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
