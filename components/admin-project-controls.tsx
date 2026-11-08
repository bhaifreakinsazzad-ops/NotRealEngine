"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Play, Pause, Send, Loader2 } from "lucide-react";
import { type ProjectState } from "@/lib/domain/states";
import { updateMilestoneStateAction, updateProjectStateAction } from "@/app/admin/actions";

export function AdminProjectControls({
  projectId,
  state
}: {
  projectId: string;
  state: ProjectState;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStateTransition(nextState: ProjectState) {
    setLoading(true);
    setError(null);
    try {
      const res = await updateProjectStateAction({ projectId, nextState });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to advance state.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.8rem" }}>
      {error && <div className="error-box" style={{ fontSize: "0.82rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        {state === "requirements_review" && (
          <button
            type="button"
            onClick={() => handleStateTransition("ready_for_production")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Approve Requirements & Ready Production
          </button>
        )}

        {state === "ready_for_production" && (
          <button
            type="button"
            onClick={() => handleStateTransition("in_progress")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            Start Active Engineering
          </button>
        )}

        {state === "in_progress" && (
          <button
            type="button"
            onClick={() => handleStateTransition("internal_qa")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Move to Internal QA
          </button>
        )}

        {state === "internal_qa" && (
          <button
            type="button"
            onClick={() => handleStateTransition("client_review")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Publish for Client UAT Review
          </button>
        )}

        {state === "revision" && (
          <button
            type="button"
            onClick={() => handleStateTransition("in_progress")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            Start Revision Execution
          </button>
        )}

        {state === "approved" && (
          <button
            type="button"
            onClick={() => handleStateTransition("delivered")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            Mark Project Delivered & Handover Complete
          </button>
        )}

        {state !== "delivered" && state !== "cancelled" && state !== "on_hold" && (
          <button
            type="button"
            onClick={() => handleStateTransition("on_hold")}
            disabled={loading}
            className="btn btn-quiet"
            style={{ fontSize: "0.85rem" }}
          >
            <Pause size={15} /> Put On Hold
          </button>
        )}

        {state === "on_hold" && (
          <button
            type="button"
            onClick={() => handleStateTransition("in_progress")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <Play size={15} /> Resume Project
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminMilestoneRow({
  milestoneId,
  label,
  displayOrder,
  state
}: {
  milestoneId: string;
  label: string;
  displayOrder: number;
  state: "pending" | "in_progress" | "complete" | "blocked";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleMilestoneChange(nextState: "pending" | "in_progress" | "complete" | "blocked") {
    setLoading(true);
    try {
      await updateMilestoneStateAction({ milestoneId, nextState });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        padding: "0.85rem 1rem",
        background: "var(--bg-deep)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.5rem"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className="mono cyan" style={{ fontSize: "0.82rem", fontWeight: 700 }}>
          0{displayOrder}.
        </span>
        <strong style={{ fontSize: "0.92rem", color: "var(--text)" }}>{label}</strong>
      </div>

      <select
        className="select"
        value={state}
        onChange={(e) => handleMilestoneChange(e.target.value as "pending" | "in_progress" | "complete" | "blocked")}
        disabled={loading}
        style={{ minHeight: "30px", padding: "0.2rem 0.5rem", fontSize: "0.78rem" }}
      >
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="complete">Complete</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>
  );
}
