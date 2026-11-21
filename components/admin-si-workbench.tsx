"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, FilePlus2, Play, ShieldCheck, XCircle } from "lucide-react";
import {
  applyApprovedSiSuggestionAction,
  createSiSuggestionDraftAction,
  reviewSiSuggestionAction,
} from "@/app/admin/actions";
import { type SiEntityType, type SiSuggestionKind, type SiSuggestionStatus } from "@/lib/domain/si-suggestions";

export interface SiSuggestionRow {
  id: string;
  entityType: SiEntityType;
  entityId: string;
  suggestionKind: SiSuggestionKind;
  title: string;
  rationale: string | null;
  draftPayload: {
    title?: string;
    detail?: string;
    visibleToClient?: boolean;
  };
  status: SiSuggestionStatus;
  decisionNote: string | null;
  appliedActionRef: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface TargetEntityOption {
  id: string;
  label: string;
  entityType: SiEntityType;
}

const STATUS_BADGES: Record<SiSuggestionStatus, string> = {
  draft: "status pending",
  under_review: "status info",
  reviewed: "status info",
  approved: "status gold",
  rejected: "status danger",
  applied: "status ready",
  dismissed: "status muted",
};

export function AdminSiWorkbench({
  suggestions,
  targets,
}: {
  suggestions: SiSuggestionRow[];
  targets: TargetEntityOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [entityType, setEntityType] = useState<SiEntityType>(targets[0]?.entityType ?? "project");
  const [entityId, setEntityId] = useState<string>(targets[0]?.id ?? "");
  const [suggestionKind, setSuggestionKind] = useState<SiSuggestionKind>("project_timeline_update");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [draftText, setDraftText] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const filteredTargets = targets.filter((t) => t.entityType === entityType);

  function handleCreateDraft(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createSiSuggestionDraftAction({
        entityType,
        entityId,
        suggestionKind,
        title,
        rationale,
        draftText,
        visibleToClient,
      });
      if (res.ok) {
        setTitle("");
        setRationale("");
        setDraftText("");
        setFeedback({ kind: "ok", text: "SI draft queued for mandatory human review. No downstream action was executed." });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  }

  function handleReview(suggestionId: string, decision: "under_review" | "approved" | "rejected" | "dismissed") {
    startTransition(async () => {
      const res = await reviewSiSuggestionAction({
        suggestionId,
        decision,
        decisionNote: decisionNotes[suggestionId] || undefined,
      });
      if (res.ok) {
        setFeedback({ kind: "ok", text: `SI suggestion marked "${decision.replace("_", " ")}" and logged to audit trail.` });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  }

  function handleApply(suggestionId: string) {
    startTransition(async () => {
      const res = await applyApprovedSiSuggestionAction({ suggestionId });
      if (res.ok) {
        setFeedback({ kind: "ok", text: `Human-approved SI action executed (${res.appliedActionRef}).` });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="panel" style={{ borderColor: "var(--line-strong)" }}>
        <div className="panel-body" style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
          <ShieldCheck size={20} className="cyan" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.85rem", color: "var(--silver)", lineHeight: 1.5 }}>
            <strong>Human-Supervised Synthetic Intelligence Governance:</strong> Every SI item strictly follows{" "}
            <span className="mono cyan">Draft → Human Review → Approval / Rejection → Authorized Action → Audit Trail</span>.
            Database triggers and server checks block any unapproved execution.
          </span>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.kind === "err" ? "alert" : "status"}
          style={{
            padding: "0.85rem 1rem",
            border: `1px solid ${feedback.kind === "err" ? "var(--danger)" : "var(--cyan)"}`,
            background: feedback.kind === "err" ? "rgba(255, 77, 109, 0.08)" : "rgba(29, 216, 255, 0.08)",
            color: "var(--text)",
            fontSize: "0.86rem",
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Create SI Draft */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <FilePlus2 size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Queue New SI Suggestion Draft</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Initial State: DRAFT (Non-Executing)
          </span>
        </div>
        <div className="panel-body">
          <form onSubmit={handleCreateDraft} style={{ display: "grid", gap: "0.85rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem" }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="si-entity-type">Target Entity Type</label>
                <select
                  id="si-entity-type"
                  className="select"
                  value={entityType}
                  onChange={(e) => {
                    const nextType = e.target.value as SiEntityType;
                    setEntityType(nextType);
                    const match = targets.find((t) => t.entityType === nextType);
                    setEntityId(match?.id ?? "");
                  }}
                >
                  <option value="project">Project</option>
                  <option value="support_ticket">Support Ticket</option>
                  <option value="project_brief">Project Brief</option>
                  <option value="quote">Quote</option>
                </select>
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="si-target">Target Record</label>
                {filteredTargets.length > 0 ? (
                  <select
                    id="si-target"
                    className="select"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  >
                    {filteredTargets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="si-target"
                    className="input"
                    required
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    placeholder="Paste target record UUID"
                  />
                )}
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="si-kind">Suggestion Kind</label>
                <select
                  id="si-kind"
                  className="select"
                  value={suggestionKind}
                  onChange={(e) => setSuggestionKind(e.target.value as SiSuggestionKind)}
                >
                  <option value="project_timeline_update">Project Timeline Update</option>
                  <option value="support_response_draft">Support Response Draft</option>
                  <option value="scope_clarification">Scope Clarification Note</option>
                  <option value="pulse_triage_note">NRE PULSE Triage Note</option>
                </select>
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="si-title">Draft Headline</label>
              <input
                id="si-title"
                className="input"
                required
                minLength={4}
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Proposed client update for milestone QA pass"
              />
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="si-rationale">Evidence / Rationale</label>
              <input
                id="si-rationale"
                className="input"
                required
                minLength={5}
                maxLength={1000}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Why this draft is proposed and which verified record supports it"
              />
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="si-draft-text">Draft Content (Editable before human approval)</label>
              <textarea
                id="si-draft-text"
                className="textarea"
                style={{ minHeight: 88 }}
                required
                minLength={10}
                maxLength={4000}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Write the exact suggested timeline update or client reply for human review..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.84rem", color: "var(--silver)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={visibleToClient}
                  onChange={(e) => setVisibleToClient(e.target.checked)}
                />
                <span>Client-visible once explicitly approved and applied</span>
              </label>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <FilePlus2 size={14} />
                <span>Create SI Draft</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Review Queue */}
      <div className="panel">
        <div className="panel-head">
          <h2>SI Review Queue ({suggestions.length})</h2>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Explicit Human Sign-Off Required Before Apply
          </span>
        </div>
        <div className="panel-body">
          {suggestions.length > 0 ? (
            <div style={{ display: "grid", gap: "1rem" }}>
              {suggestions.map((s) => {
                const canReview = s.status === "draft" || s.status === "under_review" || s.status === "reviewed";
                const canApply = s.status === "approved";

                return (
                  <div
                    key={s.id}
                    style={{
                      border: "1px solid var(--line)",
                      background: "var(--bg-deep)",
                      padding: "1.1rem",
                      display: "grid",
                      gap: "0.7rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ fontSize: "1rem", color: "var(--text)" }}>{s.title}</strong>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                          {s.suggestionKind} · {s.entityType} #{s.entityId.slice(0, 8)} ·{" "}
                          {new Date(s.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span className={STATUS_BADGES[s.status] || "status"}>
                        {s.status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    {s.rationale && (
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                        <strong>Rationale:</strong> {s.rationale}
                      </div>
                    )}

                    <div
                      style={{
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        padding: "0.75rem 0.9rem",
                        color: "var(--silver)",
                        fontSize: "0.86rem",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {s.draftPayload?.detail || s.title}
                    </div>

                    {s.decisionNote && (
                      <div className="mono muted" style={{ fontSize: "0.76rem" }}>
                        Reviewer Note: {s.decisionNote}
                      </div>
                    )}

                    {s.appliedActionRef && (
                      <div className="mono cyan" style={{ fontSize: "0.76rem" }}>
                        Audit Ref: {s.appliedActionRef}
                      </div>
                    )}

                    {(canReview || canApply) && (
                      <div style={{ display: "grid", gap: "0.65rem", borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}>
                        {canReview && (
                          <input
                            className="input"
                            style={{ fontSize: "0.82rem" }}
                            placeholder="Optional human review note for audit log..."
                            value={decisionNotes[s.id] ?? ""}
                            onChange={(e) =>
                              setDecisionNotes((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                          />
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          {s.status === "draft" && (
                            <button
                              type="button"
                              className="btn"
                              disabled={isPending}
                              onClick={() => handleReview(s.id, "under_review")}
                            >
                              <Eye size={14} />
                              <span>Start Human Review</span>
                            </button>
                          )}
                          {canReview && (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={isPending}
                                onClick={() => handleReview(s.id, "approved")}
                              >
                                <CheckCircle2 size={14} />
                                <span>Approve Draft</span>
                              </button>
                              <button
                                type="button"
                                className="btn"
                                disabled={isPending}
                                onClick={() => handleReview(s.id, "rejected")}
                              >
                                <XCircle size={14} />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {canApply && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={isPending}
                              onClick={() => handleApply(s.id)}
                            >
                              <Play size={14} />
                              <span>Execute Authorized Action</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
              No SI suggestion drafts in the queue. Create a draft above to run the human-supervised review and approval workflow.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
