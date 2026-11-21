"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import {
  resendVerificationEmail,
  signupWithState,
  type ResendActionState,
  type SignupActionState,
} from "@/app/auth/actions";

const INITIAL_SIGNUP_STATE: SignupActionState = { status: "idle" };
const INITIAL_RESEND_STATE: ResendActionState = { status: "idle" };

export function SignupForm({
  isAuthConfigured,
  initialError,
  nextPath,
}: {
  isAuthConfigured: boolean;
  initialError?: string;
  nextPath: string;
}) {
  const [state, formAction, isPending] = useActionState(signupWithState, INITIAL_SIGNUP_STATE);
  const [resendState, resendAction, isResending] = useActionState(
    resendVerificationEmail,
    INITIAL_RESEND_STATE,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");

  const hasMinLen = passwordValue.length >= 10;
  const hasLetterAndNum = /[A-Za-z]/.test(passwordValue) && /\d/.test(passwordValue);
  const passwordsMatch = confirmValue.length > 0 && passwordValue === confirmValue;

  if (state.status === "verification_sent") {
    const sentEmail = state.values?.email || "";
    return (
      <div style={{ display: "grid", gap: "1.1rem" }}>
        <div
          className="success-box"
          role="status"
          style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
        >
          <MailCheck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>
              Verify your email to activate NRE OFFICE
            </strong>
            <span style={{ fontSize: "0.86rem", lineHeight: 1.5 }}>{state.notice}</span>
          </div>
        </div>

        <p className="muted" style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.55 }}>
          Didn&apos;t see the email? Check your Spam or Promotions folder, or send a fresh
          verification link below.
        </p>

        {resendState.status === "sent" && (
          <div className="success-box" role="status" style={{ fontSize: "0.84rem" }}>
            {resendState.message}
          </div>
        )}
        {resendState.status === "error" && (
          <div className="error-box" role="alert" style={{ fontSize: "0.84rem" }}>
            {resendState.message}
          </div>
        )}

        <form action={resendAction} style={{ display: "grid", gap: "0.75rem" }}>
          <input type="hidden" name="email" value={sentEmail} />
          <input type="hidden" name="next" value={nextPath} />
          <button type="submit" className="btn" disabled={isResending || !sentEmail}>
            {isResending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span>{isResending ? "Sending verification email..." : "Resend verification email"}</span>
          </button>
        </form>

        <div className="auth-links">
          <Link href={nextPath !== "/dashboard" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>
            Proceed to Sign in
          </Link>
        </div>
      </div>
    );
  }

  const displayError = state.status === "error" ? state.error : initialError;

  return (
    <div>
      {!isAuthConfigured && (
        <div
          className="error-box"
          role="alert"
          style={{
            marginBottom: "1.15rem",
            display: "flex",
            gap: "0.7rem",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "0.83rem", lineHeight: 1.5, minWidth: 0 }}>
            <strong style={{ display: "block", marginBottom: "0.2rem" }}>
              Supabase Authentication Environment Not Connected
            </strong>
            <span>
              Set <code className="mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your deployment
              environment (and add this site&apos;s <code className="mono">/auth/callback</code> URL
              to Supabase Auth Redirect URLs) to enable live account registration.
            </span>
          </div>
        </div>
      )}

      {displayError && (
        <div className="error-box" role="alert" style={{ marginBottom: "1rem" }}>
          {displayError}
        </div>
      )}

      <form action={formAction} noValidate style={{ display: "grid", gap: "0.15rem" }}>
        <input type="hidden" name="next" value={nextPath} />

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            className="input"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder="e.g. Sazzad Sharif"
            defaultValue={state.values?.fullName ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.fullName)}
          />
          {state.fieldErrors?.fullName && (
            <span style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
              {state.fieldErrors.fullName}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="organizationName">
            Company or Workspace name <span className="muted">(optional)</span>
          </label>
          <input
            id="organizationName"
            name="organizationName"
            className="input"
            maxLength={120}
            autoComplete="organization"
            placeholder="e.g. Acme Commerce Ltd."
            defaultValue={state.values?.organizationName ?? ""}
          />
        </div>

        <div className="field">
          <label htmlFor="email">Work or personal email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            required
            autoComplete="email"
            placeholder="you@company.com"
            defaultValue={state.values?.email ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.email)}
          />
          {state.fieldErrors?.email && (
            <span style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
              {state.fieldErrors.email}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="input"
              style={{ paddingRight: "2.7rem" }}
              required
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              aria-invalid={Boolean(state.fieldErrors?.password)}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: "0.55rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: 0,
                color: "var(--muted)",
                cursor: "pointer",
                padding: "0.25rem",
                display: "inline-flex",
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", marginTop: "0.4rem", fontSize: "0.75rem" }}>
            <span className="mono" style={{ color: hasMinLen ? "var(--cyan)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <CheckCircle2 size={12} /> 10+ characters
            </span>
            <span className="mono" style={{ color: hasLetterAndNum ? "var(--cyan)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <CheckCircle2 size={12} /> Letters &amp; numbers
            </span>
          </div>
          {state.fieldErrors?.password && (
            <span style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
              {state.fieldErrors.password}
            </span>
          )}
        </div>

        <div className="field">
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            className="input"
            required
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          />
          {confirmValue.length > 0 && !passwordsMatch && (
            <span style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
              Passwords do not match.
            </span>
          )}
          {state.fieldErrors?.confirmPassword && (
            <span style={{ color: "var(--danger)", fontSize: "0.78rem", marginTop: "0.25rem", display: "block" }}>
              {state.fieldErrors.confirmPassword}
            </span>
          )}
        </div>

        <button
          className="btn btn-primary"
          type="submit"
          disabled={isPending || !isAuthConfigured}
          style={{ width: "100%", marginTop: "0.35rem" }}
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          <span>{isPending ? "Creating account..." : "Create verified account"}</span>
        </button>
      </form>

      <div className="auth-links">
        <Link href={nextPath !== "/dashboard" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>
          Already have an account? Sign in
        </Link>
        <Link href="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}
