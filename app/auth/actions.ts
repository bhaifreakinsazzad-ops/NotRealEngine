"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeAuthRedirect } from "@/lib/auth-redirect";

const message = (value: string) => encodeURIComponent(value);

function sanitizeNextPath(raw: FormDataEntryValue | null): string {
  return safeAuthRedirect(typeof raw === "string" ? raw : null);
}

async function resolveAppOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // Fallback below when request headers are unavailable
  }
  return "http://localhost:3000";
}

export async function login(formData: FormData) {
  const nextPath = sanitizeNextPath(formData.get("next"));
  if (!supabaseConfigured()) redirect(`/login?error=${message("Authentication is not configured yet.")}&next=${encodeURIComponent(nextPath)}`);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const suffix = nextPath !== "/dashboard" ? `&next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login?error=${message("The credentials could not be verified.")}${suffix}`);
  }
  redirect(nextPath);
}

export async function signup(formData: FormData) {
  if (!supabaseConfigured()) redirect(`/signup?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("fullName") || "").trim();
  const supabase = await createServerSupabase();
  const origin = await resolveAppOrigin();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`
    }
  });
  if (error) redirect(`/signup?error=${message("The account request could not be completed.")}`);
  redirect("/login?notice=Check%20your%20email%20to%20verify%20the%20account.");
}

export async function forgotPassword(formData: FormData) {
  if (!supabaseConfigured()) redirect(`/forgot-password?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || "").trim();
  const supabase = await createServerSupabase();
  const origin = await resolveAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`
  });
  if (error) redirect(`/forgot-password?error=${message("The reset request could not be processed.")}`);
  redirect("/login?notice=If%20the%20account%20exists,%20a%20reset%20email%20has%20been%20sent.");
}

export async function logout() {
  if (supabaseConfigured()) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/");
}

/** Exchange an authenticated recovery session for a new password. */
export async function updatePassword(formData: FormData) {
  if (!supabaseConfigured()) redirect("/forgot-password?error=Authentication%20is%20not%20configured");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 10 || password.length > 128 || password !== confirm) {
    redirect("/reset-password?error=" + message("Passwords must match and contain 10–128 characters."));
  }
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/forgot-password?error=" + message("Recovery link invalid or expired. Request a new one."));
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/reset-password?error=" + message("Password update failed. Please try again."));
  await supabase.auth.signOut();
  redirect("/login?notice=" + message("Password updated. Sign in with your new password."));
}
