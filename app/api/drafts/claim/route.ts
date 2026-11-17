import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { intakeConfigured } from "@/lib/supabase/config";
import { getServiceRoleClient } from "@/lib/supabase/service";

const claimSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/i, "A valid 64-character draft token is required"),
  organizationId: z.string().uuid("Invalid organization ID").optional().nullable()
});

export async function POST(req: NextRequest) {
  if (!intakeConfigured()) {
    return NextResponse.json({ error: "Database service unconfigured" }, { status: 503 });
  }

  try {
    const raw = await req.json().catch(() => null);
    const parsed = claimSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid claim payload" },
        { status: 400 }
      );
    }

    const { token, organizationId } = parsed.data;

    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userErr
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Authentication required to claim draft" }, { status: 401 });
    }

    // Verify organization membership before associating an unclaimed draft with an organization
    if (organizationId) {
      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_staff")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.is_staff) {
          return NextResponse.json(
            { error: "You are not authorized to associate drafts with this organization" },
            { status: 403 }
          );
        }
      }
    }

    // Use service role client to look up unclaimed (owner_id IS NULL) draft securely
    // after authenticating the user and verifying organization authorization above.
    const adminSupabase = getServiceRoleClient();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date().toISOString();

    const { data: draft, error: draftErr } = await adminSupabase
      .from("configuration_drafts")
      .select("id, owner_id, expires_at")
      .eq("opaque_token_hash", tokenHash)
      .gt("expires_at", now)
      .maybeSingle();

    if (draftErr) {
      return NextResponse.json({ error: draftErr.message }, { status: 500 });
    }

    if (!draft) {
      return NextResponse.json({ error: "Draft not found or expired" }, { status: 404 });
    }

    if (draft.owner_id && draft.owner_id !== user.id) {
      return NextResponse.json({ error: "This draft has already been claimed by another account" }, { status: 403 });
    }

    const { data: updated, error: updErr } = await adminSupabase
      .from("configuration_drafts")
      .update({
        owner_id: user.id,
        organization_id: organizationId || null,
        updated_at: now
      })
      .eq("id", draft.id)
      .or(`owner_id.is.null,owner_id.eq.${user.id}`)
      .select("id")
      .maybeSingle();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "This draft has already been claimed by another account" }, { status: 409 });
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
