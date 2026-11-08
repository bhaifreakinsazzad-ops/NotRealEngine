import { FolderOpen } from "lucide-react";

export function WorkspaceSection({ title, description, kind = "client" }: { title: string; description: string; kind?: "client" | "admin" }) {
  return <div className="panel" style={{ marginTop: "1.5rem" }}><div className="panel-head"><h2>{title}</h2></div><div className="empty"><div><FolderOpen size={44} /><strong>No production records yet.</strong><span>{description}</span>{kind === "admin" && <p className="mono" style={{ fontSize: ".72rem" }}>Records appear only after verified server-side creation.</p>}</div></div></div>;
}
