"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { type ProjectState } from "@/lib/domain/states";
import { requestRevisionAction, submitApprovalAction } from "@/app/dashboard/actions";

export function ProjectReviewForm({
  projectId,
  state,
  revisionCount,
  revisionLimit
}: {
  projectId: string;
  state: ProjectState;
  revisionCount: number;
  revisionLimit: number;
}) {
  const router = useRouter();

  const [mode, setMode] = useState<"none" | "approve" | "revise">("none");
  const [note, setNote] = useState("");
  const [revisionText, setRevisionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnderReview = state === "client_review";
  const canRevise = revisionCount < revisionLimit;

  async function handleApprove() {
    setError(null);
    setLoading(true);
    try {
      const res = await submitApprovalAction({
        projectId,
        decision: "approved",
        note: note.trim() || undefined
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setMode("none");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevise() {
    if (!revisionText.trim() || revisionText.trim().length < 10) {
      setError("Please describe the requested changes in at least 10 characters.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await requestRevisionAction({
        projectId,
        request: revisionText.trim()
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setMode("none");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Revision submission failed.");
    } finally {
      setLoading(false);
    }
  }

  if (!isUnderReview) {
    return (
      <div className="panel" style={{ background: "var(--bg-deep)" }}>
        <div className="panel-body">
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>
            This project is currently in the <strong>{state.replace("_", " ").toUpperCase()}</strong> stage. Deliverable approval and formal revision cycles open once the engineering team completes internal QA and publishes deliverables for your review.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ borderColor: "var(--cyan)" }}>
      <div className="panel-head" style={{ background: "rgba(32, 230, 238, 0.04)" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} className="cyan" /> Deliverable Review & Formal Decision
        </h2>
        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
          Revisions Available: {revisionLimit - revisionCount} of {revisionLimit}
        </span>
      </div>

      <div className="panel-body">
        {error && <div className="error-box">{error}</div>}

        {mode === "none" && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setMode("approve")}
              className="btn btn-primary"
              style={{ fontSize: "0.88rem" }}
            >
              <CheckCircle2 size={16} /> Approve Current Deliverables
            </button>

            {canRevise ? (
              <button
                type="button"
                onClick={() => setMode("revise")}
                className="btn"
                style={{ borderColor: "var(--line-strong)", fontSize: "0.88rem" }}
              >
                <RotateCcw size={16} /> Request Formal Revision...
              </button>
            ) : (
              <span className="mono muted" style={{ fontSize: "0.8rem" }}>
                All {revisionLimit} included revision rounds have been utilized.
              </span>
            )}
          </div>
        )}

        {mode === "approve" && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--success)" }}>Confirm Deliverable Approval</h4>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
              By approving, you confirm the submitted deliverables satisfy the agreed project specifications.
            </p>
            <div className="field">
              <label>Optional Sign-off Notes / Feedback</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Approved for final production deployment"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
              />
            </div>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Confirm & Sign-off"}
              </button>
              <button
                type="button"
                onClick={() => setMode("none")}
                disabled={loading}
                className="btn btn-quiet"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === "revise" && (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--gold)" }}>
              Submit Revision Request (Cycle {revisionCount + 1} of {revisionLimit})
            </h4>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
              Please detail the exact adjustments required. Revisions must align with the approved scope deliverables.
            </p>
            <div className="field">
              <label>Detailed Revision Instructions *</label>
              <textarea
                className="textarea"
                placeholder="List specific changes, corrections, or adjustments required..."
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                disabled={loading}
                style={{ minHeight: "110px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={handleRevise}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Submit Revision Request"}
              </button>
              <button
                type="button"
                onClick={() => setMode("none")}
                disabled={loading}
                className="btn btn-quiet"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
