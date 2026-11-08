import { Building2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth";

export default async function AdminClientsPage() {
  const { supabase } = await requireAdmin();

  const { data: orgs } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      slug,
      created_at,
      organization_memberships (
        role,
        profiles (
          id,
          full_name,
          phone
        )
      ),
      projects (
        id
      ),
      orders (
        id
      )
    `)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="app-top">
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Client Accounts & Organizations</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Authorized client entities, team memberships, and active delivery portfolio.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-head">
          <h2>Organizations Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            {orgs?.length ?? 0} Client Accounts
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>SLUG</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>MEMBERS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>PROJECTS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>ORDERS</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "left" }}>REGISTERED</th>
              </tr>
            </thead>
            <tbody>
              {orgs && orgs.length > 0 ? (
                orgs.map((org) => {
                  const members = (org.organization_memberships as Array<{ role: string; profiles: { full_name?: string } }>) || [];
                  const projCount = org.projects?.length ?? 0;
                  const orderCount = org.orders?.length ?? 0;

                  return (
                    <tr key={org.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <strong style={{ color: "var(--text)" }}>{org.name}</strong>
                        <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
                          ID: {org.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="mono cyan">
                        {org.slug}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {members.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                            {members.map((m, idx) => (
                              <span key={idx} className="mono" style={{ fontSize: "0.74rem", background: "var(--surface)", border: "1px solid var(--line)", padding: "0.15rem 0.4rem", borderRadius: "2px" }}>
                                {m.profiles?.full_name || "User"} ({m.role})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="mono muted" style={{ fontSize: "0.76rem" }}>No members</span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }} className="mono">
                        {projCount}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }} className="mono">
                        {orderCount}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }} className="muted">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <Building2 size={36} style={{ margin: "0 auto 0.6rem", color: "var(--line-strong)" }} />
                    <strong style={{ display: "block", color: "var(--silver)" }}>No organizations found.</strong>
                    <span style={{ fontSize: "0.82rem" }}>
                      Organizations are created automatically upon customer onboarding and quotation setup.
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
