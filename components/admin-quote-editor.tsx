"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Send, Save } from "lucide-react";
import { createQuoteAction } from "@/app/admin/quotes/actions";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

interface BriefOption {
  id: string;
  reference: string;
  contactName: string;
  organizationName: string | null;
  serviceId: string;
  payload: Record<string, unknown>;
}

interface LineItemForm {
  id: string;
  label: string;
  description: string;
  quantity: number;
  unitAmountMajor: number; // in major units (e.g. 25000), converted to minor on submit
  recurringInterval?: "week" | "month" | "year" | null;
}

export function AdminQuoteEditor({
  organizations,
  briefs
}: {
  organizations: OrgOption[];
  briefs: BriefOption[];
}) {
  const router = useRouter();

  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || "");
  const [selectedBriefId, setSelectedBriefId] = useState<string>("");
  const [currency, setCurrency] = useState<"BDT" | "USD">("BDT");
  const [revisionLimit, setRevisionLimit] = useState<number>(2);
  const [validityDays, setValidityDays] = useState<number>(14);
  const [termsVersion, setTermsVersion] = useState<string>("ENGINE//OS-TERMS-V1.0");

  const [summary, setSummary] = useState<string>(
    "Complete end-to-end design, engineering, and deployment according to technical specifications."
  );
  const [deliverables, setDeliverables] = useState<string[]>([
    "Fully-engineered application architecture and responsive UI",
    "PostgreSQL database schema with Row Level Security (RLS)",
    "Secure client workspace & authentication integration"
  ]);
  const [exclusions, setExclusions] = useState<string[]>([
    "Third-party API / SMS usage fees billed directly by providers",
    "Scope modifications outside approved deliverables register"
  ]);
  const [milestones, setMilestones] = useState<string[]>([
    "Architecture Blueprint & Scope Approval",
    "Core Development & Integration",
    "Internal QA & Security Hardening",
    "Client UAT & Production Handover"
  ]);

  const [items, setItems] = useState<LineItemForm[]>([
    {
      id: "1",
      label: "Core Architecture & Backend Systems",
      description: "Database models, SSR auth, and operational business workflows",
      quantity: 1,
      unitAmountMajor: 150000,
      recurringInterval: null
    },
    {
      id: "2",
      label: "Client Workspace & Portal Development",
      description: "Interactive dashboard, requirements management, and file workspace",
      quantity: 1,
      unitAmountMajor: 100000,
      recurringInterval: null
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate when brief is selected
  function handleBriefChange(briefId: string) {
    setSelectedBriefId(briefId);
    if (!briefId) return;
    const brief = briefs.find((b) => b.id === briefId);
    if (!brief) return;

    if (brief.payload?.problem && typeof brief.payload.problem === "string") {
      setSummary(`Engineering solution for: ${brief.payload.problem.slice(0, 200)}...`);
    }
  }

  // Line item helpers
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        label: "",
        description: "",
        quantity: 1,
        unitAmountMajor: 10000,
        recurringInterval: null
      }
    ]);
  }

  function removeItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id: string, updates: Partial<LineItemForm>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  // Scope helpers
  function addListItem(list: string[], setList: (l: string[]) => void, defaultVal: string) {
    setList([...list, defaultVal]);
  }

  function updateListItem(list: string[], setList: (l: string[]) => void, index: number, val: string) {
    const next = [...list];
    next[index] = val;
    setList(next);
  }

  function removeListItem(list: string[], setList: (l: string[]) => void, index: number) {
    if (list.length <= 1) return;
    setList(list.filter((_, idx) => idx !== index));
  }

  // Calculate total
  const totalMajor = items.reduce((acc, item) => acc + item.quantity * item.unitAmountMajor, 0);

  async function handleSubmit(initialState: "draft" | "under_review" | "sent") {
    if (!selectedOrgId) {
      setError("Please select or assign an organization.");
      return;
    }
    if (items.some((i) => !i.label.trim())) {
      setError("All line items must have a descriptive label.");
      return;
    }
    if (deliverables.some((d) => !d.trim())) {
      setError("Deliverables cannot contain empty rows.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const payload = {
        organizationId: selectedOrgId,
        projectBriefId: selectedBriefId || null,
        currency,
        revisionLimit,
        validityDays,
        termsVersion,
        scope: {
          summary,
          deliverables: deliverables.filter((d) => d.trim()),
          exclusions: exclusions.filter((e) => e.trim()),
          milestones: milestones.filter((m) => m.trim())
        },
        items: items.map((i, idx) => ({
          label: i.label,
          description: i.description || null,
          quantity: i.quantity,
          unitAmountMinor: Math.round(i.unitAmountMajor * 100),
          recurringInterval: i.recurringInterval || null,
          displayOrder: idx + 1
        })),
        initialState
      };

      const res = await createQuoteAction(payload);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.push(`/admin/quotes/${res.quoteId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create quote.");
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "1050px" }}>
      {error && <div className="error-box" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "start" }}>
        {/* Main Form */}
        <div style={{ display: "grid", gap: "1.5rem" }}>
          {/* Organization & Lead Assignment */}
          <div className="panel">
            <div className="panel-head">
              <h2>1. Account & Lead Linkage</h2>
            </div>
            <div className="panel-body form-grid">
              <div className="field">
                <label>Target Organization *</label>
                <select
                  className="select"
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  disabled={loading}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Inbound Project Brief (Optional)</label>
                <select
                  className="select"
                  value={selectedBriefId}
                  onChange={(e) => handleBriefChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">No linked brief</option>
                  {briefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference} — {b.contactName} ({b.serviceId})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scope of Work */}
          <div className="panel">
            <div className="panel-head">
              <h2>2. Scope & Specifications</h2>
            </div>
            <div className="panel-body">
              <div className="field full">
                <label>Executive Scope Summary *</label>
                <textarea
                  className="textarea"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={loading}
                  style={{ minHeight: "80px" }}
                />
              </div>

              {/* Deliverables */}
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--cyan)" }}>
                    Committed Deliverables *
                  </label>
                  <button
                    type="button"
                    onClick={() => addListItem(deliverables, setDeliverables, "New deliverable item")}
                    className="btn btn-quiet"
                    style={{ fontSize: "0.78rem", padding: "0.2rem 0.5rem", minHeight: "28px" }}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
                {deliverables.map((d, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      className="input"
                      value={d}
                      onChange={(e) => updateListItem(deliverables, setDeliverables, idx, e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem(deliverables, setDeliverables, idx)}
                      className="btn btn-quiet"
                      style={{ padding: "0.5rem" }}
                      title="Remove"
                    >
                      <Trash2 size={16} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Exclusions */}
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--gold)" }}>
                    Scope Boundaries & Exclusions
                  </label>
                  <button
                    type="button"
                    onClick={() => addListItem(exclusions, setExclusions, "Excluded scope item")}
                    className="btn btn-quiet"
                    style={{ fontSize: "0.78rem", padding: "0.2rem 0.5rem", minHeight: "28px" }}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
                {exclusions.map((e, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      className="input"
                      value={e}
                      onChange={(e) => updateListItem(exclusions, setExclusions, idx, e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem(exclusions, setExclusions, idx)}
                      className="btn btn-quiet"
                      style={{ padding: "0.5rem" }}
                      title="Remove"
                    >
                      <Trash2 size={16} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Milestones */}
              <div style={{ marginTop: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--silver)" }}>
                    Execution Milestones
                  </label>
                  <button
                    type="button"
                    onClick={() => addListItem(milestones, setMilestones, "New execution milestone")}
                    className="btn btn-quiet"
                    style={{ fontSize: "0.78rem", padding: "0.2rem 0.5rem", minHeight: "28px" }}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
                {milestones.map((m, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <input
                      type="text"
                      className="input"
                      value={m}
                      onChange={(e) => updateListItem(milestones, setMilestones, idx, e.target.value)}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem(milestones, setMilestones, idx)}
                      className="btn btn-quiet"
                      style={{ padding: "0.5rem" }}
                      title="Remove"
                    >
                      <Trash2 size={16} style={{ color: "var(--danger)" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="panel">
            <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>3. Line Items & Pricing</h2>
              <button
                type="button"
                onClick={addItem}
                className="btn btn-quiet"
                style={{ fontSize: "0.82rem", gap: "0.3rem" }}
              >
                <Plus size={16} /> Add Line Item
              </button>
            </div>
            <div className="panel-body">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--line)",
                    padding: "1rem",
                    marginBottom: "1rem",
                    background: "var(--bg-deep)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span className="mono cyan" style={{ fontSize: "0.78rem", fontWeight: 700 }}>
                      ITEM #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="btn btn-quiet"
                        style={{ padding: "0.2rem 0.4rem", minHeight: "24px" }}
                      >
                        <Trash2 size={14} style={{ color: "var(--danger)" }} />
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="field full">
                      <label>Item Name / Service Module *</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Single Page Website Development"
                        value={item.label}
                        onChange={(e) => updateItem(item.id, { label: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="field full">
                      <label>Description / Technical Notes</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Up to 5 sections, responsive layouts, Tailwind styling"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        disabled={loading}
                      />
                    </div>

                    <div className="field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="input mono"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        disabled={loading}
                      />
                    </div>

                    <div className="field">
                      <label>Unit Amount ({currency}) *</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input mono"
                        value={item.unitAmountMajor}
                        onChange={(e) => updateItem(item.id, { unitAmountMajor: Math.max(0, parseInt(e.target.value) || 0) })}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
                    <span className="mono muted" style={{ fontSize: "0.8rem" }}>
                      Line Total: {currency} {(item.quantity * item.unitAmountMajor).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ position: "sticky", top: "96px", display: "grid", gap: "1.2rem" }}>
          {/* Summary Box */}
          <div className="panel" style={{ borderColor: "var(--cyan)" }}>
            <div className="panel-head">
              <h2>Commercial Totals</h2>
            </div>
            <div className="panel-body">
              <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
                TOTAL AMOUNT
              </span>
              <strong style={{ fontSize: "2rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                {currency} {totalMajor.toLocaleString()}
              </strong>

              <div style={{ marginTop: "1rem", borderTop: "1px solid var(--line)", paddingTop: "1rem", display: "grid", gap: "0.75rem" }}>
                <div className="field">
                  <label>Currency</label>
                  <select
                    className="select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "BDT" | "USD")}
                    disabled={loading}
                  >
                    <option value="BDT">BDT (Bangladeshi Taka)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Validity Period</label>
                  <select
                    className="select"
                    value={validityDays}
                    onChange={(e) => setValidityDays(parseInt(e.target.value))}
                    disabled={loading}
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days (Standard)</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                  </select>
                </div>

                <div className="field">
                  <label>Included Revision Rounds</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="input mono"
                    value={revisionLimit}
                    onChange={(e) => setRevisionLimit(parseInt(e.target.value) || 0)}
                    disabled={loading}
                  />
                </div>

                <div className="field">
                  <label>Terms Document Version</label>
                  <select
                    className="select mono"
                    value={termsVersion}
                    onChange={(e) => setTermsVersion(e.target.value)}
                    disabled={loading}
                  >
                    <option value="ENGINE//OS-TERMS-V1.0">
                      ENGINE//OS-TERMS-V1.0 (Draft — Acceptance Held)
                    </option>
                    <option value="STANDARD-V1.0">
                      STANDARD-V1.0 (Draft — Acceptance Held)
                    </option>
                    <option value="STAGING-TEST-TERMS-V1.0">
                      STAGING-TEST-TERMS-V1.0 (Staging Synthetic — Non-Binding)
                    </option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div style={{ marginTop: "1.5rem", display: "grid", gap: "0.6rem" }}>
                <button
                  type="button"
                  onClick={() => handleSubmit("sent")}
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Send size={16} /> Publish & Send to Client
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit("under_review")}
                  disabled={loading}
                  className="btn"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <CheckCircle2 size={16} /> Submit for Internal Review
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit("draft")}
                  disabled={loading}
                  className="btn btn-quiet"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <Save size={16} /> Save Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
