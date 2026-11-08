"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, Save } from "lucide-react";
import { submitRequirementAction } from "@/app/dashboard/actions";

interface RequirementItem {
  id: string;
  key: string;
  label: string;
  required: boolean;
  response: Record<string, unknown> | null;
  submitted_at: string | null;
}

export function RequirementsForm({
  projectId,
  requirements
}: {
  projectId: string;
  requirements: RequirementItem[];
}) {
  const router = useRouter();

  // Map key -> text value
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const r of requirements) {
      if (r.response && typeof r.response.value === "string") {
        initial[r.key] = r.response.value;
      } else {
        initial[r.key] = "";
      }
    }
    return initial;
  });

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  async function handleSave(key: string) {
    const val = formValues[key]?.trim();
    if (!val) {
      setError(`Please provide details for "${key}".`);
      return;
    }

    setError(null);
    setSavingKey(key);
    setSuccessKey(null);

    try {
      const res = await submitRequirementAction({
        projectId,
        key,
        response: { value: val, submittedAt: new Date().toISOString() }
      });

      if (!res.ok) {
        setError(res.error);
        setSavingKey(null);
        return;
      }

      setSuccessKey(key);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save requirement.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {error && <div className="error-box">{error}</div>}

      {requirements.map((req, idx) => {
        const isSubmitted = Boolean(req.response);
        const isSaving = savingKey === req.key;
        const isSuccess = successKey === req.key;

        return (
          <div
            key={req.id}
            style={{
              border: "1px solid",
              borderColor: isSubmitted ? "var(--cyan)" : "var(--line)",
              background: "var(--bg-deep)",
              padding: "1.4rem",
              borderRadius: "2px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <strong style={{ fontSize: "1rem", color: "var(--text)", display: "block" }}>
                  {idx + 1}. {req.label} {req.required && <span className="cyan">*</span>}
                </strong>
                <span className="mono muted" style={{ fontSize: "0.76rem" }}>
                  KEY: {req.key} · {req.required ? "Mandatory for production kickoff" : "Optional"}
                </span>
              </div>

              {isSubmitted ? (
                <span className="mono" style={{ fontSize: "0.76rem", color: "var(--success)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <CheckCircle2 size={14} /> Submitted {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : ""}
                </span>
              ) : (
                <span className="mono" style={{ fontSize: "0.76rem", color: "var(--gold)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                  <Clock size={14} /> Pending Submission
                </span>
              )}
            </div>

            <div className="field">
              <textarea
                className="textarea"
                placeholder="Provide link (e.g. Google Drive, Figma, OneDrive, GitHub) or paste specifications here..."
                value={formValues[req.key] || ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, [req.key]: e.target.value }))}
                disabled={isSaving}
                style={{ minHeight: "85px" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.8rem" }}>
              <span className="mono muted" style={{ fontSize: "0.76rem" }}>
                {isSuccess && <span style={{ color: "var(--success)" }}>Saved successfully!</span>}
              </span>

              <button
                type="button"
                onClick={() => handleSave(req.key)}
                disabled={isSaving}
                className="btn btn-primary"
                style={{ fontSize: "0.82rem", minHeight: "36px", padding: "0.4rem 0.9rem" }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} /> {isSubmitted ? "Update Response" : "Submit Requirement"}
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
