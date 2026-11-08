import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { RequirementsForm } from "@/components/requirements-form";

export default async function ProjectRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, state, service_id, organization_id")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  const { data: requirements } = await supabase
    .from("project_requirements")
    .select("id, key, label, required, response, submitted_at")
    .eq("project_id", id)
    .order("required", { ascending: false });

  const total = requirements?.length ?? 0;
  const completed = requirements?.filter((r) => r.response !== null).length ?? 0;

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
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Technical Requirements Specification</h1>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Project #{project.id.slice(0, 8)} · Provide necessary specifications and assets for engineering.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="mono cyan" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {completed} / {total} Submitted
            </span>
          </div>
        </div>

        {/* Sub-navigation */}
        <div style={{ display: "flex", borderTop: "1px solid var(--line)", background: "var(--bg-deep)", overflowX: "auto" }}>
          <Link href={`/dashboard/projects/${project.id}`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Overview & Milestones
          </Link>
          <Link href={`/dashboard/projects/${project.id}/requirements`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--cyan)", borderBottom: "2px solid var(--cyan)", background: "var(--surface)" }}>
            Requirements ({completed}/{total})
          </Link>
          <Link href={`/dashboard/projects/${project.id}/files`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Files & Assets
          </Link>
          <Link href={`/dashboard/projects/${project.id}/review`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Approvals & Revisions
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ padding: "1.8rem" }}>
          <RequirementsForm
            projectId={project.id}
            requirements={
              requirements?.map((r) => ({
                id: r.id,
                key: r.key,
                label: r.label,
                required: r.required,
                response: (r.response as Record<string, unknown>) || null,
                submitted_at: r.submitted_at
              })) || []
            }
          />
        </div>
      </div>
    </div>
  );
}
