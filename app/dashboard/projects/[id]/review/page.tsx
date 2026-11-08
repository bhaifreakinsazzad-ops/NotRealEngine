import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type ProjectState } from "@/lib/domain/states";
import { ProjectReviewForm } from "@/components/project-review-form";

export default async function ProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, state, revision_count, revision_limit, organization_id, service_id")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch approvals
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, kind, decision, note, created_at, decided_by")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Fetch revision requests
  const { data: revisions } = await supabase
    .from("revision_requests")
    .select("id, sequence, request, state, created_at")
    .eq("project_id", id)
    .order("sequence", { ascending: false });

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href={`/dashboard/projects/${id}`}
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Project Workspace
        </Link>
      </div>

      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Deliverable Review & Approval Log</h1>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Project #{project.id.slice(0, 8)} · Review milestones, submit revisions, and record formal sign-offs.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="mono cyan" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {project.revision_count} / {project.revision_limit} Revisions Used
            </span>
          </div>
        </div>

        {/* Sub-navigation */}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--bg-deep)", overflowX: "auto" }}>
          <Link href={`/dashboard/projects/${project.id}`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Overview & Milestones
          </Link>
          <Link href={`/dashboard/projects/${project.id}/requirements`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Requirements
          </Link>
          <Link href={`/dashboard/projects/${project.id}/files`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Files & Assets
          </Link>
          <Link href={`/dashboard/projects/${project.id}/review`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--cyan)", borderBottom: "2px solid var(--cyan)", background: "var(--surface)" }}>
            Approvals & Revisions
          </Link>
        </div>
      </div>

      {/* Review Actions Form */}
      <div style={{ marginBottom: "1.5rem" }}>
        <ProjectReviewForm
          projectId={project.id}
          state={project.state as ProjectState}
          revisionCount={project.revision_count}
          revisionLimit={project.revision_limit}
        />
      </div>

      {/* History Grids */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Approvals History */}
        <div className="panel">
          <div className="panel-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <CheckCircle2 size={16} className="cyan" /> Formal Approvals Log
            </h2>
          </div>
          <div className="panel-body">
            {approvals && approvals.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {approvals.map((a) => (
                  <div key={a.id} style={{ border: "1px solid var(--line)", padding: "0.85rem 1rem", background: "var(--bg-deep)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span className="mono" style={{ fontSize: "0.76rem", color: a.decision === "approved" ? "var(--success)" : "var(--gold)" }}>
                        {a.decision.toUpperCase()}
                      </span>
                      <span className="mono muted" style={{ fontSize: "0.74rem" }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {a.note && <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--silver)" }}>{a.note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>No formal approvals recorded yet.</p>
            )}
          </div>
        </div>

        {/* Revisions History */}
        <div className="panel">
          <div className="panel-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <RotateCcw size={16} className="gold" /> Revision Requests History
            </h2>
          </div>
          <div className="panel-body">
            {revisions && revisions.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {revisions.map((r) => (
                  <div key={r.id} style={{ border: "1px solid var(--line)", padding: "0.85rem 1rem", background: "var(--bg-deep)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span className="mono cyan" style={{ fontSize: "0.76rem", fontWeight: 700 }}>
                        CYCLE #{r.sequence}
                      </span>
                      <span className="status pending" style={{ fontSize: "0.68rem" }}>
                        {r.state.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--silver)", lineHeight: 1.5 }}>
                      {r.request}
                    </p>
                    <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginTop: "0.4rem" }}>
                      Requested {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>No revision requests submitted.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
