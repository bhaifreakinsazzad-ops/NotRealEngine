"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";

const message = (value: string) => encodeURIComponent(value);

export async function login(formData: FormData) {
  if (!supabaseConfigured()) redirect(`/login?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || ""); const password = String(formData.get("password") || "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${message("The credentials could not be verified.")}`);
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  if (!supabaseConfigured()) redirect(`/signup?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || ""); const password = String(formData.get("password") || ""); const fullName = String(formData.get("fullName") || "");
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) redirect(`/signup?error=${message("The account request could not be completed.")}`);
  redirect("/login?notice=Check%20your%20email%20to%20verify%20the%20account.");
}

export async function forgotPassword(formData: FormData) {
  if (!supabaseConfigured()) redirect(`/forgot-password?error=${message("Authentication is not configured yet.")}`);
  const email = String(formData.get("email") || ""); const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard/settings` });
  if (error) redirect(`/forgot-password?error=${message("The reset request could not be processed.")}`);
  redirect("/login?notice=If%20the%20account%20exists,%20a%20reset%20email%20has%20been%20sent.");
}

export async function logout() { if (supabaseConfigured()) { const supabase = await createServerSupabase(); await supabase.auth.signOut(); } redirect("/"); }
