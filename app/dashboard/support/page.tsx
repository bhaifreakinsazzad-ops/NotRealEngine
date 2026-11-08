import { LifeBuoy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SupportTicketForm } from "@/components/support-ticket-form";

export default async function SupportPage() {
  const { supabase, user } = await requireUser();

  // Find user's organization
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organizationId = membership?.organization_id;

  // Fetch client projects for ticket association
  const { data: projects } = await supabase
    .from("projects")
    .select("id, service_id")
    .order("created_at", { ascending: false });

  // Fetch tickets
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, body, state, priority, created_at, project_id")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Client Support & Engineering Desk</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Direct communication channel with technical implementation leads and support engineers.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "2rem", marginTop: "1.5rem", alignItems: "start" }}>
        {/* Ticket History */}
        <div className="panel">
          <div className="panel-head">
            <h2>Your Support Tickets</h2>
            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
              {tickets?.length ?? 0} Records
            </span>
          </div>

          <div className="panel-body">
            {tickets && tickets.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid var(--line)",
                      padding: "1.2rem",
                      background: "var(--bg-deep)",
                      borderRadius: "2px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div>
                        <strong style={{ fontSize: "1rem", color: "var(--text)" }}>{t.subject}</strong>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.76rem", marginTop: "0.2rem" }}>
                          TICKET #{t.id.slice(0, 8)} · Opened {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={t.state === "resolved" ? "status ready" : "status pending"}>
                        {t.state.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: "0.6rem 0", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      {t.body}
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem", paddingTop: "0.6rem", borderTop: "1px solid var(--line)" }}>
                      <span className="mono muted" style={{ fontSize: "0.74rem" }}>
                        Priority: <strong style={{ color: t.priority === "urgent" ? "var(--danger)" : "var(--silver)" }}>{t.priority.toUpperCase()}</strong>
                      </span>
                      {t.project_id && (
                        <span className="mono cyan" style={{ fontSize: "0.74rem" }}>
                          Project #{t.project_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty" style={{ minHeight: "180px" }}>
                <div>
                  <LifeBuoy size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                  <strong style={{ display: "block", color: "var(--silver)" }}>No support tickets open.</strong>
                  <span style={{ fontSize: "0.82rem" }}>
                    If you have questions or need assistance, submit a ticket using the form.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Form */}
        <div className="panel" style={{ borderColor: "var(--cyan)" }}>
          <div className="panel-head" style={{ background: "rgba(32, 230, 238, 0.04)" }}>
            <h2>Open New Support Ticket</h2>
          </div>
          <div className="panel-body">
            {organizationId ? (
              <SupportTicketForm
                organizationId={organizationId}
                projects={
                  (projects || []).map((p) => ({
                    id: p.id,
                    serviceId: p.service_id
                  }))
                }
              />
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                You must belong to an active organization to open support tickets.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
