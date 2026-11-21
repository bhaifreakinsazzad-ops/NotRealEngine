"use client";

import { useState } from "react";
import { updateSupportTicketStateAction } from "@/app/admin/actions";

const STATES = ["open", "waiting_staff", "waiting_client", "resolved", "closed"] as const;

export function AdminSupportControls({
  ticketId,
  currentState,
}: {
  ticketId: string;
  currentState: string;
}) {
  const [state, setState] = useState(currentState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onChange(nextState: string) {
    setSaving(true);
    setError("");
    const res = await updateSupportTicketStateAction({ ticketId, state: nextState });
    if (res.ok) {
      setState(nextState);
    } else {
      setError(res.error);
    }
    setSaving(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
      <select
        aria-label="Update ticket status"
        className="select"
        style={{ minHeight: 36, padding: ".35rem .65rem", width: "auto", fontSize: ".78rem" }}
        value={state}
        disabled={saving}
        onChange={(e) => onChange(e.target.value)}
      >
        {STATES.map((s) => (
          <option key={s} value={s}>
            {s.replace("_", " ").toUpperCase()}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ color: "var(--danger)", fontSize: ".76rem" }} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
