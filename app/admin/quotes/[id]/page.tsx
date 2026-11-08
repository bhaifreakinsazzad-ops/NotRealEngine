import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { type QuoteState } from "@/lib/domain/states";
import { AdminQuoteActions } from "@/components/admin-quote-actions";

export default async function AdminQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: quote, error } = await supabase
    .from("quotes")
    .select(`
      id,
      organization_id,
      project_brief_id,
      state,
      currency,
      total_minor,
      revision_limit,
      valid_until,
      terms_version,
      scope,
      snapshot,
      sent_at,
      created_at,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq("id", id)
    .single();

  if (error || !quote) {
    notFound();
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("id, label, description, quantity, unit_amount_minor, recurring_interval, display_order")
    .eq("quote_id", id)
    .order("display_order", { ascending: true });

  // Check for order if accepted
  const { data: order } = await supabase
    .from("orders")
    .select("id, state, created_at")
    .eq("quote_id", id)
    .maybeSingle();

  // Check for acceptance record
  const { data: acceptance } = await supabase
    .from("quote_acceptances")
    .select("id, decision, created_at, accepted_by")
    .eq("quote_id", id)
    .maybeSingle();

  const scope = (quote.scope as {
    summary?: string;
    deliverables?: string[];
    exclusions?: string[];
    milestones?: string[];
  }) || {};

  const orgName = (quote.organizations as unknown as { name?: string })?.name || "Client Organization";
  const formattedTotal = (quote.total_minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href="/admin/quotes"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Quotations Register
        </Link>
      </div>

      {/* Main Header Card */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Quotation {quote.id.slice(0, 8)}</h1>
              <span className={stateBadges[quote.state as QuoteState] || "status"}>
                {quote.state.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              Target Account: <strong>{orgName}</strong> · Created {new Date(quote.created_at).toLocaleString()}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              VALUATION
            </span>
            <strong style={{ fontSize: "1.75rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
              {quote.currency} {formattedTotal}
            </strong>
          </div>
        </div>

        <div className="panel-body" style={{ borderTop: "1px solid var(--line)" }}>
          <AdminQuoteActions quoteId={quote.id} state={quote.state as QuoteState} />
        </div>
      </div>

      {/* Linked Order Banner if Accepted */}
      {order && (
        <div className="panel" style={{ marginBottom: "1.5rem", borderColor: "var(--success)" }}>
          <div className="panel-body" style={{ background: "rgba(85,216,155,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <CheckCircle2 size={24} style={{ color: "var(--success)" }} />
              <div>
                <strong style={{ display: "block", color: "var(--success)" }}>
                  Order Created: #{order.id.slice(0, 8)}
                </strong>
                <span className="mono muted" style={{ fontSize: "0.82rem" }}>
                  State: {order.state.toUpperCase()} · Accepted {acceptance ? new Date(acceptance.created_at).toLocaleString() : ""}
                </span>
              </div>
            </div>
            <Link href={`/admin/orders/${order.id}`} className="btn btn-primary" style={{ fontSize: "0.85rem" }}>
              Manage Order <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* Scope and Items */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Scope & Specifications</h2>
        </div>
        <div className="panel-body">
          {scope.summary && (
            <p style={{ color: "var(--silver)", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "1.5rem" }}>
              {scope.summary}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2rem" }}>
            {scope.deliverables && scope.deliverables.length > 0 && (
              <div style={{ border: "1px solid var(--line)", padding: "1rem", background: "var(--bg-deep)" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "var(--cyan)", fontSize: "0.88rem" }}>
                  Committed Deliverables
                </h4>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--silver)", fontSize: "0.84rem", lineHeight: 1.5 }}>
                  {scope.deliverables.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {scope.exclusions && scope.exclusions.length > 0 && (
              <div style={{ border: "1px solid var(--line)", padding: "1rem", background: "var(--bg-deep)" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "var(--gold)", fontSize: "0.88rem" }}>
                  Scope Exclusions
                </h4>
                <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: "0.84rem", lineHeight: 1.5 }}>
                  {scope.exclusions.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Line Items Register */}
      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="panel-head">
          <h2>Itemized Schedule</h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-deep)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                <th style={{ padding: "0.8rem 1rem" }}>#</th>
                <th style={{ padding: "0.8rem 1rem" }}>LABEL</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "center" }}>QTY</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "right" }}>UNIT ({quote.currency})</th>
                <th style={{ padding: "0.8rem 1rem", textAlign: "right" }}>TOTAL ({quote.currency})</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="mono muted" style={{ padding: "0.85rem 1rem" }}>{idx + 1}</td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <strong>{item.label}</strong>
                    {item.description && (
                      <span style={{ display: "block", color: "var(--muted)", fontSize: "0.8rem" }}>
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "center" }} className="mono">{item.quantity}</td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                    {(item.unit_amount_minor / 100).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", textAlign: "right" }} className="mono">
                    <strong>{((item.quantity * item.unit_amount_minor) / 100).toLocaleString()}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Snapshot Viewer (if published) */}
      {quote.snapshot && (
        <div className="panel">
          <div className="panel-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={18} className="cyan" />
              Published Commercial Snapshot (Immutable)
            </h2>
          </div>
          <div className="panel-body">
            <pre
              className="mono"
              style={{
                background: "var(--bg-deep)",
                padding: "1rem",
                borderRadius: "2px",
                fontSize: "0.78rem",
                color: "var(--cyan)",
                overflowX: "auto",
                maxHeight: "260px"
              }}
            >
              {JSON.stringify(quote.snapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
