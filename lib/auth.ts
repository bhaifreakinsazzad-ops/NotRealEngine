import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeAuthRedirect } from "@/lib/auth-redirect";

/**
 * Ensures an authenticated user always has a persisted `public.profiles` row and
 * at least one client workspace organization membership, even if the `auth.users`
 * trigger was skipped in a restricted database role.
 *
 * Uses `auth.uid()` strictly on the database side; never elevates staff roles.
 */
export async function ensureUserAccountProvisioned(
  supabase: SupabaseClient,
  user: User,
  overrides?: { fullName?: string; organizationName?: string },
): Promise<void> {
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string;
    organization_name?: string;
  };
  const fullName = overrides?.fullName?.trim() || meta.full_name?.trim() || null;
  const orgName = overrides?.organizationName?.trim() || meta.organization_name?.trim() || null;

  const { error: rpcErr } = await supabase.rpc("ensure_client_account_bootstrap", {
    p_full_name: fullName,
    p_org_name: orgName,
  });

  if (!rpcErr) return;

  // Fallback if migration 0010 has not yet been applied on the connected Supabase database:
  // safely attempt a self-profile insert (only succeeds if profiles_self_insert exists).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName || user.email?.split("@")[0] || "Client Account",
      is_staff: false,
      role: null,
    });
  }
}

export async function requireUser(next = "/dashboard") {
  if (!supabaseConfigured()) {
    redirect(
      "/login?error=Authentication%20is%20not%20configured&next=" +
        encodeURIComponent(safeAuthRedirect(next)),
    );
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent(safeAuthRedirect(next)));

  // Lightweight check: if user has no profile or org membership yet, run idempotent bootstrap
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    await ensureUserAccountProvisioned(supabase, user);
  }

  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser("/admin");
  const { data } = await supabase.from("profiles").select("is_staff").eq("id", user.id).single();
  if (!data?.is_staff) redirect("/dashboard");
  return { supabase, user };
}
