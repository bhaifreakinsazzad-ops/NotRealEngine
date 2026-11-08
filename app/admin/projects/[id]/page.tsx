import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type ProjectState } from "@/lib/domain/states";
import { AdminProjectControls, AdminMilestoneRow } from "@/components/admin-project-controls";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id,
      state,
      service_id,
      revision_count,
      revision_limit,
      created_at,
      updated_at,
      order_id,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch milestones
  const { data: milestones } = await supabase
    .from("milestones")
    .select("id, label, state, display_order, due_at, completed_at")
    .eq("project_id", id)
    .order("display_order", { ascending: true });

  // Fetch requirements
  const { data: requirements } = await supabase
    .from("project_requirements")
    .select("id, key, label, required, response, submitted_at")
    .eq("project_id", id)
    .order("required", { ascending: false });

  // Fetch files
  const { data: files } = await supabase
    .from("project_files")
    .select("id, original_name, mime_type, size_bytes, created_at, storage_path")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Fetch revisions
  const { data: revisions } = await supabase
    .from("revision_requests")
    .select("id, sequence, request, state, created_at")
    .eq("project_id", id)
    .order("sequence", { ascending: false });

  const orgName = (project.organizations as unknown as { name?: string })?.name || "Client Organization";

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
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href="/admin/projects"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Production Queue
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem" }}>
                Project Operations PRJ-{project.id.slice(0, 8)}
              </h1>
              <span className={stateBadges[project.state as ProjectState] || "status"}>
                {project.state.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Client: <strong>{orgName}</strong> · Service: {project.service_id} · Order: #ORD-{project.order_id.slice(0, 8)}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              REVISION BUDGET
            </span>
            <strong style={{ fontSize: "1.5rem", color: "var(--silver)", fontFamily: "var(--font-mono)" }}>
              {project.revision_count} / {project.revision_limit}
            </strong>
          </div>
        </div>

        {/* State Transition Controls */}
        <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
          <AdminProjectControls projectId={project.id} state={project.state as ProjectState} />
        </div>
      </div>

      {/* Milestones Operations Card */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Milestones & Execution Delivery</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Update milestone states to advance project delivery tracking
          </span>
        </div>
        <div className="panel-body">
          {milestones && milestones.length > 0 ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {milestones.map((m) => (
                <AdminMilestoneRow
                  key={m.id}
                  milestoneId={m.id}
                  label={m.label}
                  displayOrder={m.display_order}
                  state={m.state as "pending" | "in_progress" | "complete" | "blocked"}
                />
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)" }}>No milestones configured.</p>
          )}
        </div>
      </div>

      {/* Submitted Requirements Review */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Client Requirements Review</h2>
        </div>
        <div className="panel-body">
          {requirements && requirements.length > 0 ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {requirements.map((r) => {
                const isAnswered = Boolean(r.response);
                const respText = typeof r.response?.value === "string" ? r.response.value : JSON.stringify(r.response);

                return (
                  <div key={r.id} style={{ border: "1px solid var(--line)", padding: "1rem", background: "var(--bg-deep)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <strong style={{ fontSize: "0.92rem", color: "var(--text)" }}>
                        {r.label} {r.required && <span className="cyan">*</span>}
                      </strong>
                      <span className={isAnswered ? "status ready" : "status pending"} style={{ fontSize: "0.7rem" }}>
                        {isAnswered ? "SUBMITTED" : "PENDING"}
                      </span>
                    </div>
                    {isAnswered ? (
                      <p style={{ margin: "0.3rem 0 0", color: "var(--silver)", fontSize: "0.85rem", background: "var(--surface)", padding: "0.6rem 0.8rem", borderRadius: "2px", border: "1px solid var(--line)" }}>
                        {respText}
                      </p>
                    ) : (
                      <span className="mono muted" style={{ fontSize: "0.78rem" }}>Awaiting client submission.</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)" }}>No requirements defined.</p>
          )}
        </div>
      </div>

      {/* Revision Requests Review */}
      {revisions && revisions.length > 0 && (
        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div className="panel-head">
            <h2>Client Revision Requests</h2>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {revisions.map((rev) => (
                <div key={rev.id} style={{ border: "1px solid var(--line)", padding: "1rem", background: "var(--bg-deep)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                    <span className="mono cyan" style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                      CYCLE #{rev.sequence}
                    </span>
                    <span className="mono muted" style={{ fontSize: "0.76rem" }}>
                      {new Date(rev.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: "0.3rem 0 0", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    {rev.request}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Files */}
      {files && files.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <h2>Uploaded Project Materials ({files.length})</h2>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gap: "0.5rem" }}>
              {files.map((f) => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", padding: "0.6rem 0", fontSize: "0.85rem" }}>
                  <span style={{ color: "var(--silver)" }}>{f.original_name}</span>
                  <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                    {Math.round(f.size_bytes / 1024)} KB · {f.mime_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
