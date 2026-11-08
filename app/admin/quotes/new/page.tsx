import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminQuoteEditor } from "@/components/admin-quote-editor";

export default async function NewQuotePage() {
  const { supabase } = await requireAdmin();

  const [{ data: organizations }, { data: briefs }] = await Promise.all([
    supabase.from("organizations").select("id, name, slug").order("name"),
    supabase
      .from("project_briefs")
      .select("id, reference, contact_name, organization_name, service_id, payload")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  return (
    <div>
      <div style={{ marginBottom: "1.2rem" }}>
        <Link
          href="/admin/quotes"
          className="mono muted"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem" }}
        >
          <ArrowLeft size={14} /> Back to Quotations Register
        </Link>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Create New Commercial Quotation</h1>
        <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.9rem" }}>
          Assemble itemized scope, deliverables, exclusions, and payment terms for client presentation.
        </p>
      </div>

      <AdminQuoteEditor
        organizations={organizations || []}
        briefs={
          (briefs || []).map((b) => ({
            id: b.id,
            reference: b.reference,
            contactName: b.contact_name,
            organizationName: b.organization_name,
            serviceId: b.service_id,
            payload: (b.payload as Record<string, unknown>) || {}
          }))
        }
      />
    </div>
  );
}
