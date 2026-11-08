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

  async function handleStateTransition(nextState: OrderState) {
    setLoading(true);
    setError(null);
    try {
      const res = await updateOrderStateAction({ orderId, nextState });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
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
              onClick={() => handleStateTransition("confirmed")}
              disabled={loading}
              className="btn btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirm Payment & Order
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
    </div>
  );
}
