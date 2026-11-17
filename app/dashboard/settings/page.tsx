import { Building2, ShieldCheck, UserCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AccountSettingsForm } from "@/components/account-settings-form";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, is_staff, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organization_memberships")
      .select(`
        role,
        created_at,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
  ]);

  const primaryOrg = (
    memberships?.[0]?.organizations as unknown as { id?: string } | null | undefined
  )?.id ?? null;

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Account & Organization Settings</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Verified identity, contact preferences, and server-governed organization memberships.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
        {/* Verified Identity */}
        <div className="panel">
          <div className="panel-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <UserCheck size={18} className="cyan" /> Verified Identity
            </h2>
            <span className="status ready">AUTHENTICATED</span>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-deep)", border: "1px solid var(--line)" }}>
              <div>
                <span className="mono muted" style={{ fontSize: "0.72rem", display: "block" }}>EMAIL ADDRESS</span>
                <strong style={{ color: "var(--text)" }}>{user.email || "—"}</strong>
              </div>
              <div>
                <span className="mono muted" style={{ fontSize: "0.72rem", display: "block" }}>ACCOUNT UUID</span>
                <span className="mono cyan" style={{ fontSize: "0.82rem" }}>{user.id}</span>
              </div>
              <div>
                <span className="mono muted" style={{ fontSize: "0.72rem", display: "block" }}>ACCESS TIER</span>
                <strong className="mono" style={{ fontSize: "0.84rem" }}>
                  {profile?.is_staff ? "AUTHORIZED STAFF" : "CLIENT ACCOUNT"}
                </strong>
              </div>
            </div>

            <AccountSettingsForm
              initialFullName={profile?.full_name || ""}
              initialPhone={profile?.phone || ""}
              primaryOrganizationId={primaryOrg}
            />
          </div>
        </div>

        {/* Organization Memberships */}
        <div className="panel">
          <div className="panel-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Building2 size={18} className="cyan" /> Organization Memberships
            </h2>
            <span className="mono muted" style={{ fontSize: "0.78rem" }}>
              {memberships?.length ?? 0} Authorized Organizations
            </span>
          </div>
          <div className="panel-body">
            {memberships && memberships.length > 0 ? (
              <div style={{ display: "grid", gap: "0.75rem" }}>
                {memberships.map((m, idx) => {
                  const org = m.organizations as unknown as {
                    id?: string;
                    name?: string;
                    slug?: string;
                  } | null;

                  return (
                    <div
                      key={org?.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                        padding: "1rem",
                        background: "var(--bg-deep)",
                        border: "1px solid var(--line)"
                      }}
                    >
                      <div>
                        <strong style={{ color: "var(--text)", display: "block" }}>
                          {org?.name || "Organization"}
                        </strong>
                        <span className="mono muted" style={{ fontSize: "0.78rem" }}>
                          Slug: {org?.slug || "—"} · Joined {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="status info">{m.role.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                No organization memberships assigned yet. Organizations are provisioned when quotes or client onboarding records are linked by staff.
              </p>
            )}

            <div style={{ marginTop: "1.2rem", padding: "0.9rem 1rem", background: "var(--bg-deep)", border: "1px solid var(--line)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <ShieldCheck size={18} className="gold" style={{ flexShrink: 0 }} />
              <span className="muted" style={{ fontSize: "0.82rem" }}>
                Organization roles and staff permissions are enforced server-side via PostgreSQL Row Level Security and cannot be altered from the browser.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
