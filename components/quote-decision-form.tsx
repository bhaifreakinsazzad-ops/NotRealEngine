"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldCheck, Loader2 } from "lucide-react";
import { type QuoteState } from "@/lib/domain/states";
import { decideQuoteAction } from "@/app/quotes/actions";

interface QuoteDecisionFormProps {
  quoteId: string;
  state: QuoteState;
  validUntil: string | null;
  orderId?: string | null;
  termsVersion?: string | null;
}

export function QuoteDecisionForm({
  quoteId,
  state,
  validUntil,
  orderId,
  termsVersion
}: QuoteDecisionFormProps) {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isExpired = Boolean(validUntil && new Date(validUntil) <= new Date());
  const canDecide = state === "sent" && !isExpired;

  async function handleAccept() {
    if (!termsAccepted) {
      setError("Please check the box confirming you agree to the project scope and terms.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await decideQuoteAction({
        quoteId,
        decision: "accepted",
        termsAccepted: true
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setSuccess("Quotation accepted successfully! Redirecting to your confirmed order...");
      if (res.orderId) {
        router.push(`/orders/${res.orderId}?accepted=1`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process acceptance.");
      setLoading(false);
    }
  }

  async function handleReject() {
    setError(null);
    setLoading(true);
    try {
      const res = await decideQuoteAction({
        quoteId,
        decision: "rejected",
        reason: rejectReason
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setSuccess("Quotation has been declined. Our team has been notified.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to decline quote.");
      setLoading(false);
    }
  }

  if (state === "accepted") {
    return (
      <div className="panel" style={{ marginTop: "2rem", borderColor: "var(--success)" }}>
        <div className="panel-body" style={{ background: "rgba(85,216,155,0.04)" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <CheckCircle2 size={32} style={{ color: "var(--success)", flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "var(--success)" }}>
                Quotation Accepted & Confirmed
              </h3>
              <p style={{ margin: "0 0 1rem", color: "var(--silver)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                An immutable accepted commercial snapshot has been archived. An official order has been created in your account.
              </p>
              {orderId && (
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${orderId}`)}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  View Order #{orderId.slice(0, 8)} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="panel" style={{ marginTop: "2rem", borderColor: "var(--line-strong)" }}>
        <div className="panel-body">
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <XCircle size={32} style={{ color: "var(--danger)", flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "var(--danger)" }}>
                Quotation Declined
              </h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>
                This quotation was formally declined and is no longer orderable. You may submit a new project brief if requirements have changed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "expired" || isExpired) {
    return (
      <div className="panel" style={{ marginTop: "2rem", borderColor: "var(--gold)" }}>
        <div className="panel-body">
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <AlertTriangle size={32} style={{ color: "var(--gold)", flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "var(--gold)" }}>
                Quotation Expired
              </h3>
              <p style={{ margin: 0, color: "var(--silver)", fontSize: "0.92rem" }}>
                This quotation expired on {validUntil ? new Date(validUntil).toLocaleDateString() : "the scheduled date"}. Please contact your account representative to request a scope refresh.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === "superseded") {
    return (
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-body">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            This quotation has been superseded by an updated version. Please review the newest quotation in your client workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!canDecide) {
    return (
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-body">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            This quotation is currently {state.replace("_", " ")} and is not yet available for customer sign-off.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ marginTop: "2.5rem", borderColor: "var(--cyan)" }}>
      <div className="panel-head" style={{ background: "rgba(32, 230, 238, 0.05)" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={20} className="cyan" />
          Quotation Acceptance & Sign-off
        </h2>
        {validUntil && (
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Valid Until: {new Date(validUntil).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="panel-body">
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div
          style={{
            border: "1px solid var(--gold)",
            background: "var(--gold-dim)",
            padding: "0.75rem 1rem",
            marginBottom: "1.2rem",
            fontSize: "0.82rem",
            color: "var(--silver)",
            lineHeight: 1.5
          }}
        >
          <strong className="gold">Commercial Governance Notice:</strong> Public legal policy pages remain in pre-release draft review. Quotation sign-off binds this specific immutable scope snapshot ({termsVersion || "ENGINE//OS-TERMS-V1.0"}) and requires an authorized organization owner or administrator.
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ marginTop: "0.25rem", accentColor: "var(--cyan)", width: "18px", height: "18px" }}
              disabled={loading}
            />
            <span style={{ fontSize: "0.92rem", color: "var(--silver)", lineHeight: 1.5 }}>
              I confirm that I have reviewed the deliverables, line items, exclusions, milestone schedule, and accept the commercial terms ({termsVersion || "ENGINE//OS-TERMS-V1.0"}). I authorize creation of an official binding order upon acceptance.
            </span>
          </label>
        </div>

        {!showRejectForm ? (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !termsAccepted}
              className="btn btn-primary"
              style={{ minWidth: "220px" }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Accept Quotation & Order
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="btn"
              style={{ color: "var(--muted)", borderColor: "var(--line)" }}
            >
              Decline Quotation...
            </button>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1.5rem", marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem", color: "var(--danger)", fontSize: "1rem" }}>
              Decline Quotation
            </h4>
            <p style={{ margin: "0 0 1rem", color: "var(--muted)", fontSize: "0.85rem" }}>
              Please provide feedback or the reason for declining so we can revise our proposal:
            </p>
            <div className="field">
              <textarea
                className="textarea"
                placeholder="Reason or revision notes (e.g., budget adjustment, timeline change)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={loading}
                style={{ minHeight: "90px" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="btn"
                style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              >
                {loading ? "Processing..." : "Confirm Decline"}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
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
