"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Play, Pause, XCircle, FolderPlus, Loader2, ArrowRight } from "lucide-react";
import { type OrderState } from "@/lib/domain/states";
import { initializeProjectFromOrderAction, updateOrderStateAction } from "@/app/admin/orders/actions";

export function AdminOrderControls({
  orderId,
  state,
  hasProject
}: {
  orderId: string;
  state: OrderState;
  hasProject: boolean;
  projectId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualSettlementForm, setShowManualSettlementForm] = useState(false);
  const [settlementRef, setSettlementRef] = useState("");
  const [settlementMethod, setSettlementMethod] = useState<"bank_transfer" | "corporate_po" | "staging_test_clearance">("bank_transfer");
  const [settlementNote, setSettlementNote] = useState("");

  async function handleStateTransition(
    nextState: OrderState,
    manualSettlement?: {
      reference: string;
      method: "bank_transfer" | "corporate_po" | "staging_test_clearance";
      note?: string;
    }
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await updateOrderStateAction({ orderId, nextState, manualSettlement });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setShowManualSettlementForm(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update order state.");
    } finally {
      setLoading(false);
    }
  }

  async function handleInitializeProject() {
    setLoading(true);
    setError(null);
    try {
      const res = await initializeProjectFromOrderAction(orderId);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.push(`/admin/projects`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize project.");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {error && <div className="error-box" style={{ fontSize: "0.82rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
        {state === "awaiting_payment" && (
          <>
            <button
              type="button"
              onClick={() => setShowManualSettlementForm((prev) => !prev)}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Record Manual Settlement & Confirm
            </button>

            <button
              type="button"
              onClick={() => handleStateTransition("cancelled")}
              disabled={loading}
              className="btn"
              style={{ borderColor: "var(--danger)", color: "var(--danger)", fontSize: "0.85rem" }}
            >
              <XCircle size={16} /> Cancel Order
            </button>
          </>
        )}

        {state === "confirmed" && (
          <>
            {!hasProject ? (
              <button
                type="button"
                onClick={handleInitializeProject}
                disabled={loading}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem" }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <FolderPlus size={16} />}
                Initialize Project Workspace
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push(`/admin/projects`)}
                className="btn btn-primary"
                style={{ fontSize: "0.85rem" }}
              >
                Go to Project Workspace <ArrowRight size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleStateTransition("in_production")}
              disabled={loading}
              className="btn"
              style={{ fontSize: "0.85rem" }}
            >
              <Play size={16} className="cyan" /> Move to In Production
            </button>

            <button
              type="button"
              onClick={() => handleStateTransition("on_hold")}
              disabled={loading}
              className="btn btn-quiet"
              style={{ fontSize: "0.85rem" }}
            >
              <Pause size={16} /> Put On Hold
            </button>
          </>
        )}

        {state === "in_production" && (
          <>
            <button
              type="button"
              onClick={() => handleStateTransition("completed")}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Complete Order
            </button>

            <button
              type="button"
              onClick={() => handleStateTransition("on_hold")}
              disabled={loading}
              className="btn btn-quiet"
              style={{ fontSize: "0.85rem" }}
            >
              <Pause size={16} /> Put On Hold
            </button>
          </>
        )}

        {state === "on_hold" && (
          <button
            type="button"
            onClick={() => handleStateTransition("confirmed")}
            disabled={loading}
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <Play size={16} /> Resume Order (Confirmed)
          </button>
        )}
      </div>

      {state === "awaiting_payment" && showManualSettlementForm && (
        <div
          style={{
            border: "1px solid var(--cyan)",
            background: "var(--bg-deep)",
            padding: "1rem",
            display: "grid",
            gap: "0.75rem",
            maxWidth: "520px"
          }}
        >
          <span className="mono cyan" style={{ fontSize: "0.76rem", fontWeight: 800 }}>
            AUDITED MANUAL SETTLEMENT RECORD
          </span>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            Orders cannot transition to <code>confirmed</code> without either a verified payment gateway transaction or an explicit audited settlement record.
          </p>
          <div className="field">
            <label>Settlement Reference (Bank Wire / PO / Test ID) *</label>
            <input
              type="text"
              className="input mono"
              placeholder="e.g. WIRE-BDT-20261108-001"
              value={settlementRef}
              onChange={(e) => setSettlementRef(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="field">
            <label>Settlement Method *</label>
            <select
              className="select"
              value={settlementMethod}
              onChange={(e) =>
                setSettlementMethod(
                  e.target.value as "bank_transfer" | "corporate_po" | "staging_test_clearance"
                )
              }
              disabled={loading}
            >
              <option value="bank_transfer">Bank Wire / RTGS / EFT</option>
              <option value="corporate_po">Approved Corporate PO / Invoice</option>
              <option value="staging_test_clearance">Staging Synthetic Verification Clearance</option>
            </select>
          </div>
          <div className="field">
            <label>Audit Note</label>
            <input
              type="text"
              className="input"
              placeholder="Optional verification note"
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              disabled={loading}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() =>
                handleStateTransition("confirmed", {
                  reference: settlementRef,
                  method: settlementMethod,
                  note: settlementNote || undefined
                })
              }
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: "0.82rem" }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Verify & Confirm Order
            </button>
            <button
              type="button"
              onClick={() => setShowManualSettlementForm(false)}
              disabled={loading}
              className="btn btn-quiet"
              style={{ fontSize: "0.82rem" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
