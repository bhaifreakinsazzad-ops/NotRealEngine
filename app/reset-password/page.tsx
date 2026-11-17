import { redirect } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { updatePassword } from "@/app/auth/actions";
import { createServerSupabase } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!supabaseConfigured()) {
    redirect("/forgot-password?error=Authentication%20is%20not%20configured");
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password?error=Recovery%20link%20is%20invalid%20or%20expired");
  }
  const { error } = await searchParams;
  return (
    <MarketingShell>
      <div className="auth-wrap">
        <div className="auth-panel">
          <h1>Set a new password</h1>
          <p>Choose a new password to restore access to your account.</p>
          {error && <div className="error-box" role="alert">{error}</div>}
          <form action={updatePassword}>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" className="input" required minLength={10} maxLength={128} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm new password</label>
              <input id="confirm" name="confirm" type="password" className="input" required minLength={10} maxLength={128} autoComplete="new-password" />
            </div>
            <button className="btn btn-primary" type="submit">Update password</button>
          </form>
        </div>
      </div>
    </MarketingShell>
  );
}
