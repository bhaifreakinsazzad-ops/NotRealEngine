import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type QuoteState } from "@/lib/domain/states";

export default async function AdminQuotesPage({
  searchParams
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state: stateFilter } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("quotes")
    .select(`
      id,
      state,
      currency,
      total_minor,
      valid_until,
      created_at,
      sent_at,
      organizations (
        id,
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (stateFilter && stateFilter !== "all") {
    query = query.eq("state", stateFilter);
  }

  const { data: quotes } = await query;

  // Compute metrics for quick operational overview
  const totalCount = quotes?.length ?? 0;
  const draftCount = quotes?.filter((q) => q.state === "draft").length ?? 0;
  const reviewCount = quotes?.filter((q) => q.state === "under_review").length ?? 0;
  const sentCount = quotes?.filter((q) => q.state === "sent").length ?? 0;
  const acceptedCount = quotes?.filter((q) => q.state === "accepted").length ?? 0;

  const stateBadges: Record<QuoteState, string> = {
    draft: "status pending",
    under_review: "status pending",
    sent: "status info",
    accepted: "status ready",
    rejected: "status danger",
    expired: "status danger",
    superseded: "status muted"
  };

  return (
    <div>
      <div className="app-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Quotations Administration</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Create, review, publish, and govern customer commercial proposals.
          </p>
        </div>
        <Link href="/admin/quotes/new" className="btn btn-primary">
          <Plus size={16} /> New Quotation
        </Link>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0"
        }}
      >
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>TOTAL QUOTES</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem" }}>{totalCount}</strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>DRAFT / IN REVIEW</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--gold)" }}>
            {draftCount + reviewCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>OUTSTANDING (SENT)</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--cyan)" }}>
            {sentCount}
          </strong>
        </div>
        <div className="panel" style={{ padding: "1rem" }}>
          <span className="mono muted" style={{ fontSize: "0.74rem" }}>ACCEPTED & ORDERED</span>
          <strong style={{ display: "block", fontSize: "1.6rem", marginTop: "0.2rem", color: "var(--success)" }}>
            {acceptedCount}
          </strong>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.75rem", marginBottom: "1.5rem", overflowX: "auto" }}>
        {[
          { label: "All Quotes", val: "all" },
          { label: "Drafts", val: "draft" },
          { label: "Under Review", val: "under_review" },
          { label: "Sent to Client", val: "sent" },
          { label: "Accepted", val: "accepted" },
          { label: "Rejected / Expired", val: "rejected" }
        ].map((tab) => {
          const isActive = (stateFilter ?? "all") === tab.val;
          return (
            <Link
              key={tab.val}
              href={`/admin/quotes${tab.val === "all" ? "" : `?state=${tab.val}`}`}
              className="mono"
              style={{
                padding: "0.45rem 0.9rem",
                fontSize: "0.78rem",
                color: isActive ? "var(--cyan)" : "var(--silver)",
                background: isActive ? "var(--cyan-dim)" : "transparent",
                border: "1px solid",
                borderColor: isActive ? "var(--cyan)" : "var(--line)",
                borderRadius: "2px"
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Quotes Table */}
      <div className="panel">
        <div className="panel-head">
          <h2>Quotations Register</h2>
          <span className="mono muted" style={{ fontSize: "0.78rem" }}>
            Showing {quotes?.length ?? 0} records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-deep)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.85rem 1rem" }}>QUOTE REF</th>
                <th style={{ padding: "0.85rem 1rem" }}>ORGANIZATION</th>
                <th style={{ padding: "0.85rem 1rem" }}>STATE</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>VALUE</th>
                <th style={{ padding: "0.85rem 1rem" }}>EXPIRATION</th>
                <th style={{ padding: "0.85rem 1rem" }}>CREATED</th>
                <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {quotes && quotes.length > 0 ? (
                quotes.map((q) => {
                  const orgName = (q.organizations as unknown as { name?: string })?.name || "Unassigned";
                  const totalFormatted = (q.total_minor / 100).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });

                  return (
                    <tr key={q.id} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <Link href={`/admin/quotes/${q.id}`} className="mono cyan" style={{ fontWeight: 600 }}>
                          {q.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <strong>{orgName}</strong>
                      </td>
                      <td style={{ padding: "0.9rem 1rem" }}>
                        <span className={stateBadges[q.state as QuoteState] || "status"}>
                          {q.state.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.9rem 1rem", textAlign: "right" }} className="mono">
                        {q.currency} {totalFormatted}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem" }} className="mono muted">
                        {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", fontSize: "0.82rem" }} className="muted">
                        {new Date(q.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "0.9rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <Link href={`/admin/quotes/${q.id}`} className="btn btn-quiet" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", minHeight: "32px" }}>
                            Manage
                          </Link>
                          <Link href={`/quotes/${q.id}`} className="btn btn-quiet" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem", minHeight: "32px" }}>
                            Preview
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
                    <FileText size={36} style={{ margin: "0 auto 0.75rem", color: "var(--line-strong)" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--silver)" }}>No quotations found.</p>
                    <span style={{ fontSize: "0.82rem" }}>
                      Create a new quotation from an inbound brief or client account.
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
