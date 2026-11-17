import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export async function requireUser(next = "/dashboard") {
  if (!supabaseConfigured()) redirect("/login?error=Authentication%20is%20not%20configured&next=" + encodeURIComponent(safeAuthRedirect(next)));
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=" + encodeURIComponent(safeAuthRedirect(next)));
  return { supabase, user };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser("/admin");
  const { data } = await supabase.from("profiles").select("is_staff").eq("id", user.id).single();
  if (!data?.is_staff) redirect("/dashboard");
  return { supabase, user };
}
