import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ProjectFileUploader } from "@/components/project-file-uploader";

export default async function ProjectFilesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, state, organization_id, service_id")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch files
  const { data: files } = await supabase
    .from("project_files")
    .select("id, storage_path, original_name, mime_type, size_bytes, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Generate signed download URLs
  const filesWithUrls = await Promise.all(
    (files || []).map(async (f) => {
      let downloadUrl = "#";
      try {
        const { data: signed } = await supabase.storage
          .from("project-files")
          .createSignedUrl(f.storage_path, 3600);
        if (signed?.signedUrl) {
          downloadUrl = signed.signedUrl;
        }
      } catch {
        // Fallback if storage not reachable
      }
      return { ...f, downloadUrl };
    })
  );

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
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Project Files & Materials</h1>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Project #{project.id.slice(0, 8)} · Secure, isolated storage for technical assets and deliverables.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="mono cyan" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {files?.length ?? 0} Stored Objects
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
          <Link href={`/dashboard/projects/${project.id}/files`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--cyan)", borderBottom: "2px solid var(--cyan)", background: "var(--surface)" }}>
            Files & Assets ({files?.length ?? 0})
          </Link>
          <Link href={`/dashboard/projects/${project.id}/review`} className="mono" style={{ padding: "0.85rem 1.4rem", fontSize: "0.82rem", color: "var(--silver)" }}>
            Approvals & Revisions
          </Link>
        </div>
      </div>

      {/* Uploader */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-body">
          <ProjectFileUploader projectId={project.id} organizationId={project.organization_id} />
        </div>
      </div>

      {/* Stored Files Table */}
      <div className="panel">
        <div className="panel-head">
          <h2>Stored Technical Files</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Access granted only to authenticated organization members
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>FILE NAME</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>MIME TYPE</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>SIZE</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left" }}>UPLOAD DATE</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filesWithUrls.length > 0 ? (
                filesWithUrls.map((f) => {
                  const sizeFormatted =
                    f.size_bytes > 1024 * 1024
                      ? `${(f.size_bytes / (1024 * 1024)).toFixed(2)} MB`
                      : `${Math.round(f.size_bytes / 1024)} KB`;

                  return (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <FileText size={15} className="cyan" /> {f.original_name}
                        </strong>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono muted">
                        {f.mime_type}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                        {sizeFormatted}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {new Date(f.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <a
                          href={f.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-quiet"
                          style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem", minHeight: "30px", display: "inline-flex", gap: "0.3rem", alignItems: "center" }}
                        >
                          <Download size={14} /> Download
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <FolderOpen size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No files uploaded yet.</strong>
                    <span style={{ fontSize: "0.82rem" }}>
                      Upload technical specifications, wireframes, or brand assets using the uploader above.
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
