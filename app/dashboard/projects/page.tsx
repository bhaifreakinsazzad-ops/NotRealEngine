import Link from "next/link";
import { FolderKanban, Plus, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type ProjectState } from "@/lib/domain/states";

export default async function ProjectsPage() {
  const { supabase } = await requireUser();

  const { data: projects } = await supabase
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
    .order("updated_at", { ascending: false });

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
      <div className="app-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Client Projects Register</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Track project execution milestones, upload requirements, submit revisions, and approve deliverables.
          </p>
        </div>
        <Link href="/build" className="btn btn-primary">
          <Plus size={16} /> New Project Brief
        </Link>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Active & Completed Projects</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {projects?.length ?? 0} records
          </span>
        </div>

        <div className="panel-body">
          {projects && projects.length > 0 ? (
            <div style={{ display: "grid", gap: "1.2rem" }}>
              {projects.map((proj) => {
                const milestones = (proj.milestones as Array<{ id: string; state: string }>) || [];
                const completed = milestones.filter((m) => m.state === "complete").length;
                const progressPercent = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

                return (
                  <div
                    key={proj.id}
                    style={{
                      border: "1px solid var(--line)",
                      padding: "1.3rem",
                      background: "var(--bg-deep)",
                      borderRadius: "2px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <Link href={`/dashboard/projects/${proj.id}`} style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                          Project #{proj.id.slice(0, 8)}
                        </Link>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                          Service ID: {proj.service_id} · Created {new Date(proj.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={stateBadges[proj.state as ProjectState] || "status"}>
                        {proj.state.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginTop: "1.2rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.35rem" }}>
                        <span className="mono muted">Milestone Progress</span>
                        <span className="mono cyan">{completed}/{milestones.length} Milestones Complete ({progressPercent}%)</span>
                      </div>
                      <div style={{ height: "5px", background: "var(--surface-3)", borderRadius: "2px", overflow: "hidden" }}>
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

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.2rem", paddingTop: "0.8rem", borderTop: "1px solid var(--line)", flexWrap: "wrap", gap: "0.75rem" }}>
                      <span className="mono muted" style={{ fontSize: "0.8rem" }}>
                        Revisions: <strong style={{ color: "var(--silver)" }}>{proj.revision_count}/{proj.revision_limit}</strong> Used
                      </span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Link href={`/dashboard/projects/${proj.id}/requirements`} className="btn btn-quiet" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "32px" }}>
                          Requirements
                        </Link>
                        <Link href={`/dashboard/projects/${proj.id}/files`} className="btn btn-quiet" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "32px" }}>
                          Files
                        </Link>
                        <Link href={`/dashboard/projects/${proj.id}`} className="btn btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem", minHeight: "32px" }}>
                          Open Workspace <ArrowRight size={13} />
                        </Link>
                      </div>
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
                <span>Projects are created automatically upon commercial order confirmation.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
