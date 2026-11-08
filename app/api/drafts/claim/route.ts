import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { token, organizationId } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Draft token is required" }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Authentication required to claim draft" }, { status: 401 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date().toISOString();

    // Check draft
    const { data: draft, error: draftErr } = await supabase
      .from("configuration_drafts")
      .select("id, owner_id, expires_at")
      .eq("opaque_token_hash", tokenHash)
      .gt("expires_at", now)
      .single();

    if (draftErr || !draft) {
      return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
    }

    if (draft.owner_id && draft.owner_id !== user.id) {
      return NextResponse.json({ error: "This draft has already been claimed by another account" }, { status: 403 });
    }

    // Update draft with owner and organization
    const { error: updErr } = await supabase
      .from("configuration_drafts")
      .update({
        owner_id: user.id,
        organization_id: organizationId || null,
        updated_at: now
      })
      .eq("id", draft.id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      claimed: true,
      draftId: draft.id
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error claiming draft";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
