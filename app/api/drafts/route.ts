import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { intakeConfigured } from "@/lib/supabase/config";
import { getServiceRoleClient } from "@/lib/supabase/service";

const MAX_DRAFT_BYTES = 65_536;

export async function POST(req: NextRequest) {
  if (!intakeConfigured()) {
    return NextResponse.json({ error: "Database service unconfigured" }, { status: 503 });
  }

  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid configuration draft payload" }, { status: 400 });
    }

    if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_DRAFT_BYTES) {
      return NextResponse.json({ error: "Configuration draft payload exceeds maximum allowed size" }, { status: 413 });
    }

    const supabase = getServiceRoleClient();

    // Generate secure opaque token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const { data: draft, error } = await supabase
      .from("configuration_drafts")
      .insert({
        opaque_token_hash: tokenHash,
        payload,
        expires_at: expiresAt
      })
      .select("id")
      .single();

    if (error || !draft) {
      return NextResponse.json({ error: error?.message ?? "Failed to save draft" }, { status: 500 });
    }

    return NextResponse.json({
      draftId: draft.id,
      draftToken: token,
      expiresAt
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token || token.length < 32 || token.length > 256) {
    return NextResponse.json({ error: "Valid draft token required" }, { status: 400 });
  }

  if (!intakeConfigured()) {
    return NextResponse.json({ error: "Database service unconfigured" }, { status: 503 });
  }

  try {
    const supabase = getServiceRoleClient();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date().toISOString();

    const { data: draft, error } = await supabase
      .from("configuration_drafts")
      .select("id, payload, expires_at, created_at, owner_id")
      .eq("opaque_token_hash", tokenHash)
      .gt("expires_at", now)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!draft) {
      return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
    }

    return NextResponse.json({
      draftId: draft.id,
      payload: draft.payload,
      expiresAt: draft.expires_at,
      claimed: Boolean(draft.owner_id)
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error loading draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
