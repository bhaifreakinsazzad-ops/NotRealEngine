"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";

const message = (value: string) => encodeURIComponent(value);

function sanitizeNextPath(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return "/dashboard";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return "/dashboard";
  }
  return trimmed;
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
  if (!supabaseConfigured()) redirect(`/login?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const nextPath = sanitizeNextPath(formData.get("next"));
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
    redirectTo: `${origin}/auth/callback?next=/dashboard/settings`
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
