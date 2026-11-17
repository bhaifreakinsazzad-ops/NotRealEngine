"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { BookmarkCheck, Loader2, Save } from "lucide-react";
import { updateProfileAction } from "@/app/dashboard/actions";

const DRAFT_STORAGE_KEY = "engine_os_draft_token";
const emptySubscribe = () => () => {};
const getClientDraftToken = () =>
  typeof window !== "undefined" ? window.sessionStorage.getItem(DRAFT_STORAGE_KEY) || "" : "";
const getServerDraftToken = () => "";

export function AccountSettingsForm({
  initialFullName,
  initialPhone,
  primaryOrganizationId
}: {
  initialFullName: string;
  initialPhone: string;
  primaryOrganizationId: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const savedTabToken = useSyncExternalStore(
    emptySubscribe,
    getClientDraftToken,
    getServerDraftToken
  );
  const [draftToken, setDraftToken] = useState("");
  const effectiveDraftToken = draftToken || savedTabToken;
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const res = await updateProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() || null
      });

      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }

      setSuccess("Profile settings updated.");
      setSaving(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
      setSaving(false);
    }
  }

  async function handleClaimDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveDraftToken.trim()) return;
    setClaimError(null);
    setClaimMessage(null);
    setClaiming(true);

    try {
      const res = await fetch("/api/drafts/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: effectiveDraftToken.trim(),
          organizationId: primaryOrganizationId
        })
      });
      const data = (await res.json()) as { claimed?: boolean; draftId?: string; error?: string };
      if (!res.ok || !data.claimed) {
        setClaimError(data.error || "Unable to claim draft token.");
        setClaiming(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
      setClaimMessage(`Configuration draft ${data.draftId?.slice(0, 8)} linked to your account.`);
      setDraftToken("");
      setClaiming(false);
      router.refresh();
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : "Unable to claim draft token.");
      setClaiming(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <form onSubmit={handleSaveProfile} style={{ display: "grid", gap: "1rem" }}>
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="profile-full-name">Full Name *</label>
            <input
              id="profile-full-name"
              type="text"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              required
              minLength={2}
            />
          </div>

          <div className="field">
            <label htmlFor="profile-phone">Contact Phone</label>
            <input
              id="profile-phone"
              type="tel"
              className="input"
              placeholder="+880..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Profile Details
              </>
            )}
          </button>
        </div>
      </form>

      <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem" }}>Claim Pre-Registration Project Draft</h3>
        <p className="muted" style={{ margin: "0 0 1rem", fontSize: "0.84rem" }}>
          If you saved a configuration draft before signing in, paste its opaque draft token below to bind it to your verified account.
        </p>

        {claimError && <div className="error-box">{claimError}</div>}
        {claimMessage && <div className="success-box">{claimMessage}</div>}

        <form onSubmit={handleClaimDraft} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input mono"
            placeholder="Paste 64-char opaque draft token..."
            value={effectiveDraftToken}
            onChange={(e) => setDraftToken(e.target.value)}
            disabled={claiming}
            style={{ flex: "1 1 280px" }}
          />
          <button type="submit" disabled={claiming || !effectiveDraftToken.trim()} className="btn">
            {claiming ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Claiming...
              </>
            ) : (
              <>
                <BookmarkCheck size={16} /> Claim Draft
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
