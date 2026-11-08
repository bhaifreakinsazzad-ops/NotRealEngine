import { LifeBuoy } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminSupportPage() {
  const { supabase } = await requireAdmin();

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(`
      id,
      subject,
      body,
      state,
      priority,
      created_at,
      organization_id,
      project_id,
      organizations (
        name
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Support Tickets Operations</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Client communication, technical inquiry desk, and escalations management.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Active Support Tickets</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {tickets?.length ?? 0} Tickets
          </span>
        </div>

        <div className="panel-body">
          {tickets && tickets.length > 0 ? (
            <div style={{ display: "grid", gap: "1rem" }}>
              {tickets.map((t) => {
                const org = t.organizations as unknown as { name?: string };

                return (
                  <div key={t.id} style={{ border: "1px solid var(--line)", padding: "1.2rem", background: "var(--bg-deep)", borderRadius: "2px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <strong style={{ fontSize: "1.05rem", color: "var(--text)" }}>{t.subject}</strong>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.78rem", marginTop: "0.2rem" }}>
                          Client: <strong>{org?.name || "Direct Client"}</strong> · Opened {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span className="mono" style={{ fontSize: "0.74rem", color: t.priority === "urgent" ? "var(--danger)" : "var(--silver)" }}>
                          {t.priority.toUpperCase()}
                        </span>
                        <span className={t.state === "resolved" ? "status ready" : "status pending"}>
                          {t.state.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: "0.5rem 0 0", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      {t.body}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div>
                <LifeBuoy size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                <strong style={{ display: "block", color: "var(--silver)" }}>No active support inquiries.</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
