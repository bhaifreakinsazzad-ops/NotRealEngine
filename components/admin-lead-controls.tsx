"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { updateLeadStatusAction } from "@/app/admin/actions";

type LeadStatus = "new" | "reviewing" | "qualified" | "unqualified" | "converted" | "closed";

export function AdminLeadControls({
  leadId,
  currentStatus,
  briefId,
  organizationId
}: {
  leadId: string;
  currentStatus: string;
  briefId: string;
  organizationId?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(status: LeadStatus) {
    setLoading(true);
    try {
      await updateLeadStatusAction({ leadId, status });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
      <select
        className="select"
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
        disabled={loading}
        style={{ minHeight: "32px", padding: "0.2rem 0.5rem", fontSize: "0.78rem" }}
      >
        <option value="new">New</option>
        <option value="reviewing">Reviewing</option>
        <option value="qualified">Qualified</option>
        <option value="unqualified">Unqualified</option>
        <option value="converted">Converted</option>
        <option value="closed">Closed</option>
      </select>

      <Link
        href={`/admin/quotes/new?briefId=${briefId}${organizationId ? `&org=${organizationId}` : ""}`}
        className="btn btn-quiet"
        style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", minHeight: "32px" }}
        title="Create Quote from Brief"
      >
        <FileText size={13} className="cyan" /> Quote
      </Link>
    </div>
  );
}
