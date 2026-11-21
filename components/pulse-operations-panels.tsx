"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Activity, Check, ShieldCheck } from "lucide-react";
import { pulseCoverageModules, pulsePlans } from "@/lib/catalog";
import {
  PULSE_SUBSCRIPTION_STATUSES,
  type PulseSubscriptionStatus,
  resolvePulseModuleLabel,
  resolvePulsePlanName,
} from "@/lib/domain/pulse";
import { requestPulseEligibilityAction } from "@/app/dashboard/actions";
import { updatePulseSubscriptionAction } from "@/app/admin/actions";

export interface PulseSubscriptionRecord {
  id: string;
  organizationId: string;
  organizationName?: string;
  projectId: string | null;
  planId: "PULSE_FLEX" | "PULSE_CORE" | "PULSE_PRIME";
  status: PulseSubscriptionStatus;
  coverageModuleIds: string[];
  billingMode: string;
  scopeNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const PULSE_STATUS_BADGE: Record<PulseSubscriptionStatus, string> = {
  inquiry: "status pending",
  eligibility_review: "status info",
  approved_manual: "status gold",
  active_manual: "status ready",
  paused: "status muted",
  closed: "status danger",
};

export function ClientPulseEligibilityPanel({
  organizationId,
  projects,
  subscriptions,
}: {
  organizationId?: string;
  projects: { id: string; serviceId: string }[];
  subscriptions: PulseSubscriptionRecord[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState<"PULSE_FLEX" | "PULSE_CORE" | "PULSE_PRIME">("PULSE_FLEX");
  const [projectId, setProjectId] = useState<string>("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["M01", "M02"]);
  const [scopeNotes, setScopeNotes] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function toggleModule(id: string) {
    setSelectedModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!organizationId) return;
    startTransition(async () => {
      const res = await requestPulseEligibilityAction({
        organizationId,
        projectId: projectId || null,
        planId,
        coverageModuleIds: selectedModules,
        scopeNotes,
      });
      if (res.ok) {
        setScopeNotes("");
        setFeedback({
          kind: "ok",
          text: "NRE PULSE eligibility review submitted. Recurring auto-billing remains disabled; staff will confirm scope and manual invoicing.",
        });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.error });
      }
    });
  }

  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <Activity size={18} className="cyan" />
          <h2 style={{ margin: 0 }}>NRE PULSE Ongoing Care & Eligibility</h2>
        </div>
        <span className="mono muted" style={{ fontSize: "0.75rem" }}>
          Recurring Auto-Billing Disabled · Manual Scope Review Only
        </span>
      </div>

      <div className="panel-body" style={{ display: "grid", gap: "1.25rem" }}>
        {feedback && (
          <div
            role={feedback.kind === "err" ? "alert" : "status"}
            style={{
              padding: "0.8rem 1rem",
              border: `1px solid ${feedback.kind === "err" ? "var(--danger)" : "var(--cyan)"}`,
              background: feedback.kind === "err" ? "rgba(255, 77, 109, 0.08)" : "rgba(29, 216, 255, 0.08)",
              fontSize: "0.85rem",
            }}
          >
            {feedback.text}
          </div>
        )}

        {subscriptions.length > 0 && (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                style={{
                  border: "1px solid var(--line)",
                  background: "var(--bg-deep)",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <strong style={{ color: "var(--text)", fontSize: "0.96rem" }}>
                      {resolvePulsePlanName(sub.planId)}
                    </strong>
                    <span className="mono muted" style={{ display: "block", fontSize: "0.75rem", marginTop: "0.15rem" }}>
                      Manual Invoicing Only · Requested {new Date(sub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={PULSE_STATUS_BADGE[sub.status] || "status"}>
                    {sub.status.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "var(--silver)" }}>
                  <strong>Assigned / Requested Coverage Modules:</strong>{" "}
                  {sub.coverageModuleIds.map((m) => resolvePulseModuleLabel(m)).join(" · ")}
                </div>
                {sub.scopeNotes && (
                  <p style={{ margin: "0.45rem 0 0", color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                    {sub.scopeNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {organizationId ? (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.85rem", borderTop: subscriptions.length > 0 ? "1px solid var(--line)" : "none", paddingTop: subscriptions.length > 0 ? "1rem" : 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="pulse-plan">NRE PULSE Tier</label>
                <select
                  id="pulse-plan"
                  className="select"
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value as "PULSE_FLEX" | "PULSE_CORE" | "PULSE_PRIME")}
                >
                  {pulsePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Starting From BDT {p.weeklyStartingPriceBdt.toLocaleString("en-US")}/wk (Proposed BDT {p.proposedMonthlyPriceBdt.toLocaleString("en-US")}/mo)
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="pulse-project">Related Project (optional)</label>
                <select
                  id="pulse-project"
                  className="select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">General Organization Care</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id.slice(0, 8)} · {p.serviceId}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>Coverage Modules Requested (M01–M07)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.5rem" }}>
                {pulseCoverageModules.map((mod) => (
                  <label key={mod.id} className="addon-option" style={{ padding: "0.55rem 0.75rem" }}>
                    <input
                      type="checkbox"
                      checked={selectedModules.includes(mod.id)}
                      onChange={() => toggleModule(mod.id)}
                    />
                    <span style={{ fontSize: "0.82rem" }}>
                      <strong className="mono cyan" style={{ display: "inline", marginRight: 6 }}>
                        {mod.id}
                      </strong>
                      {mod.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="pulse-notes">System & Ongoing Care Scope Notes</label>
              <textarea
                id="pulse-notes"
                className="textarea"
                style={{ minHeight: 76 }}
                required
                minLength={10}
                maxLength={2000}
                value={scopeNotes}
                onChange={(e) => setScopeNotes(e.target.value)}
                placeholder="Describe the live website/application, hosting setup, and care cadence you need..."
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <span className="mono muted" style={{ fontSize: "0.74rem" }}>
                No card or automated charge is collected. Subject to human eligibility review.
              </span>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                <ShieldCheck size={14} />
                <span>Request Eligibility Review</span>
              </button>
            </div>
          </form>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            An active organization membership is required to submit NRE PULSE eligibility requests.
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminPulseOperationsPanel({
  subscriptions,
}: {
  subscriptions: PulseSubscriptionRecord[];
}) {
  return (
    <div className="panel" style={{ marginTop: "1.5rem" }}>
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <Activity size={18} className="cyan" />
          <h2 style={{ margin: 0 }}>NRE PULSE Eligibility & Coverage Desk ({subscriptions.length})</h2>
        </div>
        <span className="mono muted" style={{ fontSize: "0.75rem" }}>
          Billing Mode: Manual Invoicing Only (Auto-Billing OFF)
        </span>
      </div>
      <div className="panel-body">
        {subscriptions.length > 0 ? (
          <div style={{ display: "grid", gap: "1rem" }}>
            {subscriptions.map((sub) => (
              <AdminPulseRow key={sub.id} subscription={sub} />
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.86rem" }}>
            No NRE PULSE eligibility requests recorded yet. Client requests submitted from NRE OFFICE appear here for staff review.
          </p>
        )}
      </div>
    </div>
  );
}

function AdminPulseRow({ subscription }: { subscription: PulseSubscriptionRecord }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState(subscription.planId);
  const [status, setStatus] = useState<PulseSubscriptionStatus>(subscription.status);
  const [modules, setModules] = useState<string[]>(subscription.coverageModuleIds);
  const [scopeNotes, setScopeNotes] = useState(subscription.scopeNotes ?? "");
  const [savedMsg, setSavedMsg] = useState("");

  function toggleModule(id: string) {
    setModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMsg("");
    startTransition(async () => {
      const res = await updatePulseSubscriptionAction({
        subscriptionId: subscription.id,
        planId,
        status,
        coverageModuleIds: modules,
        scopeNotes,
      });
      if (res.ok) {
        setSavedMsg("Saved & audited.");
        router.refresh();
      } else {
        setSavedMsg(`Error: ${res.error}`);
      }
    });
  }

  return (
    <form
      onSubmit={handleSave}
      style={{
        border: "1px solid var(--line)",
        background: "var(--bg-deep)",
        padding: "1rem",
        display: "grid",
        gap: "0.85rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <strong style={{ color: "var(--text)", fontSize: "0.96rem" }}>
            {subscription.organizationName || "Client Organization"}
          </strong>
          <span className="mono muted" style={{ display: "block", fontSize: "0.75rem", marginTop: "0.15rem" }}>
            PULSE #{subscription.id.slice(0, 8)} · Requested {new Date(subscription.createdAt).toLocaleString()} ·{" "}
            {subscription.billingMode}
          </span>
        </div>
        <span className={PULSE_STATUS_BADGE[status] || "status"}>
          {status.replace(/_/g, " ").toUpperCase()}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem" }}>
        <div className="field" style={{ margin: 0 }}>
          <label>Assigned PULSE Plan</label>
          <select
            className="select"
            value={planId}
            onChange={(e) => setPlanId(e.target.value as "PULSE_FLEX" | "PULSE_CORE" | "PULSE_PRIME")}
          >
            {pulsePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (Starting From BDT {p.weeklyStartingPriceBdt.toLocaleString("en-US")}/wk · Proposed BDT {p.proposedMonthlyPriceBdt.toLocaleString("en-US")}/mo)
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>Eligibility / Operational Status</label>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as PulseSubscriptionStatus)}
          >
            {PULSE_SUBSCRIPTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field" style={{ margin: 0 }}>
        <label>Assigned Coverage Modules (M01–M07)</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
          {pulseCoverageModules.map((mod) => (
            <label
              key={mod.id}
              className="addon-option"
              style={{ padding: "0.4rem 0.65rem", width: "auto" }}
            >
              <input
                type="checkbox"
                checked={modules.includes(mod.id)}
                onChange={() => toggleModule(mod.id)}
              />
              <span className="mono" style={{ fontSize: "0.76rem" }}>
                {mod.id} · {mod.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="field" style={{ margin: 0 }}>
        <label>Staff Scope & Eligibility Review Notes</label>
        <textarea
          className="textarea"
          style={{ minHeight: 68 }}
          value={scopeNotes}
          onChange={(e) => setScopeNotes(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span className="mono cyan" style={{ fontSize: "0.76rem" }}>
          {savedMsg}
        </span>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          <Check size={14} />
          <span>Save Eligibility & Coverage</span>
        </button>
      </div>
    </form>
  );
}
