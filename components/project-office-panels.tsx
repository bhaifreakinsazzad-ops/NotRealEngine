"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  assignProjectExpertAction,
  postAdminProjectMessageAction,
  postProjectTimelineEventAction,
  removeProjectExpertAction,
} from "@/app/admin/actions";
import { postClientProjectMessageAction } from "@/app/dashboard/actions";

export interface ProjectExpertRecord {
  id: string;
  assigneeId: string;
  assigneeName: string;
  roleLabel: string;
  createdAt: string;
}

export interface ProjectTimelineRecord {
  id: string;
  eventType: string;
  title: string;
  detail: string | null;
  visibleToClient: boolean;
  actorName: string;
  createdAt: string;
}

export interface ProjectMessageRecord {
  id: string;
  body: string;
  internalOnly: boolean;
  authorName: string;
  isStaffAuthor: boolean;
  createdAt: string;
}

export interface StaffMemberOption {
  id: string;
  fullName: string;
}

const ROLE_PRESETS = [
  "Lead Engineer",
  "Frontend Architect",
  "Backend & Supabase Engineer",
  "UI/UX Designer",
  "QA & Security Reviewer",
  "NRE PULSE Care Specialist",
] as const;

export function AdminProjectOfficePanels({
  projectId,
  experts,
  staffOptions,
  timeline,
  messages,
}: {
  projectId: string;
  experts: ProjectExpertRecord[];
  staffOptions: StaffMemberOption[];
  timeline: ProjectTimelineRecord[];
  messages: ProjectMessageRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Expert assignment form
  const [assigneeId, setAssigneeId] = useState(staffOptions[0]?.id ?? "");
  const [roleLabel, setRoleLabel] = useState<string>(ROLE_PRESETS[0]);

  // Verified timeline update form
  const [eventType, setEventType] = useState("staff.update");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);

  // Project message form
  const [messageBody, setMessageBody] = useState("");
  const [internalOnly, setInternalOnly] = useState(false);

  function notify(kind: "ok" | "err", text: string) {
    setFeedback({ kind, text });
  }

  function handleAssignExpert(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneeId) {
      notify("err", "Select a verified staff profile to assign.");
      return;
    }
    startTransition(async () => {
      const res = await assignProjectExpertAction({ projectId, assigneeId, roleLabel });
      if (res.ok) {
        notify("ok", "Human project expert assigned and logged to timeline.");
        router.refresh();
      } else {
        notify("err", res.error);
      }
    });
  }

  function handleRemoveExpert(assignmentId: string) {
    startTransition(async () => {
      const res = await removeProjectExpertAction({ assignmentId, projectId });
      if (res.ok) {
        notify("ok", "Expert assignment deactivated and audited.");
        router.refresh();
      } else {
        notify("err", res.error);
      }
    });
  }

  function handlePostTimeline(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await postProjectTimelineEventAction({
        projectId,
        eventType,
        title: eventTitle,
        detail: eventDetail,
        visibleToClient,
      });
      if (res.ok) {
        setEventTitle("");
        setEventDetail("");
        notify("ok", visibleToClient ? "Verified client-visible timeline update published." : "Internal timeline note recorded.");
        router.refresh();
      } else {
        notify("err", res.error);
      }
    });
  }

  function handlePostMessage(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await postAdminProjectMessageAction({
        projectId,
        body: messageBody,
        internalOnly,
      });
      if (res.ok) {
        setMessageBody("");
        notify("ok", internalOnly ? "Internal engineering note posted." : "Message sent to client workspace.");
        router.refresh();
      } else {
        notify("err", res.error);
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
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

      {/* 1. Human Expert Assignments */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <UserCheck size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Assigned Human Experts ({experts.length})</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Verified Staff Only · Audited in Timeline
          </span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "1.2rem" }}>
          {experts.length > 0 ? (
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {experts.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    border: "1px solid var(--line)",
                    background: "var(--bg-deep)",
                    padding: "0.8rem 1rem",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text)", fontSize: "0.94rem" }}>{exp.assigneeName}</strong>
                    <span className="mono cyan" style={{ display: "block", fontSize: "0.76rem", marginTop: "0.15rem" }}>
                      {exp.roleLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    disabled={isPending}
                    style={{ minHeight: 34, padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
                    onClick={() => handleRemoveExpert(exp.id)}
                  >
                    <UserMinus size={13} />
                    <span>Unassign</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              No human specialists assigned yet. Assign verified NotRealEngine staff below.
            </p>
          )}

          {staffOptions.length > 0 ? (
            <form
              onSubmit={handleAssignExpert}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "0.75rem",
                alignItems: "end",
                borderTop: "1px solid var(--line)",
                paddingTop: "1rem",
              }}
            >
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="assign-staff">Staff Specialist</label>
                <select
                  id="assign-staff"
                  className="select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="assign-role">Role on Project</label>
                <select
                  id="assign-role"
                  className="select"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                >
                  {ROLE_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <UserPlus size={14} />
                <span>Assign Expert</span>
              </button>
            </form>
          ) : (
            <p className="mono muted" style={{ margin: 0, fontSize: "0.78rem" }}>
              No staff profiles found (`profiles.is_staff = true`).
            </p>
          )}
        </div>
      </div>

      {/* 2. Staff-Controlled Verified Activity Timeline */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Clock size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Verified Project Activity Timeline ({timeline.length})</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Evidence-Backed Updates Only
          </span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "1.25rem" }}>
          <form
            onSubmit={handlePostTimeline}
            style={{
              display: "grid",
              gap: "0.85rem",
              border: "1px solid var(--line)",
              background: "var(--bg-deep)",
              padding: "1rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="tl-type">Event Category</label>
                <select
                  id="tl-type"
                  className="select"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  <option value="staff.update">Engineering Progress Update</option>
                  <option value="deliverable.ready">Deliverable Ready for Review</option>
                  <option value="qa.verified">QA & Security Verification</option>
                  <option value="scope.clarification">Scope Clarification Note</option>
                  <option value="internal.note">Internal Staff Checkpoint</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="tl-title">Update Headline</label>
                <input
                  id="tl-title"
                  className="input"
                  required
                  minLength={4}
                  maxLength={160}
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. Staging build verified across mobile & desktop"
                />
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="tl-detail">Verified Details</label>
              <textarea
                id="tl-detail"
                className="textarea"
                style={{ minHeight: 78 }}
                required
                minLength={5}
                maxLength={2000}
                value={eventDetail}
                onChange={(e) => setEventDetail(e.target.value)}
                placeholder="Document concrete work completed, links verified, or next human step..."
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.84rem", color: "var(--silver)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={visibleToClient}
                  onChange={(e) => setVisibleToClient(e.target.checked)}
                />
                <span>Visible in Client Workspace timeline</span>
              </label>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <ShieldCheck size={14} />
                <span>Publish Verified Update</span>
              </button>
            </div>
          </form>

          {timeline.length > 0 ? (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {timeline.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    borderLeft: `2px solid ${evt.visibleToClient ? "var(--cyan)" : "var(--gold)"}`,
                    borderTop: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                    padding: "0.85rem 1rem",
                    background: "var(--bg-deep)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <strong style={{ color: "var(--text)", fontSize: "0.92rem" }}>{evt.title}</strong>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span className="mono muted" style={{ fontSize: "0.72rem" }}>
                        {evt.visibleToClient ? "CLIENT VISIBLE" : "STAFF INTERNAL"}
                      </span>
                      <span className="mono muted" style={{ fontSize: "0.72rem" }}>
                        · {new Date(evt.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {evt.detail && (
                    <p style={{ margin: "0.4rem 0 0", color: "var(--silver)", fontSize: "0.85rem", lineHeight: 1.55 }}>
                      {evt.detail}
                    </p>
                  )}
                  <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginTop: "0.4rem" }}>
                    {evt.eventType} · Logged by {evt.actorName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              No timeline updates recorded yet. State changes, milestone updates, and staff notes appear here automatically.
            </p>
          )}
        </div>
      </div>

      {/* 3. Client ↔ Staff Project Communications */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <MessageSquare size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Project Communications Thread ({messages.length})</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Client Replies & Internal Engineering Notes
          </span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "1rem" }}>
          {messages.length > 0 ? (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: `1px solid ${m.internalOnly ? "var(--gold)" : "var(--line)"}`,
                    background: m.internalOnly ? "rgba(255, 196, 0, 0.05)" : "var(--bg-deep)",
                    padding: "0.85rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span className="mono" style={{ fontSize: "0.76rem", color: m.isStaffAuthor ? "var(--cyan)" : "var(--text)" }}>
                      {m.authorName} · {m.isStaffAuthor ? "NRE STAFF" : "CLIENT"}
                      {m.internalOnly ? " · INTERNAL ONLY" : ""}
                    </span>
                    <span className="mono muted" style={{ fontSize: "0.72rem" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: "0.45rem 0 0", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              No project messages yet.
            </p>
          )}

          <form onSubmit={handlePostMessage} style={{ display: "grid", gap: "0.75rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="admin-msg-body">Reply or Internal Note</label>
              <textarea
                id="admin-msg-body"
                className="textarea"
                style={{ minHeight: 80 }}
                required
                minLength={2}
                maxLength={4000}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write a clear, human-verified response to the client or an internal staff note..."
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.84rem", color: "var(--silver)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={internalOnly}
                  onChange={(e) => setInternalOnly(e.target.checked)}
                />
                <Lock size={13} />
                <span>Internal staff note only (hidden from client)</span>
              </label>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <Send size={14} />
                <span>{internalOnly ? "Save Internal Note" : "Send Client Reply"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ClientProjectOfficePanels({
  projectId,
  experts,
  timeline,
  messages,
}: {
  projectId: string;
  experts: ProjectExpertRecord[];
  timeline: ProjectTimelineRecord[];
  messages: ProjectMessageRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageBody, setMessageBody] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await postClientProjectMessageAction({ projectId, body: messageBody });
      if (res.ok) {
        setMessageBody("");
        setFeedback({ kind: "ok", text: "Message delivered to your NotRealEngine project team." });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Assigned Human Experts */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <UserCheck size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Assigned NotRealEngine Team</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Human-Led Engineering Delivery
          </span>
        </div>
        <div className="panel-body">
          {experts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {experts.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--bg-deep)",
                    padding: "0.9rem 1rem",
                  }}
                >
                  <strong style={{ display: "block", color: "var(--text)", fontSize: "0.94rem" }}>
                    {exp.assigneeName}
                  </strong>
                  <span className="mono cyan" style={{ display: "block", fontSize: "0.76rem", marginTop: "0.2rem" }}>
                    {exp.roleLabel}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              Your dedicated NotRealEngine specialist will be listed here once operational onboarding is finalized.
            </p>
          )}
        </div>
      </div>

      {/* Verified Activity Timeline */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Clock size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Verified Project Activity Timeline</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            {timeline.length} Recorded {timeline.length === 1 ? "Event" : "Events"}
          </span>
        </div>
        <div className="panel-body">
          {timeline.length > 0 ? (
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {timeline.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    borderLeft: "2px solid var(--cyan)",
                    borderTop: "1px solid var(--line)",
                    borderRight: "1px solid var(--line)",
                    borderBottom: "1px solid var(--line)",
                    padding: "0.85rem 1rem",
                    background: "var(--bg-deep)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <strong style={{ color: "var(--text)", fontSize: "0.92rem" }}>{evt.title}</strong>
                    <span className="mono muted" style={{ fontSize: "0.74rem" }}>
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {evt.detail && (
                    <p style={{ margin: "0.4rem 0 0", color: "var(--silver)", fontSize: "0.85rem", lineHeight: 1.55 }}>
                      {evt.detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              Verified engineering updates, milestone completions, and deliverable notices will appear here as work progresses.
            </p>
          )}
        </div>
      </div>

      {/* Client ↔ Staff Messages */}
      <div className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <MessageSquare size={17} className="cyan" />
            <h2 style={{ margin: 0 }}>Project Communications</h2>
          </div>
          <span className="mono muted" style={{ fontSize: "0.76rem" }}>
            Direct Thread with Your Engineering Team
          </span>
        </div>
        <div className="panel-body" style={{ display: "grid", gap: "1rem" }}>
          {feedback && (
            <div
              role={feedback.kind === "err" ? "alert" : "status"}
              style={{
                padding: "0.75rem 0.9rem",
                border: `1px solid ${feedback.kind === "err" ? "var(--danger)" : "var(--cyan)"}`,
                background: feedback.kind === "err" ? "rgba(255, 77, 109, 0.08)" : "rgba(29, 216, 255, 0.08)",
                color: "var(--text)",
                fontSize: "0.84rem",
              }}
            >
              {feedback.text}
            </div>
          )}

          {messages.length > 0 ? (
            <div style={{ display: "grid", gap: "0.65rem" }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid var(--line)",
                    background: "var(--bg-deep)",
                    padding: "0.85rem 1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <span className="mono" style={{ fontSize: "0.76rem", color: m.isStaffAuthor ? "var(--cyan)" : "var(--text)" }}>
                      {m.authorName} · {m.isStaffAuthor ? "NOTREALENGINE TEAM" : "YOUR TEAM"}
                    </span>
                    <span className="mono muted" style={{ fontSize: "0.72rem" }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: "0.45rem 0 0", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {m.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
              No messages yet. Use the form below to ask a question or share clarifications with your assigned engineer.
            </p>
          )}

          <form onSubmit={handleSend} style={{ display: "grid", gap: "0.75rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="client-msg-body">Message Your Engineering Team</label>
              <textarea
                id="client-msg-body"
                className="textarea"
                style={{ minHeight: 80 }}
                required
                minLength={2}
                maxLength={4000}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Share a question, asset note, or clarification..."
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <Send size={14} />
                <span>Send Message</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
