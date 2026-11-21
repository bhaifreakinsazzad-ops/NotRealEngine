"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { ensureUserAccountProvisioned } from "@/lib/auth";
import {
  mapSupabaseLoginError,
  mapSupabaseSignupError,
  resendVerificationSchema,
  resolveSafeRequestOrigin,
  signupFormSchema,
} from "@/lib/auth-validation";

const message = (value: string) => encodeURIComponent(value);

function sanitizeNextPath(raw: FormDataEntryValue | null): string {
  return safeAuthRedirect(typeof raw === "string" ? raw : null);
}

async function resolveAppOrigin(): Promise<string> {
  let forwardedHost: string | null = null;
  let forwardedProto: string | null = null;
  let host: string | null = null;
  try {
    const h = await headers();
    forwardedHost = h.get("x-forwarded-host");
    forwardedProto = h.get("x-forwarded-proto");
    host = h.get("host");
  } catch {
    // Request headers unavailable outside active HTTP context
  }
  return resolveSafeRequestOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost,
    forwardedProto,
    host,
  });
}

export interface SignupActionState {
  status: "idle" | "error" | "verification_sent";
  error?: string;
  fieldErrors?: Partial<Record<"fullName" | "organizationName" | "email" | "password" | "confirmPassword", string>>;
  notice?: string;
  values?: {
    fullName: string;
    organizationName: string;
    email: string;
  };
}

export interface ResendActionState {
  status: "idle" | "sent" | "error";
  message?: string;
}

export async function login(formData: FormData) {
  const nextPath = sanitizeNextPath(formData.get("next"));
  const suffix = nextPath !== "/dashboard" ? `&next=${encodeURIComponent(nextPath)}` : "";

  if (!supabaseConfigured()) {
    redirect(`/login?error=${message("Authentication service is not configured in this environment yet.")}${suffix}`);
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) {
    redirect(`/login?error=${message("Enter both your email address and password.")}${suffix}`);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    console.error("[Auth Login] Sign-in failed:", {
      code: error?.code ?? "unknown",
      status: error?.status ?? null,
    });
    redirect(`/login?error=${message(mapSupabaseLoginError(error))}${suffix}`);
  }

  try {
    await ensureUserAccountProvisioned(supabase, data.user);
  } catch (bootstrapErr) {
    console.error("[Auth Login] Post-login profile bootstrap warning:", bootstrapErr);
  }

  redirect(nextPath);
}

/**
 * Primary production signup action designed for `useActionState`.
 * - Validates fullName, optional organizationName, normalized email, strong password + confirmation.
 * - Handles BOTH immediate-session signups (redirects straight to workspace) and email-verification
 *   signups (returns structured state preserving email for resend).
 * - Maps Supabase Auth errors cleanly and logs diagnostic codes server-side without logging secrets.
 */
export async function signupWithState(
  _prevState: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const rawFullName = String(formData.get("fullName") || "").trim();
  const rawOrgName = String(formData.get("organizationName") || "").trim();
  const rawEmail = String(formData.get("email") || "").trim().toLowerCase();
  const rawPassword = String(formData.get("password") || "");
  const rawConfirmPassword = String(formData.get("confirmPassword") || rawPassword);
  const nextPath = sanitizeNextPath(formData.get("next"));

  const values = {
    fullName: rawFullName,
    organizationName: rawOrgName,
    email: rawEmail,
  };

  if (!supabaseConfigured()) {
    return {
      status: "error",
      error:
        "Supabase authentication environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured in this environment yet.",
      values,
    };
  }

  const parsed = signupFormSchema.safeParse({
    fullName: rawFullName,
    organizationName: rawOrgName,
    email: rawEmail,
    password: rawPassword,
    confirmPassword: rawConfirmPassword,
    next: nextPath,
  });

  if (!parsed.success) {
    const fieldErrors: SignupActionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        (key === "fullName" ||
          key === "organizationName" ||
          key === "email" ||
          key === "password" ||
          key === "confirmPassword") &&
        !fieldErrors[key]
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      error: parsed.error.issues[0]?.message ?? "Please review the highlighted fields.",
      fieldErrors,
      values,
    };
  }

  const { fullName, organizationName, email, password } = parsed.data;
  const supabase = await createServerSupabase();
  const origin = await resolveAppOrigin();
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...(organizationName ? { organization_name: organizationName } : {}),
      },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    console.error("[Auth Signup] Supabase signUp failed:", {
      code: error.code ?? "unknown",
      status: error.status ?? null,
      message: error.message,
      callbackOrigin: origin,
    });
    return {
      status: "error",
      error: mapSupabaseSignupError(error),
      values,
    };
  }

  // When Supabase email-enumeration protection is enabled, signing up with an already-confirmed
  // email returns a synthetic user object with an empty `identities` array and no session.
  const identities = data.user?.identities;
  if (data.user && !data.session && Array.isArray(identities) && identities.length === 0) {
    return {
      status: "error",
      error: "An account with this email already exists. Sign in or use Forgot password to recover access.",
      values,
    };
  }

  // Immediate session (when email confirmation is disabled or auto-confirmed)
  if (data.session && data.user) {
    try {
      await ensureUserAccountProvisioned(supabase, data.user, {
        fullName,
        organizationName: organizationName || undefined,
      });
    } catch (bootstrapErr) {
      console.error("[Auth Signup] Immediate-session bootstrap warning:", bootstrapErr);
    }
    redirect(nextPath);
  }

  // Standard verified-email signup: user must click the confirmation link
  return {
    status: "verification_sent",
    notice: `We sent a verification link to ${email}. Open the email and click the confirmation link to activate your NRE OFFICE workspace.`,
    values,
  };
}

/**
 * Legacy form-action wrapper preserving backward compatibility for plain form submissions.
 */
export async function signup(formData: FormData) {
  const result = await signupWithState({ status: "idle" }, formData);
  if (result.status === "error") {
    redirect(`/signup?error=${message(result.error || "The account request could not be completed.")}`);
  }
  redirect(
    `/login?notice=${message(result.notice || "Check your email to verify the account.")}`,
  );
}

export async function resendVerificationEmail(
  _prevState: ResendActionState,
  formData: FormData,
): Promise<ResendActionState> {
  if (!supabaseConfigured()) {
    return {
      status: "error",
      message: "Authentication service is not configured in this environment yet.",
    };
  }

  const parsed = resendVerificationSchema.safeParse({
    email: String(formData.get("email") || ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const nextPath = sanitizeNextPath(formData.get("next"));
  const supabase = await createServerSupabase();
  const origin = await resolveAppOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  });

  if (error) {
    console.error("[Auth Resend] Verification resend failed:", {
      code: error.code ?? "unknown",
      status: error.status ?? null,
    });
    return {
      status: "error",
      message: mapSupabaseSignupError(error),
    };
  }

  return {
    status: "sent",
    message: `A fresh verification link has been sent to ${parsed.data.email}. Check your inbox and spam folder.`,
  };
}

export async function forgotPassword(formData: FormData) {
  if (!supabaseConfigured()) {
    redirect(`/forgot-password?error=${message("Authentication is not configured yet.")}`);
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const supabase = await createServerSupabase();
  const origin = await resolveAppOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) {
    console.error("[Auth Reset] Reset email request failed:", {
      code: error.code ?? "unknown",
      status: error.status ?? null,
    });
    redirect(`/forgot-password?error=${message("The reset request could not be processed right now.")}`);
  }
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
  if (!supabaseConfigured()) {
    redirect("/forgot-password?error=Authentication%20is%20not%20configured");
  }
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 10 || password.length > 128 || password !== confirm) {
    redirect("/reset-password?error=" + message("Passwords must match and contain 10–128 characters."));
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/forgot-password?error=" + message("Recovery link invalid or expired. Request a new one."));
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/reset-password?error=" + message("Password update failed. Please try again."));
  }
  await supabase.auth.signOut();
  redirect("/login?notice=" + message("Password updated. Sign in with your new password."));
}
