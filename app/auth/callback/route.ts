import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { supabaseConfigured } from "@/lib/supabase/config";
import { ensureUserAccountProvisioned } from "@/lib/auth";
import { resolveSafeRequestOrigin } from "@/lib/auth-validation";

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = resolveSafeRequestOrigin({
    configuredAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host") || url.host,
  });

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = (url.searchParams.get("type") || "").toLowerCase() as EmailOtpType;
  const errorCode = url.searchParams.get("error_code") || url.searchParams.get("error");
  const next = safeAuthRedirect(url.searchParams.get("next"));

  if (errorCode) {
    const friendly =
      errorCode === "otp_expired" || errorCode === "access_denied"
        ? "That verification link has expired or was already used. Request a fresh link or sign in below."
        : "The authentication link could not be verified. Please try signing in or request a new verification email.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(friendly)}`, origin),
    );
  }

  if (!supabaseConfigured()) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Authentication is not configured in this environment yet.")}`,
        origin,
      ),
    );
  }

  const supabase = await createServerSupabase();
  let verified = false;

  // Path 1: PKCE OAuth / SSR code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      verified = true;
    } else {
      console.error("[Auth Callback] exchangeCodeForSession failed:", {
        code: error.code ?? "unknown",
        status: error.status ?? null,
      });
    }
  }
  // Path 2: Supabase email verification / recovery token_hash link
  else if (tokenHash && ALLOWED_OTP_TYPES.has(rawType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType,
    });
    if (!error) {
      verified = true;
    } else {
      console.error("[Auth Callback] verifyOtp failed:", {
        type: rawType,
        code: error.code ?? "unknown",
        status: error.status ?? null,
      });
    }
  }

  if (verified) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        await ensureUserAccountProvisioned(supabase, user);
      } catch (bootstrapErr) {
        console.error("[Auth Callback] Account bootstrap warning:", bootstrapErr);
      }
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("The verification link is invalid or expired. Sign in or request a new verification email.")}`,
      origin,
    ),
  );
}
