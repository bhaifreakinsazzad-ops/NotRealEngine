"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2 } from "lucide-react";
import { createSupportTicketAction } from "@/app/dashboard/actions";

interface ProjectOption {
  id: string;
  serviceId: string;
}

export function SupportTicketForm({
  organizationId,
  projects
}: {
  organizationId: string;
  projects: ProjectOption[];
}) {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 5) {
      setError("Subject must be at least 5 characters.");
      return;
    }
    if (body.trim().length < 15) {
      setError("Please describe your issue in at least 15 characters.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await createSupportTicketAction({
        organizationId,
        projectId: projectId || null,
        subject: subject.trim(),
        body: body.trim(),
        priority
      });

      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setSuccess("Your support ticket has been created. A technical lead will respond promptly.");
      setSubject("");
      setBody("");
      setLoading(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create support ticket.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="field">
        <label>Subject / Topic *</label>
        <input
          type="text"
          className="input"
          placeholder="Brief summary of request or inquiry..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Related Project (Optional)</label>
          <select
            className="select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            disabled={loading}
          >
            <option value="">General Inquiry / Account</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                Project #{p.id.slice(0, 8)} ({p.serviceId})
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Urgency Level</label>
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high" | "urgent")}
            disabled={loading}
          >
            <option value="low">Low — General Question</option>
            <option value="normal">Normal — Standard Request</option>
            <option value="high">High — Blocked Review</option>
            <option value="urgent">Urgent — Production Issue</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label>Detailed Description *</label>
        <textarea
          className="textarea"
          placeholder="Please explain your question or request in detail..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={loading}
          required
          style={{ minHeight: "110px" }}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ minWidth: "160px" }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Submitting...
            </>
          ) : (
            <>
              <Send size={16} /> Open Support Ticket
            </>
          )}
        </button>
      </div>
    </form>
  );
}
