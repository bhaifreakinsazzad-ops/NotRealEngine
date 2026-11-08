"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { type QuoteState } from "@/lib/domain/states";
import { publishQuoteAction, updateQuoteStatusAction } from "@/app/admin/quotes/actions";

export function AdminQuoteActions({
  quoteId,
  state
}: {
  quoteId: string;
  state: QuoteState;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    setLoading(true);
    setError(null);
    try {
      const res = await publishQuoteAction(quoteId);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransition(nextState: QuoteState) {
    setLoading(true);
    setError(null);
    try {
      const res = await updateQuoteStatusAction(quoteId, nextState);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update state.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "0.8rem" }}>
      {error && <div className="error-box" style={{ fontSize: "0.82rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        {state === "draft" && (
          <button
            type="button"
            onClick={() => handleTransition("under_review")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Submit for Review
          </button>
        )}

        {state === "under_review" && (
          <>
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Publish & Send to Client
            </button>

            <button
              type="button"
              onClick={() => handleTransition("draft")}
              disabled={loading}
              className="btn btn-quiet"
              style={{ fontSize: "0.85rem" }}
            >
              <RotateCcw size={16} /> Return to Draft
            </button>
          </>
        )}

        {state === "sent" && (
          <button
            type="button"
            onClick={() => handleTransition("superseded")}
            disabled={loading}
            className="btn"
            style={{ borderColor: "var(--line-strong)", fontSize: "0.85rem" }}
          >
            <AlertTriangle size={16} style={{ color: "var(--gold)" }} /> Mark Superseded
          </button>
        )}

        <a
          href={`/quotes/${quoteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-quiet"
          style={{ fontSize: "0.85rem" }}
        >
          <ExternalLink size={14} /> Open Customer View
        </a>
      </div>
    </div>
  );
}
