import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { resolveServiceLabel } from "@/lib/catalog";
import { type ProjectState } from "@/lib/domain/states";
import {
  ClientProjectOfficePanels,
  type ProjectExpertRecord,
  type ProjectMessageRecord,
  type ProjectTimelineRecord,
} from "@/components/project-office-panels";

export default async function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id,
      organization_id,
      order_id,
      service_id,
      state,
      revision_limit,
      revision_count,
      created_at,
      updated_at,
      organizations (
        name,
        slug
      ),
      orders (
        id,
        currency,
        total_minor
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

  // Fetch requirements count
  const { data: requirements } = await supabase
    .from("project_requirements")
    .select("id, required, response")
    .eq("project_id", id);

  // Fetch files count
  const { count: filesCount } = await supabase
    .from("project_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  // Fetch client-visible NRE OFFICE records (RLS enforces org scope & client visibility)
  const [{ data: assignmentsData }, { data: timelineData }, { data: messagesData }] = await Promise.all([
    supabase
      .from("project_assignments")
      .select("id, assignee_id, role_label, created_at, profiles:assignee_id ( full_name )")
      .eq("project_id", id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_timeline_events")
      .select("id, event_type, title, detail, visible_to_client, created_at, profiles:actor_id ( full_name )")
      .eq("project_id", id)
      .eq("visible_to_client", true)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("project_messages")
      .select("id, body, internal_only, created_at, profiles:author_id ( full_name, is_staff )")
      .eq("project_id", id)
      .eq("internal_only", false)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  const experts: ProjectExpertRecord[] = (assignmentsData ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name?: string | null } | null;
    return {
      id: row.id,
      assigneeId: row.assignee_id,
      assigneeName: profile?.full_name || "NotRealEngine Specialist",
      roleLabel: row.role_label,
      createdAt: row.created_at,
    };
  });

  const timeline: ProjectTimelineRecord[] = (timelineData ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name?: string | null } | null;
    return {
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      detail: row.detail ?? null,
      visibleToClient: Boolean(row.visible_to_client),
      actorName: profile?.full_name || "NotRealEngine Operations",
      createdAt: row.created_at,
    };
  });

  const messages: ProjectMessageRecord[] = (messagesData ?? []).map((row) => {
    const profile = row.profiles as unknown as { full_name?: string | null; is_staff?: boolean } | null;
    return {
      id: row.id,
      body: row.body,
      internalOnly: false,
      authorName: profile?.full_name || (profile?.is_staff ? "NotRealEngine Team" : "You"),
      isStaffAuthor: Boolean(profile?.is_staff),
      createdAt: row.created_at,
    };
  });

  const resolvedService = resolveServiceLabel(project.service_id);
  const totalMilestones = milestones?.length ?? 0;
  const completedMilestones = milestones?.filter((m) => m.state === "complete").length ?? 0;
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : null;

  const totalReqs = requirements?.length ?? 0;
  const submittedReqs = requirements?.filter((r) => r.response !== null).length ?? 0;

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

  const milestoneBadgeMap: Record<string, string> = {
    pending: "status muted",
    in_progress: "status info",
    complete: "status ready",
    blocked: "status danger"
  };

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href="/dashboard/projects"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>
      </div>

      {/* Workspace Header */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem" }}>
                Project Workspace #{project.id.slice(0, 8)}
              </h1>
              <span className={stateBadges[project.state as ProjectState] || "status"}>
                {project.state.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Service: <strong>{resolvedService.id} — {resolvedService.name}</strong> · Order: #{(project.orders as unknown as { id?: string })?.id?.slice(0, 8) || "N/A"}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              REVISION ALLOWANCE
            </span>
            <strong style={{ fontSize: "1.4rem", color: "var(--silver)", fontFamily: "var(--font-mono)" }}>
              {project.revision_count} / {project.revision_limit} Used
            </strong>
          </div>
        </div>

        {/* Project Sub-navigation Tabs */}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--bg-deep)", overflowX: "auto" }}>
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="mono"
            style={{
              padding: "0.85rem 1.4rem",
              fontSize: "0.82rem",
              color: "var(--cyan)",
              borderBottom: "2px solid var(--cyan)",
              background: "var(--surface)"
            }}
          >
            Overview & Milestones
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/requirements`}
            className="mono"
            style={{
              padding: "0.85rem 1.4rem",
              fontSize: "0.82rem",
              color: "var(--silver)"
            }}
          >
            Requirements ({submittedReqs}/{totalReqs})
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/files`}
            className="mono"
            style={{
              padding: "0.85rem 1.4rem",
              fontSize: "0.82rem",
              color: "var(--silver)"
            }}
          >
            Files & Assets ({filesCount ?? 0})
          </Link>
          <Link
            href={`/dashboard/projects/${project.id}/review`}
            className="mono"
            style={{
              padding: "0.85rem 1.4rem",
              fontSize: "0.82rem",
              color: "var(--silver)"
            }}
          >
            Approvals & Revisions
          </Link>
        </div>
      </div>

      {/* Requirements Alert Banner if awaiting requirements */}
      {project.state === "awaiting_requirements" && (
        <div className="panel" style={{ marginBottom: "1.5rem", borderColor: "var(--gold)" }}>
          <div className="panel-body" style={{ background: "var(--gold-dim)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <AlertCircle size={22} className="gold" />
              <div>
                <strong style={{ display: "block", color: "var(--text)", fontSize: "0.95rem" }}>
                  Action Required: Technical Requirements Pending
                </strong>
                <span style={{ fontSize: "0.84rem", color: "var(--silver)" }}>
                  Please provide required brand assets and specifications to transition project into engineering production.
                </span>
              </div>
            </div>
            <Link href={`/dashboard/projects/${project.id}/requirements`} className="btn btn-primary" style={{ fontSize: "0.82rem" }}>
              Submit Requirements <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Progress & Milestone Overview */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Technical Milestones & Delivery Schedule</h2>
          <span className="mono cyan tabular" style={{ fontSize: "0.82rem" }}>
            {progressPercent !== null
              ? `${completedMilestones}/${totalMilestones} Verified Milestones (${progressPercent}%)`
              : "Awaiting milestone schedule"}
          </span>
        </div>

        <div className="panel-body">
          {/* Evidence-backed Progress Bar (rendered only when persisted milestones exist) */}
          {progressPercent !== null && (
            <div style={{ height: "6px", background: "var(--surface-3)", borderRadius: "3px", overflow: "hidden", marginBottom: "1.8rem" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "var(--cyan)",
                  transition: "width 300ms ease"
                }}
              />
            </div>
          )}

          {/* Milestones List */}
          {milestones && milestones.length > 0 ? (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {milestones.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid var(--line)",
                    padding: "1rem 1.2rem",
                    background: "var(--bg-deep)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    borderRadius: "2px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <span className="mono cyan" style={{ fontSize: "0.85rem", fontWeight: 700 }}>
                      0{m.display_order}.
                    </span>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "var(--text)" }}>{m.label}</strong>
                      {m.due_at && (
                        <span className="mono muted" style={{ display: "block", fontSize: "0.76rem", marginTop: "0.15rem" }}>
                          Target: {new Date(m.due_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className={milestoneBadgeMap[m.state] || "status"}>
                    {m.state.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--muted)", padding: "1.5rem 0", textAlign: "center" }}>
              Milestones will be initialized upon operational clearance.
            </div>
          )}
        </div>
      </div>

      <ClientProjectOfficePanels
        projectId={project.id}
        experts={experts}
        timeline={timeline}
        messages={messages}
      />
    </div>
  );
}
