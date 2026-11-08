import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type ProjectState } from "@/lib/domain/states";

export default async function AdminProjectsPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateFilter } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("projects")
    .select(`
      id,
      state,
      service_id,
      revision_count,
      revision_limit,
      created_at,
      updated_at,
      organizations (
        name,
        slug
      ),
      milestones (
        id,
        state
      )
    `)
    .order("updated_at", { ascending: false });

  if (stateFilter && stateFilter !== "all") {
    query = query.eq("state", stateFilter);
  }

  const { data: projects } = await query;

  const totalCount = projects?.length ?? 0;
  const activeCount = projects?.filter((p) => ["ready_for_production", "in_progress", "internal_qa", "client_review"].includes(p.state)).length ?? 0;
  const reviewCount = projects?.filter((p) => p.state === "requirements_review" || p.state === "client_review").length ?? 0;
  const deliveredCount = projects?.filter((p) => p.state === "delivered").length ?? 0;

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
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Project Production Operations</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Govern engineering production queues, milestone deliverables, requirements sign-off, and handovers.
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
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>TOTAL PROJECTS</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem" }}>{totalCount}</strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>IN PRODUCTION</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {activeCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>REVIEWS PENDING</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {reviewCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>DELIVERED</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--success)" }}>
            {deliveredCount}
          </strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {[
          { label: "All Projects", val: "all" },
          { label: "Requirements Review", val: "requirements_review" },
          { label: "In Production", val: "in_progress" },
          { label: "Client Review", val: "client_review" },
          { label: "Delivered", val: "delivered" },
          { label: "On Hold", val: "on_hold" }
        ].map((tab) => {
          const isActive = (stateFilter ?? "all") === tab.val;
          return (
            <Link
              key={tab.val}
              href={`/admin/projects${tab.val === "all" ? "" : `?state=${tab.val}`}`}
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

      {/* Projects Table */}
      <div className="panel">
        <div className="panel-head">
          <h2>Production Queue Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {projects?.length ?? 0} records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>PROJECT REF</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SERVICE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>STAGE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>MILESTONES</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>REVISIONS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {projects && projects.length > 0 ? (
                projects.map((p) => {
                  const orgName = (p.organizations as unknown as { name?: string })?.name || "Direct Account";
                  const milestones = (p.milestones as Array<{ id: string; state: string }>) || [];
                  const completed = milestones.filter((m) => m.state === "complete").length;

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <Link href={`/admin/projects/${p.id}`} className="mono cyan" style={{ fontWeight: 600 }}>
                          PRJ-{p.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong>{orgName}</strong>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        {p.service_id}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className={stateBadges[p.state as ProjectState] || "status"}>
                          {p.state.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono">
                        {completed}/{milestones.length}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                        {p.revision_count}/{p.revision_limit}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <Link href={`/admin/projects/${p.id}`} className="btn btn-quiet" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "30px" }}>
                            Manage
                          </Link>
                          <Link href={`/dashboard/projects/${p.id}`} className="btn btn-quiet" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "30px" }}>
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
                    <FolderKanban size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No projects in production.</strong>
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
