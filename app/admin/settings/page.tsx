import { requireAdmin } from "@/lib/auth";

export default async function AdminSettingsPage() {
  await requireAdmin();

  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>System Settings & Operational Gates</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Operational release gates, security parameters, and integration configurations.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Release Gates */}
        <div className="panel">
          <div className="panel-head">
            <h2>Release Governance & Gate Status</h2>
          </div>
          <div className="panel-body">
            <div className="gate-row">
              <div>
                <strong>Supabase Database & Public Anon Connectivity</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                  Required for client auth, session refresh, and RLS queries.
                </span>
              </div>
              <span className={supabaseConfigured ? "status ready" : "status pending"}>
                {supabaseConfigured ? "CONFIGURED" : "PENDING"}
              </span>
            </div>

            <div className="gate-row">
              <div>
                <strong>Server-Side Service-Role Intake Contract</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                  Required for rate-limited anonymous brief persistence.
                </span>
              </div>
              <span className={serviceRoleConfigured ? "status ready" : "status pending"}>
                {serviceRoleConfigured ? "CONFIGURED" : "PENDING"}
              </span>
            </div>

            <div className="gate-row">
              <div>
                <strong>Live Commercial Payment Gateways</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                  Disabled by policy until founder credential approval and reconciliation testing.
                </span>
              </div>
              <span className="status pending">HELD / DISABLED</span>
            </div>

            <div className="gate-row">
              <div>
                <strong>Transactional Notification Providers (SMTP / SMS)</strong>
                <span style={{ display: "block", color: "var(--muted)", fontSize: "0.78rem" }}>
                  Outbox pattern persists events durably; real delivery held disabled.
                </span>
              </div>
              <span className="status pending">HELD / DISABLED</span>
            </div>
          </div>
        </div>

        {/* Security Summary */}
        <div className="panel">
          <div className="panel-head">
            <h2>Security & Tenant Isolation Summary</h2>
          </div>
          <div className="panel-body">
            <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.7 }}>
              <li>Row Level Security (RLS) is strictly enforced on all 24 PostgreSQL public tables.</li>
              <li>Client browser cannot elevate permissions, bypass RLS, or forge payment verification.</li>
              <li>Commercial quote acceptance is an atomic database RPC generating an immutable snapshot.</li>
              <li>Integer minor units are used exclusively for all commercial currency calculations.</li>
              <li>Private file storage enforces organization-level isolation scoped by project UUID.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
