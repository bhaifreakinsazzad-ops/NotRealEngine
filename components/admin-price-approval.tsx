"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { approvePriceVersionAction } from "@/app/admin/actions";

export function AdminPriceApproval({
  priceVersionId,
  status
}: {
  priceVersionId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await approvePriceVersionAction(priceVersionId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (status === "approved") {
    return (
      <span className="mono" style={{ fontSize: "0.76rem", color: "var(--success)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
        <CheckCircle2 size={13} /> Approved
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={loading}
      className="btn btn-primary"
      style={{ fontSize: "0.76rem", padding: "0.25rem 0.6rem", minHeight: "28px" }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
      Approve Price
    </button>
  );
}
