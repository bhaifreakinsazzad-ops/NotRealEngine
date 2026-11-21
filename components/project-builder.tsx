"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Copy, Check, AlertCircle, Search } from "lucide-react";
import {
  calculateStartingEstimateBdt,
  coreTechnicalServices,
  formatBdt,
  formatStartingFromBdt,
  serviceById,
  standaloneServices,
} from "@/lib/catalog";

type Draft = {
  goal: string;
  problem: string;
  serviceId: string;
  addonIds: string[];
  designDirection: string;
  budgetBand: "under-25k" | "25k-75k" | "75k-200k" | "200k-plus" | "not-sure";
  targetDate: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  consent: boolean;
  step: number;
};

const steps = [
  "01 Goal",
  "02 Service",
  "03 Add-ons",
  "04 Design",
  "05 Timeline",
  "06 Review & Send",
] as const;

const initialDraft = (serviceId = ""): Draft => ({
  goal: "",
  problem: "",
  serviceId,
  addonIds: [],
  designDirection: "",
  budgetBand: "not-sure",
  targetDate: "",
  name: "",
  email: "",
  phone: "",
  organization: "",
  consent: false,
  step: 1,
});

function buildBriefMarkdown(draft: Draft): string {
  const svc = serviceById(draft.serviceId);
  const estimate = svc ? calculateStartingEstimateBdt(svc.id, draft.addonIds) : null;
  const lines = [
    "# NotRealEngine — Project Scope Blueprint",
    "",
    `- **Primary Goal:** ${draft.goal || "Not yet specified"}`,
    `- **Selected Service:** ${svc ? `${svc.id} — ${svc.name} (${formatStartingFromBdt(svc.startingPriceBdt)})` : "Not selected"}`,
    `- **Selected Compatible Add-ons:** ${
      estimate && estimate.validAddons.length > 0
        ? estimate.validAddons.map((a) => `${a.id} ${a.name} (${formatStartingFromBdt(a.startingPriceBdt)})`).join("; ")
        : "None"
    }`,
    `- **Indicative Starting From Total:** ${
      estimate ? `${formatStartingFromBdt(estimate.totalBdt)} (non-binding until formal quotation)` : "Pending service selection"
    }`,
    `- **Budget Band:** ${draft.budgetBand}`,
    `- **Target Date:** ${draft.targetDate || "Flexible"}`,
    "",
    "## Operational Context & Requirements",
    draft.problem || "(Pending details)",
    "",
    "## Design & Brand Direction",
    draft.designDirection || "(Not specified)",
    "",
    "---",
    "Generated via NotRealEngine Project Builder (Canonical Catalog v5). Direct checkout is disabled; final scope and pricing are issued in a written quotation.",
  ];
  return lines.join("\n");
}

export function ProjectBuilder({
  initialServiceId = "",
  initialDraftToken = "",
  initialStep = 1,
  initialGoal = "",
  initialProblem = "",
}: {
  initialServiceId?: string;
  initialDraftToken?: string;
  initialStep?: number;
  initialGoal?: string;
  initialProblem?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const base = initialDraft(serviceById(initialServiceId) ? initialServiceId : "");
    return {
      ...base,
      step: Math.min(6, Math.max(1, initialStep)),
      goal: initialGoal || base.goal,
      problem: initialProblem || base.problem,
    };
  });
  const [serviceSegmentTab, setServiceSegmentTab] = useState<"standalone" | "core_technical">("standalone");
  const [serviceQuery, setServiceQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; next: string } | null>(null);
  const [draftToken, setDraftToken] = useState(initialDraftToken);
  const [copied, setCopied] = useState(false);

  const service = useMemo(() => serviceById(draft.serviceId), [draft.serviceId]);
  const estimate = useMemo(
    () => (draft.serviceId ? calculateStartingEstimateBdt(draft.serviceId, draft.addonIds) : null),
    [draft.serviceId, draft.addonIds]
  );

  const visibleServices = useMemo(() => {
    const pool = serviceSegmentTab === "standalone" ? standaloneServices : coreTechnicalServices;
    const q = serviceQuery.trim().toLowerCase();
    if (!q) return pool;
    return [...standaloneServices, ...coreTechnicalServices].filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q)
    );
  }, [serviceSegmentTab, serviceQuery]);

  useEffect(() => {
    if (!initialDraftToken) return;
    fetch(`/api/drafts?token=${encodeURIComponent(initialDraftToken)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.payload || typeof data.payload !== "object") return;
        const loadedServiceId =
          typeof data.payload.serviceId === "string" && serviceById(data.payload.serviceId)
            ? data.payload.serviceId
            : "";
        setDraft((current) => ({
          ...current,
          ...data.payload,
          serviceId: loadedServiceId,
          addonIds: Array.isArray(data.payload.addonIds) ? data.payload.addonIds : [],
        }));
      })
      .catch(() => {});
  }, [initialDraftToken]);

  async function saveDraft() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save server draft.");
      setDraftToken(data.draftToken);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save draft.");
    } finally {
      setSaving(false);
    }
  }

  function exportMarkdown() {
    const content = buildBriefMarkdown(draft);
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nre-project-blueprint-${draft.serviceId || "draft"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      catalogVersion: "v5",
      goal: draft.goal,
      problem: draft.problem,
      serviceId: draft.serviceId || null,
      serviceName: service?.name ?? null,
      addonIds: draft.addonIds,
      startingEstimateBdt: estimate?.totalBdt ?? null,
      budgetBand: draft.budgetBand,
      targetDate: draft.targetDate || null,
      designDirection: draft.designDirection,
      commercialNote: "Starting From estimate only; non-binding until formal quotation.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nre-project-blueprint-${draft.serviceId || "draft"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyBlueprint() {
    try {
      await navigator.clipboard.writeText(buildBriefMarkdown(draft));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard access unavailable in this browser context. Use Download .md instead.");
    }
  }

  function toggleAddon(addonId: string) {
    setDraft((current) => {
      const next = new Set(current.addonIds);
      if (next.has(addonId)) next.delete(addonId);
      else next.add(addonId);
      return { ...current, addonIds: [...next] };
    });
  }

  async function submitBrief(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/project-briefs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          targetDate: draft.targetDate || null,
          attribution: { source: "web-builder-v5", campaign: null },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please check the required fields.");
      setSubmitted(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit brief.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="shell" style={{ padding: "4rem 0" }}>
        <div className="success-box">
          <div className="section-code">PROJECT BRIEF RECORDED</div>
          <h1 style={{ marginTop: 0 }}>Request {submitted.reference} received.</h1>
          <p className="muted" style={{ maxWidth: 680 }}>
            {submitted.next} Submitting a project brief does not create an order or payment
            obligation. A human engineer reviews every submission before issuing a written quotation.
          </p>
          <div className="hero-actions" style={{ marginTop: "1.5rem" }}>
            <Link className="btn btn-primary" href="/dashboard">
              Open NRE OFFICE Workspace
            </Link>
            <button type="button" className="btn" onClick={exportMarkdown}>
              <Download size={15} />
              <span>Download brief (.md)</span>
            </button>
            <Link className="btn" href="/services">
              Return to Services
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="builder">
      <div className="builder-head">
        <div className="shell">
          <div className="section-code">NRE SELECT · INTERACTIVE PROJECT BUILDER</div>
          <h1>Configure your project scope.</h1>
          <div className="stepper" aria-label="Configuration progress">
            {steps.map((label, index) => {
              const node = index + 1;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDraft((c) => ({ ...c, step: node }))}
                  className={`step-node${draft.step === node ? " active" : draft.step > node ? " done" : ""}`}
                  style={{ background: "none", borderRight: 0, borderLeft: 0, borderBottom: 0, textAlign: "left", cursor: "pointer" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shell builder-body">
        <form className="builder-main" onSubmit={submitBrief}>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          {draft.step === 1 && (
            <>
              <h2>Business goal and operational context</h2>
              <p>Describe what the system should achieve. You can export your structured blueprint for free before sharing contact details.</p>
              <div className="field">
                <label htmlFor="goal">Primary goal</label>
                <input
                  id="goal"
                  className="input"
                  value={draft.goal}
                  onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                  placeholder="e.g. Launch a bilingual business website or build a client portal"
                />
              </div>
              <div className="field">
                <label htmlFor="problem">Current workflow, challenges, and key requirements (min 20 chars for submission)</label>
                <textarea
                  id="problem"
                  className="textarea"
                  value={draft.problem}
                  onChange={(e) => setDraft({ ...draft, problem: e.target.value })}
                  placeholder="Who uses the system, what breaks today, and what must work cleanly on day one?"
                />
              </div>
            </>
          )}

          {draft.step === 2 && (
            <>
              <h2>Select a canonical v5 service</h2>
              <p>Choose from 13 Standalone Services or 9 Core Technical Services. Public BDT figures are Starting From estimates only.</p>

              <div className="catalog-toolbar" style={{ marginBottom: "1.25rem", paddingBottom: "1rem" }}>
                <div className="segment-tabs">
                  <button
                    type="button"
                    className={`segment-tab${serviceSegmentTab === "standalone" ? " active" : ""}`}
                    onClick={() => setServiceSegmentTab("standalone")}
                  >
                    Standalone ({standaloneServices.length})
                  </button>
                  <button
                    type="button"
                    className={`segment-tab${serviceSegmentTab === "core_technical" ? " active" : ""}`}
                    onClick={() => setServiceSegmentTab("core_technical")}
                  >
                    Core Technical ({coreTechnicalServices.length})
                  </button>
                </div>
                <div className="catalog-search-wrap" style={{ minWidth: 200 }}>
                  <Search size={14} />
                  <input
                    type="search"
                    className="catalog-search-input"
                    placeholder="Filter services..."
                    value={serviceQuery}
                    onChange={(e) => setServiceQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="service-options">
                {visibleServices.map((item) => (
                  <label key={item.id} className="service-option">
                    <input
                      type="radio"
                      name="serviceId"
                      checked={draft.serviceId === item.id}
                      onChange={() => setDraft({ ...draft, serviceId: item.id, addonIds: [] })}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                        <strong>
                          <span className="mono cyan" style={{ marginRight: 8 }}>{item.id}</span>
                          {item.name}
                        </strong>
                        <span className="mono tabular" style={{ fontSize: ".8rem", color: "var(--text)" }}>
                          {formatStartingFromBdt(item.startingPriceBdt)}
                        </span>
                      </div>
                      <small>{item.summary}</small>
                      {item.scopeCaveat && (
                        <small style={{ color: "var(--gold)", marginTop: 4 }}>
                          Note: {item.scopeCaveat}
                        </small>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {draft.step === 3 && (
            <>
              <h2>Compatible add-ons</h2>
              <p>
                Only verified v5 add-ons compatible with your selected service are shown. Compatible
                add-ons are scoped once without double-billing overlapping features.
              </p>
              {!service ? (
                <div className="error-box">Select a service in Step 02 first.</div>
              ) : service.addons.length === 0 ? (
                <div className="panel">
                  <div className="panel-body">
                    <strong style={{ display: "block", marginBottom: ".4rem" }}>
                      No separate add-ons apply to {service.id} — {service.name}
                    </strong>
                    <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                      This engagement is scoped directly around your technical brief. Continue to
                      Design & Notes or describe any special integration requirements in Step 04.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="addon-options">
                  {service.addons.map((addon) => (
                    <label key={addon.id} className="addon-option">
                      <input
                        type="checkbox"
                        checked={draft.addonIds.includes(addon.id)}
                        onChange={() => toggleAddon(addon.id)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                          <strong>
                            <span className="mono cyan" style={{ marginRight: 8 }}>{addon.id}</span>
                            {addon.label}
                          </strong>
                          <span className="mono tabular" style={{ fontSize: ".78rem", color: "var(--silver)" }}>
                            + {formatStartingFromBdt(addon.startingPriceBdt)}
                          </span>
                        </div>
                        <small>{addon.summary}</small>
                        {addon.note && <small style={{ color: "var(--gold)", marginTop: 4 }}>{addon.note}</small>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {draft.step === 4 && (
            <>
              <h2>Design, language & technical notes</h2>
              <p>Share references, Bangla/English requirements, existing URLs, or brand constraints.</p>
              <div className="field">
                <label htmlFor="designDirection">Design direction and technical references</label>
                <textarea
                  id="designDirection"
                  className="textarea"
                  value={draft.designDirection}
                  onChange={(e) => setDraft({ ...draft, designDirection: e.target.value })}
                  placeholder="Existing website URL, brand palette preferences, Bangla/English language needs, or reference links..."
                />
              </div>
            </>
          )}

          {draft.step === 5 && (
            <>
              <h2>Budget band and target launch window</h2>
              <p>Used only to calibrate architecture options and milestone phases for your written quotation.</p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="budgetBand">Estimated budget band (BDT)</label>
                  <select
                    id="budgetBand"
                    className="select"
                    value={draft.budgetBand}
                    onChange={(e) =>
                      setDraft({ ...draft, budgetBand: e.target.value as Draft["budgetBand"] })
                    }
                  >
                    <option value="under-25k">Under ৳25,000</option>
                    <option value="25k-75k">৳25,000 – ৳75,000</option>
                    <option value="75k-200k">৳75,000 – ৳200,000</option>
                    <option value="200k-plus">৳200,000+</option>
                    <option value="not-sure">Not sure yet — guide me</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="targetDate">Target date (optional)</label>
                  <input
                    id="targetDate"
                    type="date"
                    className="input"
                    value={draft.targetDate}
                    onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {draft.step === 6 && (
            <>
              <h2>Contact details and quotation request</h2>
              <p>
                Submitting creates a structured lead and project brief for human review. No order,
                charge, or automatic checkout is triggered.
              </p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name">Your name</label>
                  <input
                    id="name"
                    className="input"
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="organization">Company / organization (optional)</label>
                  <input
                    id="organization"
                    className="input"
                    value={draft.organization}
                    onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    required
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone / WhatsApp</label>
                  <input
                    id="phone"
                    className="input"
                    required
                    value={draft.phone}
                    onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  />
                </div>
              </div>
              <label className="addon-option" style={{ marginTop: ".5rem" }}>
                <input
                  type="checkbox"
                  checked={draft.consent}
                  onChange={(e) => setDraft({ ...draft, consent: e.target.checked })}
                />
                <span>
                  I agree that NotRealEngine may review this project brief and contact me regarding
                  scoping and a formal quotation.
                </span>
              </label>
            </>
          )}

          <div className="builder-actions">
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
              {draft.step > 1 && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDraft({ ...draft, step: draft.step - 1 })}
                >
                  Back
                </button>
              )}
              <button type="button" className="btn btn-quiet" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save server draft"}
              </button>
            </div>
            {draft.step < 6 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDraft({ ...draft, step: draft.step + 1 })}
              >
                Continue
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit quotation request"}
              </button>
            )}
          </div>
        </form>

        <aside className="builder-summary">
          <h2>Live Blueprint Summary</h2>

          <div className="summary-row">
            <span>Selected Service</span>
            <strong>
              {service ? `${service.id} — ${service.name}` : "Not selected yet"}
            </strong>
          </div>

          <div className="summary-row">
            <span>Compatible Add-ons</span>
            <strong className="tabular">
              {estimate && estimate.validAddons.length > 0
                ? `${estimate.validAddons.length} selected (+${formatBdt(estimate.addonsBdt)})`
                : "None selected"}
            </strong>
          </div>

          <div className="summary-row">
            <span>Indicative Launch Starting From</span>
            <strong className="cyan mono tabular" style={{ fontSize: "1.08rem" }}>
              {estimate ? formatStartingFromBdt(estimate.totalBdt) : "Select a service"}
            </strong>
            <small className="muted" style={{ display: "block", marginTop: ".35rem", fontSize: ".76rem", lineHeight: 1.45 }}>
              Non-binding Starting From estimate. Final price is confirmed in a written quotation after human review.
            </small>
          </div>

          {service?.scopeCaveat && (
            <div className="summary-row">
              <div style={{ display: "flex", gap: ".45rem", color: "var(--gold)", fontSize: ".76rem", lineHeight: 1.45 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{service.scopeCaveat}</span>
              </div>
            </div>
          )}

          <div className="summary-row">
            <span>Free Export (No Login Required)</span>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".4rem" }}>
              <button type="button" className="btn" style={{ minHeight: 36, padding: ".4rem .7rem", fontSize: ".76rem" }} onClick={copyBlueprint}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy MD"}</span>
              </button>
              <button type="button" className="btn" style={{ minHeight: 36, padding: ".4rem .7rem", fontSize: ".76rem" }} onClick={exportMarkdown}>
                <Download size={13} />
                <span>.md</span>
              </button>
              <button type="button" className="btn" style={{ minHeight: 36, padding: ".4rem .7rem", fontSize: ".76rem" }} onClick={exportJson}>
                <Download size={13} />
                <span>.json</span>
              </button>
            </div>
          </div>

          {draftToken && (
            <div className="summary-row">
              <span>Server Draft Saved</span>
              <Link className="cyan mono" style={{ fontSize: ".78rem" }} href={`/build/review?draft=${draftToken}`}>
                Resume link ready →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
