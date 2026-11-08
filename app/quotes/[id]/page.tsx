import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, Clock, FileText, Layers, ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { type QuoteState } from "@/lib/domain/states";
import { QuoteDecisionForm } from "@/components/quote-decision-form";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();

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
        name,
        slug
      )
    `)
    .eq("id", id)
    .single();

  if (error || !quote) {
    notFound();
  }

  // Fetch line items
  const { data: items } = await supabase
    .from("quote_items")
    .select("id, label, description, quantity, unit_amount_minor, recurring_interval, display_order")
    .eq("quote_id", id)
    .order("display_order", { ascending: true });

  // If quote is accepted, check for linked order
  let linkedOrderId: string | null = null;
  if (quote.state === "accepted") {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("quote_id", id)
      .maybeSingle();
    linkedOrderId = order?.id ?? null;
  }

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

  const stateClasses: Record<QuoteState, string> = {
    draft: "status pending",
    under_review: "status pending",
    sent: "status info",
    accepted: "status ready",
    rejected: "status danger",
    expired: "status danger",
    superseded: "status muted"
  };

  const isExpired = Boolean(quote.valid_until && new Date(quote.valid_until) <= new Date());
  const displayState: QuoteState = isExpired && quote.state === "sent" ? "expired" : (quote.state as QuoteState);

  return (
    <main id="main" className="shell section" style={{ maxWidth: "1100px", padding: "40px 0 80px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/dashboard"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.84rem" }}
        >
          <ArrowLeft size={14} /> Back to Client Workspace
        </Link>
      </div>

      <div className="panel">
        {/* Header */}
        <div className="panel-head" style={{ padding: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.6rem", letterSpacing: "-0.03em" }}>
                Commercial Quotation
              </h1>
              <span className={`status ${stateClasses[displayState] || ""}`}>
                {displayState.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <p className="mono muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
              REF: {quote.id} · Issued for {orgName}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span className="mono muted" style={{ display: "block", fontSize: "0.74rem" }}>
              TOTAL PROPOSAL VALUE
            </span>
            <strong style={{ fontSize: "1.8rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
              {quote.currency} {formattedTotal}
            </strong>
          </div>
        </div>

        <div className="panel-body" style={{ padding: "2rem" }}>
          {/* Key Parameters Meta Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1.2rem",
              paddingBottom: "1.8rem",
              borderBottom: "1px solid var(--line)"
            }}
          >
            <div>
              <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                CLIENT / ORGANIZATION
              </span>
              <strong style={{ fontSize: "0.95rem" }}>{orgName}</strong>
            </div>

            <div>
              <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                VALIDITY EXPIRATION
              </span>
              <strong style={{ fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Calendar size={14} className="cyan" />
                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "Pending review"}
              </strong>
            </div>

            <div>
              <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                INCLUDED REVISION CYCLES
              </span>
              <strong style={{ fontSize: "0.95rem" }}>
                {quote.revision_limit} Formal Review Rounds
              </strong>
            </div>

            <div>
              <span className="mono muted" style={{ display: "block", fontSize: "0.72rem", marginBottom: "0.2rem" }}>
                TERMS MASTER VERSION
              </span>
              <strong className="mono" style={{ fontSize: "0.85rem", color: "var(--silver)" }}>
                {quote.terms_version || "STANDARD-V1.0"}
              </strong>
            </div>
          </div>

          {/* Scope of Work */}
          <div style={{ margin: "2rem 0" }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={18} className="cyan" /> Scope & Engineering Specifications
            </h3>
            {scope.summary && (
              <p style={{ color: "var(--silver)", lineHeight: 1.6, fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                {scope.summary}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {/* Deliverables */}
              {scope.deliverables && scope.deliverables.length > 0 && (
                <div style={{ border: "1px solid var(--line)", padding: "1.2rem", background: "var(--bg-deep)" }}>
                  <h4 style={{ margin: "0 0 0.8rem", color: "var(--cyan)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <CheckCircle2 size={15} /> Committed Deliverables
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--silver)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                    {scope.deliverables.map((d, idx) => (
                      <li key={idx} style={{ marginBottom: "0.3rem" }}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exclusions */}
              {scope.exclusions && scope.exclusions.length > 0 && (
                <div style={{ border: "1px solid var(--line)", padding: "1.2rem", background: "var(--bg-deep)" }}>
                  <h4 style={{ margin: "0 0 0.8rem", color: "var(--gold)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <ShieldAlert size={15} /> Scope Boundaries & Exclusions
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "var(--muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                    {scope.exclusions.map((e, idx) => (
                      <li key={idx} style={{ marginBottom: "0.3rem" }}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Milestones schedule if provided */}
            {scope.milestones && scope.milestones.length > 0 && (
              <div style={{ marginTop: "1.5rem", border: "1px solid var(--line)", padding: "1.2rem", background: "var(--bg-deep)" }}>
                <h4 style={{ margin: "0 0 0.8rem", color: "var(--text)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={15} className="cyan" /> Planned Execution Milestones
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
                  {scope.milestones.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--line)",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.82rem",
                        color: "var(--silver)",
                        borderRadius: "2px"
                      }}
                    >
                      <strong className="mono cyan" style={{ marginRight: "0.4rem" }}>0{idx + 1}.</strong> {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Itemized Commercial Table */}
          <div style={{ margin: "2.5rem 0" }}>
            <h3 style={{ fontSize: "1.15rem", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={18} className="cyan" /> Itemized Commercial Schedule
            </h3>

            <div style={{ border: "1px solid var(--line)", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-deep)", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.74rem" }}>
                    <th style={{ padding: "0.8rem 1rem" }}>#</th>
                    <th style={{ padding: "0.8rem 1rem" }}>SERVICE MODULE / ITEM</th>
                    <th style={{ padding: "0.8rem 1rem", textAlign: "center" }}>QTY</th>
                    <th style={{ padding: "0.8rem 1rem", textAlign: "right" }}>UNIT PRICE ({quote.currency})</th>
                    <th style={{ padding: "0.8rem 1rem", textAlign: "right" }}>TOTAL ({quote.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {items && items.length > 0 ? (
                    items.map((item, idx) => {
                      const lineTotal = ((item.quantity * item.unit_amount_minor) / 100).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });
                      const unitPrice = (item.unit_amount_minor / 100).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });

                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="mono muted" style={{ padding: "0.9rem 1rem" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "0.9rem 1rem" }}>
                            <strong style={{ color: "var(--text)", display: "block" }}>{item.label}</strong>
                            {item.description && (
                              <span style={{ color: "var(--muted)", fontSize: "0.82rem", display: "block", marginTop: "0.2rem" }}>
                                {item.description}
                              </span>
                            )}
                            {item.recurring_interval && (
                              <span className="mono gold" style={{ fontSize: "0.7rem", marginTop: "0.2rem", display: "inline-block" }}>
                                ↻ Recurring every {item.recurring_interval}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.9rem 1rem", textAlign: "center" }} className="mono">
                            {item.quantity}
                          </td>
                          <td style={{ padding: "0.9rem 1rem", textAlign: "right" }} className="mono">
                            {unitPrice}
                          </td>
                          <td style={{ padding: "0.9rem 1rem", textAlign: "right" }} className="mono">
                            <strong>{lineTotal}</strong>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted)" }}>
                        Schedule details captured in approved commercial snapshot.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-deep)", fontWeight: "bold" }}>
                    <td colSpan={4} style={{ padding: "1rem", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.84rem", color: "var(--silver)" }}>
                      OFFICIAL QUOTED TOTAL:
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "var(--cyan)" }}>
                      {quote.currency} {formattedTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Interactive Decision Form */}
          <QuoteDecisionForm
            quoteId={quote.id}
            state={displayState}
            validUntil={quote.valid_until}
            orderId={linkedOrderId}
            termsVersion={quote.terms_version}
          />
        </div>
      </div>
    </main>
  );
}
