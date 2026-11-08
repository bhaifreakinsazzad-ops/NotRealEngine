import Link from "next/link";
import { FileText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminLeadControls } from "@/components/admin-lead-controls";

export default async function AdminLeadsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("leads")
    .select(`
      id,
      status,
      created_at,
      project_brief_id,
      project_briefs (
        id,
        reference,
        service_id,
        contact_name,
        contact_email,
        contact_phone,
        organization_name,
        organization_id,
        payload,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data: leads } = await query;

  const totalCount = leads?.length ?? 0;
  const newCount = leads?.filter((l) => l.status === "new").length ?? 0;
  const reviewingCount = leads?.filter((l) => l.status === "reviewing").length ?? 0;
  const qualifiedCount = leads?.filter((l) => l.status === "qualified").length ?? 0;

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Inbound Leads & Project Briefs</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Review server-validated customer inquiries, qualify requirements, and generate formal quotations.
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
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>TOTAL LEADS</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem" }}>{totalCount}</strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>NEW INTAKE</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {newCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>IN REVIEW</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {reviewingCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>QUALIFIED</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--success)" }}>
            {qualifiedCount}
          </strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {[
          { label: "All Leads", val: "all" },
          { label: "New", val: "new" },
          { label: "Reviewing", val: "reviewing" },
          { label: "Qualified", val: "qualified" },
          { label: "Converted", val: "converted" },
          { label: "Closed / Unqualified", val: "closed" }
        ].map((tab) => {
          const isActive = (statusFilter ?? "all") === tab.val;
          return (
            <Link
              key={tab.val}
              href={`/admin/leads${tab.val === "all" ? "" : `?status=${tab.val}`}`}
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

      {/* Leads Register */}
      <div className="panel">
        <div className="panel-head">
          <h2>Inbound Briefs Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {leads?.length ?? 0} records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>REF</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>CONTACT</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SERVICE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STATUS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>RECEIVED</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {leads && leads.length > 0 ? (
                leads.map((l) => {
                  const brief = l.project_briefs as unknown as {
                    id: string;
                    reference: string;
                    service_id: string;
                    contact_name: string;
                    contact_email: string;
                    contact_phone: string;
                    organization_name?: string | null;
                    organization_id?: string | null;
                  };

                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">
                        {brief?.reference || l.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong>{brief?.contact_name}</strong>
                        <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                          {brief?.contact_email} · {brief?.contact_phone}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {brief?.organization_name || "Direct Client"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        {brief?.service_id}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={l.status === "qualified" ? "status ready" : l.status === "new" ? "status info" : "status pending"}>
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <AdminLeadControls
                          leadId={l.id}
                          currentStatus={l.status}
                          briefId={l.project_brief_id}
                          organizationId={brief?.organization_id}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <FileText size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No leads in queue.</strong>
                    <span style={{ fontSize: "0.82rem" }}>
                      New customer inquiries submitted through the Project Builder will appear here.
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
