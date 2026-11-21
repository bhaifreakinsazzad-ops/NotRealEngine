import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { MarketingShell } from "@/components/marketing-shell";
import { login } from "@/app/auth/actions";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { supabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;
  const safeNext = safeAuthRedirect(params.next);
  const configured = supabaseConfigured();
  const signupHref =
    safeNext !== "/dashboard"
      ? `/signup?next=${encodeURIComponent(safeNext)}`
      : "/signup";

  return (
    <MarketingShell>
      <div className="auth-wrap">
        <div className="auth-panel">
          <h1>Sign in</h1>
          <p>Access your verified organization workspace. Browser-controlled roles are never accepted.</p>

          {!configured && (
            <div
              className="error-box"
              role="alert"
              style={{
                marginBottom: "1rem",
                display: "flex",
                gap: "0.7rem",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: "0.83rem", lineHeight: 1.5, minWidth: 0 }}>
                <strong style={{ display: "block", marginBottom: "0.15rem" }}>
                  Supabase Authentication Environment Not Connected
                </strong>
                <span>
                  Configure <code className="mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable sign-in.
                </span>
              </div>
            </div>
          )}

          {params.error && <div className="error-box" role="alert">{params.error}</div>}
          {params.notice && <div className="success-box" role="status">{params.notice}</div>}

          <form action={login}>
            <input type="hidden" name="next" value={safeNext} />
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input" required autoComplete="email" />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                required
                autoComplete="current-password"
                minLength={8}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!configured} style={{ width: "100%" }}>
              Sign in securely
            </button>
          </form>
          <div className="auth-links">
            <Link href={signupHref}>Create account</Link>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
