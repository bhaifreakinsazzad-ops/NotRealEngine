"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { serviceById, services } from "@/lib/catalog";

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
};

const steps = ["Business goal", "Service", "Features", "Design", "Budget", "Review"];
const initialDraft = (serviceId = ""): Draft => ({ goal: "", problem: "", serviceId, addonIds: [], designDirection: "", budgetBand: "not-sure", targetDate: "", name: "", email: "", phone: "", organization: "", consent: false });

export function ProjectBuilder({ initialServiceId = "" }: { initialServiceId?: string }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(() => initialDraft(serviceById(initialServiceId) ? initialServiceId : ""));
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const service = useMemo(() => serviceById(draft.serviceId), [draft.serviceId]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); setError(""); }

  function validateCurrent() {
    if (step === 1 && (draft.goal.trim().length < 3 || draft.problem.trim().length < 20)) return "Describe the business goal and problem in enough detail to guide the scope.";
    if (step === 2 && !service) return "Select one canonical service to continue.";
    if (step === 5 && !draft.budgetBand) return "Choose a budget band or select Not sure yet.";
    if (step === 6 && (draft.name.trim().length < 2 || !draft.email.includes("@") || draft.phone.trim().length < 7 || !draft.consent)) return "Complete the contact fields and consent before submitting.";
    return "";
  }

  function next() { const message = validateCurrent(); if (message) return setError(message); setStep((current) => Math.min(6, current + 1)); }
  function back() { setError(""); setStep((current) => Math.max(1, current - 1)); }

  function toggleAddon(id: string) {
    if (!service) return;
    const selected = new Set(draft.addonIds);
    const addon = service.addons.find((item) => item.id === id);
    if (!addon) return;
    if (selected.has(id)) selected.delete(id); else {
      for (const conflict of addon.conflicts ?? []) selected.delete(conflict);
      selected.add(id);
      for (const required of addon.requires ?? []) selected.add(required);
    }
    update("addonIds", [...selected]);
  }

  async function submit() {
    const message = validateCurrent();
    if (message) return setError(message);
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/project-briefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, targetDate: draft.targetDate || null, attribution: { source: new URLSearchParams(location.search).get("utm_source"), campaign: new URLSearchParams(location.search).get("utm_campaign") } }) });
      const body = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !body.reference) throw new Error(body.error || "The project brief could not be submitted.");
      setReference(body.reference);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The project brief could not be submitted."); }
    finally { setSubmitting(false); }
  }

  if (reference) return <div className="success-box"><CheckCircle2 size={32} className="cyan" /><h2>Project brief received.</h2><p>Your reference is <strong className="mono">{reference}</strong>. This confirms secure intake only; it is not a quotation, order, payment, or delivery commitment.</p></div>;

  return (
    <div className="builder">
      <div className="builder-head"><div className="shell"><span className="mono cyan">ENGINE//OS · PROJECT CONFIGURATION</span><h1>Configure your project</h1><div className="stepper" aria-label="Project builder progress">{steps.map((label, index) => <div key={label} className={`step-node ${step === index + 1 ? "active" : step > index + 1 ? "done" : ""}`}>{String(index + 1).padStart(2, "0")} · {label}</div>)}</div></div></div>
      <div className="shell builder-body">
        <div className="builder-main">
          {step === 1 && <><h2>What should this project change for your business?</h2><p>Start with the outcome. Technical decisions come later.</p><div className="form-grid"><div className="field full"><label htmlFor="goal">Primary business goal</label><input id="goal" className="input" value={draft.goal} onChange={(e) => update("goal", e.target.value)} placeholder="Example: reduce manual order tracking" /></div><div className="field full"><label htmlFor="problem">Current problem and desired result</label><textarea id="problem" className="textarea" value={draft.problem} onChange={(e) => update("problem", e.target.value)} placeholder="Describe the current workflow, who uses it, and what should improve." /></div></div></>}
          {step === 2 && <><h2>Select the closest service</h2><p>You can revise this choice during quotation review.</p><div className="service-options">{services.map((item) => <label className="service-option" key={item.id}><input type="radio" name="service" value={item.id} checked={draft.serviceId === item.id} onChange={() => { update("serviceId", item.id); update("addonIds", []); }} /><span><strong>{item.name}</strong><small>{item.summary}</small></span></label>)}</div></>}
          {step === 3 && service && <><h2>Choose optional capabilities</h2><p>Included capabilities are always part of the initial scope. Add-ons remain subject to quotation.</p><div className="list-rail" style={{ marginBottom: "1.5rem" }}>{service.included.map((item) => <div className="list-row" key={item}><CheckCircle2 size={18} /><span>{item} <small className="mono muted"> · INCLUDED</small></span></div>)}</div><div className="addon-options">{service.addons.map((addon) => <label className="addon-option" key={addon.id}><input type="checkbox" checked={draft.addonIds.includes(addon.id)} onChange={() => toggleAddon(addon.id)} /><span><strong>{addon.label}</strong><small>{addon.requires?.length ? "Required dependencies are selected automatically." : "Quoted after scope review."}</small></span></label>)}</div></>}
          {step === 4 && <><h2>Define the design direction</h2><p>Describe how the finished product should feel. Do not include passwords, private credentials, or sensitive customer data.</p><div className="field"><label htmlFor="design">Direction, references, and constraints</label><textarea id="design" className="textarea" value={draft.designDirection} onChange={(e) => update("designDirection", e.target.value)} placeholder="Example: calm, premium, bilingual, mobile-first; existing brand guide available." /></div></>}
          {step === 5 && <><h2>Budget and timing</h2><p>These inputs guide feasibility; they do not create an approved price or delivery guarantee.</p><div className="form-grid"><div className="field"><label htmlFor="budget">Working budget band</label><select id="budget" className="select" value={draft.budgetBand} onChange={(e) => update("budgetBand", e.target.value as Draft["budgetBand"])}><option value="not-sure">Not sure yet</option><option value="under-25k">Under ৳25,000</option><option value="25k-75k">৳25,000–৳75,000</option><option value="75k-200k">৳75,000–৳200,000</option><option value="200k-plus">৳200,000+</option></select></div><div className="field"><label htmlFor="date">Desired target date</label><input id="date" type="date" className="input" value={draft.targetDate} min={new Date().toISOString().slice(0,10)} onChange={(e) => update("targetDate", e.target.value)} /></div></div></>}
          {step === 6 && <><h2>Review and submit the brief</h2><p>Your contact details are used to review this request and securely associate it with a verified account later.</p><div className="form-grid"><div className="field"><label htmlFor="name">Full name</label><input id="name" className="input" value={draft.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" /></div><div className="field"><label htmlFor="email">Email</label><input id="email" className="input" value={draft.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" type="email" /></div><div className="field"><label htmlFor="phone">Phone</label><input id="phone" className="input" value={draft.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" /></div><div className="field"><label htmlFor="org">Organization</label><input id="org" className="input" value={draft.organization} onChange={(e) => update("organization", e.target.value)} autoComplete="organization" /></div><label className="addon-option field full"><input type="checkbox" checked={draft.consent} onChange={(e) => update("consent", e.target.checked)} /><span><strong>I consent to project-request processing.</strong><small>This does not accept commercial or legal terms and does not authorize payment.</small></span></label></div></>}
          {error && <div className="error-box" role="alert">{error}</div>}
          <div className="builder-actions"><button className="btn" type="button" onClick={back} disabled={step === 1}><ArrowLeft size={17} /> Back</button>{step < 6 ? <button className="btn btn-primary" type="button" onClick={next}>Continue <ArrowRight size={17} /></button> : <button className="btn btn-primary" type="button" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit project brief"} <ArrowRight size={17} /></button>}</div>
        </div>
        <aside className="builder-summary"><h2>Project summary</h2><div className="summary-row"><span>GOAL</span>{draft.goal || "Not set"}</div><div className="summary-row"><span>SERVICE</span>{service?.name || "Not selected"}</div><div className="summary-row"><span>ADD-ONS</span>{draft.addonIds.length || "None selected"}</div><div className="summary-row"><span>BUDGET</span>{draft.budgetBand.replaceAll("-", " ")}</div><div className="summary-row"><span>COMMERCIAL STATUS</span><strong className="gold">QUOTE REQUIRED</strong></div><p className="muted" style={{ fontSize: ".78rem", lineHeight: 1.5 }}>Draft data remains in this browser tab until submission. Submission requires the configured secure server intake.</p></aside>
      </div>
    </div>
  );
}
