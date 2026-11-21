import { z } from "zod";
import type { CookieOptions } from "@supabase/ssr";

export const signupFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name (at least 2 characters).")
      .max(120, "Full name must be 120 characters or fewer."),
    organizationName: z
      .string()
      .trim()
      .max(120, "Company or workspace name must be 120 characters or fewer.")
      .optional()
      .default(""),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(320, "Email address is too long."),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters long.")
      .max(128, "Password must be 128 characters or fewer.")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
        message: "Password must include at least one letter and one number.",
      }),
    confirmPassword: z.string(),
    next: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address to resend verification.")
    .max(320),
});

export interface SupabaseAuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

/**
 * Maps Supabase Auth errors to clear, safe, user-actionable messages without
 * leaking SQL internals, secrets, or stack traces.
 */
export function mapSupabaseSignupError(err: SupabaseAuthErrorLike | null | undefined): string {
  const code = (err?.code || "").toLowerCase();
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status;

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("already exists")
  ) {
    return "An account with this email already exists. Sign in or reset your password instead.";
  }

  if (code === "weak_password" || msg.includes("password should") || msg.includes("weak password")) {
    return "Password does not meet security requirements. Use at least 10 characters with letters, numbers, and a symbol.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    status === 429 ||
    msg.includes("rate limit")
  ) {
    return "Too many verification emails requested. Please wait a minute and try again.";
  }

  if (code === "email_address_invalid" || msg.includes("invalid email") || msg.includes("unable to validate email")) {
    return "Please enter a valid, reachable email address.";
  }

  if (code === "signup_disabled" || code === "email_provider_disabled" || msg.includes("signups not allowed")) {
    return "New account registration is currently disabled in the authentication provider settings. Contact operations.";
  }

  if (msg.includes("redirect") || msg.includes("url not allowed")) {
    return "Authentication redirect URL is not allowlisted in Supabase Auth settings. Add this domain's /auth/callback URL to Supabase Redirect URLs.";
  }

  if (msg.includes("database error saving new user") || status === 500) {
    return "Account provisioning encountered a database setup issue. Ensure database migrations (including 0010) are applied on Supabase and try again.";
  }

  return "Could not complete account creation right now. Please verify your details and try again.";
}

export function mapSupabaseLoginError(err: SupabaseAuthErrorLike | null | undefined): string {
  const code = (err?.code || "").toLowerCase();
  const msg = (err?.message || "").toLowerCase();

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Your email is not verified yet. Check your inbox (and spam folder) or resend the verification email from the Create Account page.";
  }

  if (code === "over_request_rate_limit" || err?.status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  return "The credentials could not be verified. Check your email and password or reset access.";
}

const SAFE_HOST_RE = /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/;

function isLocalHost(host: string): boolean {
  const bare = host.toLowerCase().split(":")[0] || "";
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1";
}

/**
 * Resolves the canonical public origin for auth callback redirects.
 * - Rejects malformed/injected host headers.
 * - Prevents a stale `.env.example` `NEXT_PUBLIC_APP_URL=http://localhost:3000`
 *   from breaking verification emails on live HTTPS deployments.
 */
export function resolveSafeRequestOrigin(input: {
  configuredAppUrl?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
}): string {
  const rawHost = (input.forwardedHost || input.host || "").split(",")[0]?.trim() || "";
  const validRequestHost = rawHost && SAFE_HOST_RE.test(rawHost) ? rawHost : "";
  const rawProto = (input.forwardedProto || "").split(",")[0]?.trim().toLowerCase();
  const requestProto =
    rawProto === "http" || rawProto === "https"
      ? rawProto
      : validRequestHost && !isLocalHost(validRequestHost)
        ? "https"
        : "http";

  const configured = (input.configuredAppUrl || "").trim().replace(/\/+$/, "");
  if (configured && /^https?:\/\//i.test(configured)) {
    try {
      const parsed = new URL(configured);
      // If configured URL is localhost but request arrived on a real deployed host, trust the deployed host
      if (isLocalHost(parsed.host) && validRequestHost && !isLocalHost(validRequestHost)) {
        return `${requestProto}://${validRequestHost}`;
      }
      return parsed.origin;
    } catch {
      // Fall through to validated request host
    }
  }

  if (validRequestHost) {
    return `${requestProto}://${validRequestHost}`;
  }

  return "http://localhost:3000";
}

/**
 * Ensures Supabase SSR session cookies work reliably on BOTH top-level HTTPS
 * production domains and cross-origin embedded HTTPS preview iframes, while
 * remaining compatible with plain HTTP localhost development.
 */
export function normalizeAuthCookieOptions(
  options: CookieOptions | undefined,
  isHttps: boolean,
): CookieOptions {
  const base: CookieOptions = {
    path: "/",
    ...options,
  };

  if (isHttps) {
    return {
      ...base,
      sameSite: "none",
      secure: true,
      partitioned: true,
    };
  }

  return {
    ...base,
    sameSite: base.sameSite ?? "lax",
    secure: false,
  };
}
