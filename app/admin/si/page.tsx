import { requireAdmin } from "@/lib/auth";
import { resolveServiceLabel } from "@/lib/catalog";
import {
  AdminSiWorkbench,
  type SiSuggestionRow,
  type TargetEntityOption,
} from "@/components/admin-si-workbench";
import { type SiEntityType, type SiSuggestionKind, type SiSuggestionStatus } from "@/lib/domain/si-suggestions";

export default async function AdminSiPage() {
  const { supabase } = await requireAdmin();

  const [{ data: suggestions }, { data: projects }, { data: tickets }] = await Promise.all([
    supabase
      .from("si_suggestions")
      .select(
        "id, entity_type, entity_id, suggestion_kind, title, rationale, draft_payload, status, decision_note, applied_action_ref, created_at, approved_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("id, service_id, state")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("support_tickets")
      .select("id, subject, state")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const rows: SiSuggestionRow[] = (suggestions ?? []).map((s) => ({
    id: s.id,
    entityType: s.entity_type as SiEntityType,
    entityId: s.entity_id,
    suggestionKind: (s.suggestion_kind || "project_timeline_update") as SiSuggestionKind,
    title: s.title,
    rationale: s.rationale ?? null,
    draftPayload: (s.draft_payload ?? {}) as {
      title?: string;
      detail?: string;
      visibleToClient?: boolean;
    },
    status: s.status as SiSuggestionStatus,
    decisionNote: s.decision_note ?? null,
    appliedActionRef: s.applied_action_ref ?? null,
    createdAt: s.created_at,
    approvedAt: s.approved_at ?? null,
  }));

  const targets: TargetEntityOption[] = [
    ...(projects ?? []).map((p) => {
      const svc = resolveServiceLabel(p.service_id);
      return {
        id: p.id,
        entityType: "project" as const,
        label: `PRJ-${p.id.slice(0, 8)} · ${svc.id} ${svc.name} (${p.state})`,
      };
    }),
    ...(tickets ?? []).map((t) => ({
      id: t.id,
      entityType: "support_ticket" as const,
      label: `TKT-${t.id.slice(0, 8)} · ${t.subject} (${t.state})`,
    })),
  ];

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div className="app-top" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Human-Supervised SI Review Queue</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Draft, review, approve, reject, and authorize audited Synthetic Intelligence assistance inside NRE OFFICE.
          </p>
        </div>
      </div>

      <AdminSiWorkbench suggestions={rows} targets={targets} />
    </div>
  );
}
