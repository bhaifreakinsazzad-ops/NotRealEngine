import { MarketingShell } from "@/components/marketing-shell";
import { SignupForm } from "@/components/signup-form";
import { supabaseConfigured } from "@/lib/supabase/config";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const safeNext = safeAuthRedirect(params.next);
  const configured = supabaseConfigured();

  return (
    <MarketingShell>
      <div className="auth-wrap">
        <div className="auth-panel">
          <h1>Create a verified account</h1>
          <p>
            Set up your NRE OFFICE client account to track quotes, orders, milestones, files, and
            NRE PULSE support securely.
          </p>
          <SignupForm
            isAuthConfigured={configured}
            initialError={params.error}
            nextPath={safeNext}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
