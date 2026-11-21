"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { type ProjectState, canTransition, projectTransitions } from "@/lib/domain/states";
import {
  type SiSuggestionStatus,
  canExecuteAuthorizedSiAction,
  canTransitionSiSuggestion,
} from "@/lib/domain/si-suggestions";
import { SUPPORT_TICKET_STATES, adminPulseUpdateSchema } from "@/lib/domain/pulse";
import { enqueueServerOutboxEvent, recordServerAuditLog } from "@/lib/supabase/server-events";

const updateLeadSchema = z.object({
  leadId: z.string().uuid("Invalid lead ID"),
  status: z.enum(["new", "reviewing", "qualified", "unqualified", "converted", "closed"])
});

export async function updateLeadStatusAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid lead status." };
  }

  const { leadId, status } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { error: updErr } = await supabase
      .from("leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    await recordServerAuditLog({
      actorId: user.id,
      action: `lead.${status}`,
      entityType: "lead",
      entityId: leadId,
      afterData: { status }
    });

    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const updateProjectStateSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  nextState: z.enum([
    "awaiting_requirements",
    "requirements_review",
    "ready_for_production",
    "in_progress",
    "internal_qa",
    "client_review",
    "revision",
    "approved",
    "delivered",
    "on_hold",
    "cancelled"
  ])
});

export async function updateProjectStateAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateProjectStateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid project data." };
  }

  const { projectId, nextState } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, state, organization_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found." };
    }

    if (!canTransition(project.state as ProjectState, nextState as ProjectState, projectTransitions)) {
      return { ok: false, error: `Invalid transition from ${project.state} to ${nextState}.` };
    }

    const { error: updErr } = await supabase
      .from("projects")
      .update({ state: nextState, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    if (nextState === "delivered") {
      await enqueueServerOutboxEvent({
        aggregateType: "project",
        aggregateId: projectId,
        eventType: "Project Delivered",
        payload: { projectId, organizationId: project.organization_id },
        idempotencyKey: `project-delivered:${projectId}`
      });
    }

    await supabase
      .from("project_timeline_events")
      .insert({
        project_id: projectId,
        organization_id: project.organization_id,
        event_type: `project.${nextState}`,
        title: `Project moved to ${nextState.replace(/_/g, " ")}`,
        detail: `Verified state transition from ${project.state.replace(/_/g, " ")} to ${nextState.replace(/_/g, " ")}.`,
        visible_to_client: true,
        actor_id: user.id,
      });

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: `project.${nextState}`,
      entityType: "project",
      entityId: projectId,
      beforeData: { state: project.state },
      afterData: { state: nextState }
    });

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const updateMilestoneSchema = z.object({
  milestoneId: z.string().uuid("Invalid milestone ID"),
  nextState: z.enum(["pending", "in_progress", "complete", "blocked"])
});

export async function updateMilestoneStateAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid milestone data." };
  }

  const { milestoneId, nextState } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { data: updatedMilestone, error: updErr } = await supabase
      .from("milestones")
      .update({
        state: nextState,
        completed_at: nextState === "complete" ? new Date().toISOString() : null
      })
      .eq("id", milestoneId)
      .select("id, project_id, label")
      .single();

    if (updErr || !updatedMilestone) {
      return { ok: false, error: updErr?.message ?? "Milestone not found." };
    }

    const { data: parentProject } = await supabase
      .from("projects")
      .select("organization_id")
      .eq("id", updatedMilestone.project_id)
      .maybeSingle();

    if (parentProject?.organization_id) {
      await supabase.from("project_timeline_events").insert({
        project_id: updatedMilestone.project_id,
        organization_id: parentProject.organization_id,
        event_type: `milestone.${nextState}`,
        title: `Milestone ${nextState.replace(/_/g, " ")}: ${updatedMilestone.label}`,
        detail: `Human-verified milestone status updated to ${nextState.replace(/_/g, " ")}.`,
        visible_to_client: true,
        actor_id: user.id,
      });
    }

    await recordServerAuditLog({
      organizationId: parentProject?.organization_id,
      actorId: user.id,
      action: `milestone.${nextState}`,
      entityType: "milestone",
      entityId: milestoneId,
      afterData: { projectId: updatedMilestone.project_id, state: nextState }
    });

    revalidatePath("/admin/projects");
    revalidatePath(`/admin/projects/${updatedMilestone.project_id}`);
    revalidatePath(`/dashboard/projects/${updatedMilestone.project_id}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

export async function approvePriceVersionAction(
  priceVersionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireAdmin();

    const { data: price, error: priceErr } = await supabase
      .from("price_versions")
      .select("id, status, package_id, amount_minor, currency")
      .eq("id", priceVersionId)
      .single();

    if (priceErr || !price) {
      return { ok: false, error: "Price version not found." };
    }

    const now = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("price_versions")
      .update({
        status: "approved",
        approved_at: now,
        approved_by: user.id
      })
      .eq("id", priceVersionId);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    await recordServerAuditLog({
      actorId: user.id,
      action: "price_version.approved",
      entityType: "price_version",
      entityId: priceVersionId,
      afterData: { approvedAt: now, approvedBy: user.id }
    });

    revalidatePath("/admin/pricing");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const updateSupportTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket ID"),
  state: z.enum(SUPPORT_TICKET_STATES),
});

export async function updateSupportTicketStateAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateSupportTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid support ticket state." };
  }

  const { ticketId, state } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { data: existing, error: fetchErr } = await supabase
      .from("support_tickets")
      .select("id, state, organization_id")
      .eq("id", ticketId)
      .single();

    if (fetchErr || !existing) {
      return { ok: false, error: "Support ticket not found." };
    }

    const { error: updErr } = await supabase
      .from("support_tickets")
      .update({ state, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    await recordServerAuditLog({
      organizationId: existing.organization_id,
      actorId: user.id,
      action: `support_ticket.${state}`,
      entityType: "support_ticket",
      entityId: ticketId,
      beforeData: { state: existing.state },
      afterData: { state },
    });

    revalidatePath("/admin/support");
    revalidatePath("/dashboard/support");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

// =============================================================================
// NRE OFFICE: VERIFIED PROJECT TIMELINE UPDATES, EXPERT ASSIGNMENTS & MESSAGES
// =============================================================================
const timelineEventSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  eventType: z.string().trim().min(2).max(60).default("staff.update"),
  title: z.string().trim().min(4, "Update title must be at least 4 characters").max(160),
  detail: z.string().trim().min(5, "Update details must be at least 5 characters").max(2000),
  visibleToClient: z.boolean().default(true),
});

export async function postProjectTimelineEventAction(
  input: unknown
): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const parsed = timelineEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid timeline event." };
  }

  const { projectId, eventType, title, detail, visibleToClient } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found." };
    }

    const { data: created, error: insErr } = await supabase
      .from("project_timeline_events")
      .insert({
        project_id: project.id,
        organization_id: project.organization_id,
        event_type: eventType,
        title,
        detail,
        visible_to_client: visibleToClient,
        actor_id: user.id,
      })
      .select("id")
      .single();

    if (insErr || !created) {
      return { ok: false, error: insErr?.message ?? "Failed to publish timeline event." };
    }

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: "project_timeline.posted",
      entityType: "project_timeline_event",
      entityId: created.id,
      afterData: { projectId, eventType, title, visibleToClient },
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true, eventId: created.id };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const assignExpertSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  assigneeId: z.string().uuid("Select a verified staff member"),
  roleLabel: z.string().trim().min(2, "Role label must be at least 2 characters").max(80),
});

export async function assignProjectExpertAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = assignExpertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid assignment." };
  }

  const { projectId, assigneeId, roleLabel } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const [{ data: project }, { data: staffProfile }] = await Promise.all([
      supabase.from("projects").select("id, organization_id").eq("id", projectId).single(),
      supabase.from("profiles").select("id, full_name, is_staff").eq("id", assigneeId).single(),
    ]);

    if (!project) return { ok: false, error: "Project not found." };
    if (!staffProfile || !staffProfile.is_staff) {
      return { ok: false, error: "Only verified staff profiles may be assigned as human project experts." };
    }

    const { error: upsertErr } = await supabase.from("project_assignments").upsert(
      {
        project_id: project.id,
        organization_id: project.organization_id,
        assignee_id: staffProfile.id,
        role_label: roleLabel,
        assigned_by: user.id,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,assignee_id,role_label" },
    );

    if (upsertErr) {
      return { ok: false, error: upsertErr.message };
    }

    await supabase.from("project_timeline_events").insert({
      project_id: project.id,
      organization_id: project.organization_id,
      event_type: "project.expert_assigned",
      title: `Assigned ${roleLabel}`,
      detail: `${staffProfile.full_name || "NotRealEngine Specialist"} assigned to this project as ${roleLabel}.`,
      visible_to_client: true,
      actor_id: user.id,
    });

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: "project_assignment.created",
      entityType: "project",
      entityId: project.id,
      afterData: { assigneeId, roleLabel },
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function removeProjectExpertAction(input: {
  assignmentId: string;
  projectId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z
    .object({ assignmentId: z.string().uuid(), projectId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment ID." };

  try {
    const { supabase, user } = await requireAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("project_assignments")
      .select("id, organization_id, project_id, role_label, assignee_id")
      .eq("id", parsed.data.assignmentId)
      .single();

    if (fetchErr || !existing) return { ok: false, error: "Assignment not found." };

    const { error: updErr } = await supabase
      .from("project_assignments")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updErr) return { ok: false, error: updErr.message };

    await recordServerAuditLog({
      organizationId: existing.organization_id,
      actorId: user.id,
      action: "project_assignment.deactivated",
      entityType: "project_assignment",
      entityId: existing.id,
      afterData: { projectId: existing.project_id, assigneeId: existing.assignee_id, roleLabel: existing.role_label },
    });

    revalidatePath(`/admin/projects/${existing.project_id}`);
    revalidatePath(`/dashboard/projects/${existing.project_id}`);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const adminProjectMessageSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  body: z.string().trim().min(2, "Message cannot be empty").max(4000),
  internalOnly: z.boolean().default(false),
});

export async function postAdminProjectMessageAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = adminProjectMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }

  const { projectId, body, internalOnly } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) return { ok: false, error: "Project not found." };

    const { data: msg, error: insErr } = await supabase
      .from("project_messages")
      .insert({
        project_id: project.id,
        organization_id: project.organization_id,
        author_id: user.id,
        body,
        internal_only: internalOnly,
      })
      .select("id")
      .single();

    if (insErr || !msg) return { ok: false, error: insErr?.message ?? "Failed to post message." };

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: internalOnly ? "project_message.internal_note" : "project_message.staff_reply",
      entityType: "project_message",
      entityId: msg.id,
      afterData: { projectId, internalOnly },
    });

    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}`);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// =============================================================================
// HUMAN-SUPERVISED SI ASSISTANCE (Draft -> Review -> Approve/Reject -> Apply)
// =============================================================================
const createSiDraftSchema = z.object({
  organizationId: z.string().uuid().optional().nullable(),
  entityType: z.enum(["project_brief", "quote", "project", "support_ticket"]),
  entityId: z.string().uuid("Provide a valid target record UUID"),
  suggestionKind: z.enum([
    "project_timeline_update",
    "support_response_draft",
    "scope_clarification",
    "pulse_triage_note",
  ]),
  title: z.string().trim().min(4, "Title must be at least 4 characters").max(160),
  rationale: z.string().trim().min(5, "Rationale is required").max(1000),
  draftText: z.string().trim().min(10, "Draft content must be at least 10 characters").max(4000),
  visibleToClient: z.boolean().default(true),
});

export async function createSiSuggestionDraftAction(
  input: unknown
): Promise<{ ok: true; suggestionId: string } | { ok: false; error: string }> {
  const parsed = createSiDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid SI draft." };
  }

  const data = parsed.data;
  try {
    const { supabase, user } = await requireAdmin();

    // Resolve organization_id from target entity if not supplied
    let orgId = data.organizationId || null;
    if (!orgId && data.entityType === "project") {
      const { data: proj } = await supabase
        .from("projects")
        .select("organization_id")
        .eq("id", data.entityId)
        .maybeSingle();
      orgId = proj?.organization_id ?? null;
    } else if (!orgId && data.entityType === "support_ticket") {
      const { data: tkt } = await supabase
        .from("support_tickets")
        .select("organization_id")
        .eq("id", data.entityId)
        .maybeSingle();
      orgId = tkt?.organization_id ?? null;
    }

    const { data: created, error: insErr } = await supabase
      .from("si_suggestions")
      .insert({
        organization_id: orgId,
        entity_type: data.entityType,
        entity_id: data.entityId,
        suggestion_kind: data.suggestionKind,
        title: data.title,
        rationale: data.rationale,
        draft_payload: {
          title: data.title,
          detail: data.draftText,
          visibleToClient: data.visibleToClient,
        },
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insErr || !created) {
      return { ok: false, error: insErr?.message ?? "Failed to create SI draft." };
    }

    await recordServerAuditLog({
      organizationId: orgId ?? undefined,
      actorId: user.id,
      action: "si_suggestion.draft_created",
      entityType: "si_suggestion",
      entityId: created.id,
      afterData: { entityType: data.entityType, entityId: data.entityId, suggestionKind: data.suggestionKind, status: "draft" },
    });

    revalidatePath("/admin/si");
    return { ok: true, suggestionId: created.id };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

const reviewSiSchema = z.object({
  suggestionId: z.string().uuid("Invalid suggestion ID"),
  decision: z.enum(["under_review", "approved", "rejected", "dismissed"]),
  decisionNote: z.string().trim().max(1000).optional(),
});

export async function reviewSiSuggestionAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = reviewSiSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review decision." };
  }

  const { suggestionId, decision, decisionNote } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("si_suggestions")
      .select("id, status, organization_id")
      .eq("id", suggestionId)
      .single();

    if (fetchErr || !existing) return { ok: false, error: "SI suggestion not found." };

    const currentStatus = existing.status as SiSuggestionStatus;
    if (!canTransitionSiSuggestion(currentStatus, decision)) {
      return {
        ok: false,
        error: `Cannot transition SI suggestion from "${currentStatus}" to "${decision}".`,
      };
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: decision,
      reviewed_by: user.id,
      reviewed_at: now,
      decision_note: decisionNote || null,
      updated_at: now,
    };

    if (decision === "approved") {
      patch.approved_by = user.id;
      patch.approved_at = now;
    }

    const { error: updErr } = await supabase
      .from("si_suggestions")
      .update(patch)
      .eq("id", suggestionId);

    if (updErr) return { ok: false, error: updErr.message };

    await recordServerAuditLog({
      organizationId: existing.organization_id ?? undefined,
      actorId: user.id,
      action: `si_suggestion.${decision}`,
      entityType: "si_suggestion",
      entityId: suggestionId,
      beforeData: { status: currentStatus },
      afterData: { status: decision, decisionNote: decisionNote || null },
    });

    revalidatePath("/admin/si");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function applyApprovedSiSuggestionAction(input: {
  suggestionId: string;
}): Promise<{ ok: true; appliedActionRef: string } | { ok: false; error: string }> {
  const parsed = z.object({ suggestionId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid suggestion ID." };

  try {
    const { supabase, user } = await requireAdmin();
    const { data: s, error: fetchErr } = await supabase
      .from("si_suggestions")
      .select("id, status, approved_by, organization_id, entity_type, entity_id, suggestion_kind, title, draft_payload")
      .eq("id", parsed.data.suggestionId)
      .single();

    if (fetchErr || !s) return { ok: false, error: "SI suggestion not found." };

    const gate = canExecuteAuthorizedSiAction({
      status: s.status as SiSuggestionStatus,
      approvedBy: s.approved_by,
    });
    if (!gate.allowed) {
      return { ok: false, error: gate.reason };
    }

    const payload = (s.draft_payload ?? {}) as {
      title?: string;
      detail?: string;
      visibleToClient?: boolean;
    };
    const detailText = payload.detail?.trim() || s.title;
    let appliedActionRef = `audit:${s.id}`;

    // Execute the explicitly authorized downstream write based on entity & suggestion kind
    if (s.entity_type === "project" && s.suggestion_kind === "project_timeline_update") {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, organization_id")
        .eq("id", s.entity_id)
        .single();
      if (!proj) return { ok: false, error: "Target project no longer exists." };

      const { data: evt, error: evtErr } = await supabase
        .from("project_timeline_events")
        .insert({
          project_id: proj.id,
          organization_id: proj.organization_id,
          event_type: "si.approved_update",
          title: payload.title || s.title,
          detail: detailText,
          visible_to_client: payload.visibleToClient ?? true,
          actor_id: user.id,
        })
        .select("id")
        .single();

      if (evtErr || !evt) return { ok: false, error: evtErr?.message ?? "Failed to apply timeline update." };
      appliedActionRef = `project_timeline_events:${evt.id}`;
      revalidatePath(`/admin/projects/${proj.id}`);
      revalidatePath(`/dashboard/projects/${proj.id}`);
    } else if (s.entity_type === "project") {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, organization_id")
        .eq("id", s.entity_id)
        .single();
      if (!proj) return { ok: false, error: "Target project no longer exists." };

      const { data: msg, error: msgErr } = await supabase
        .from("project_messages")
        .insert({
          project_id: proj.id,
          organization_id: proj.organization_id,
          author_id: user.id,
          body: detailText,
          internal_only: !(payload.visibleToClient ?? false),
        })
        .select("id")
        .single();

      if (msgErr || !msg) return { ok: false, error: msgErr?.message ?? "Failed to apply project message." };
      appliedActionRef = `project_messages:${msg.id}`;
      revalidatePath(`/admin/projects/${proj.id}`);
      revalidatePath(`/dashboard/projects/${proj.id}`);
    } else {
      appliedActionRef = `human_authorized:${s.entity_type}:${s.entity_id}`;
    }

    const { error: updErr } = await supabase
      .from("si_suggestions")
      .update({
        status: "applied",
        applied_action_ref: appliedActionRef,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id);

    if (updErr) return { ok: false, error: updErr.message };

    await recordServerAuditLog({
      organizationId: s.organization_id ?? undefined,
      actorId: user.id,
      action: "si_suggestion.applied",
      entityType: "si_suggestion",
      entityId: s.id,
      beforeData: { status: "approved", approvedBy: s.approved_by },
      afterData: { status: "applied", appliedActionRef, executedBy: user.id },
    });

    revalidatePath("/admin/si");
    return { ok: true, appliedActionRef };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// =============================================================================
// NRE PULSE OPERATIONS — STAFF ELIGIBILITY REVIEW & COVERAGE ASSIGNMENT
// =============================================================================
export async function updatePulseSubscriptionAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = adminPulseUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid PULSE subscription update." };
  }

  const { subscriptionId, planId, status, coverageModuleIds, scopeNotes } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();
    const { data: existing, error: fetchErr } = await supabase
      .from("pulse_subscriptions")
      .select("id, organization_id, status, plan_id")
      .eq("id", subscriptionId)
      .single();

    if (fetchErr || !existing) return { ok: false, error: "PULSE record not found." };

    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("pulse_subscriptions")
      .update({
        plan_id: planId,
        status,
        coverage_module_ids: coverageModuleIds,
        scope_notes: scopeNotes,
        billing_mode: "manual_invoicing_only",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", subscriptionId);

    if (updErr) return { ok: false, error: updErr.message };

    await recordServerAuditLog({
      organizationId: existing.organization_id,
      actorId: user.id,
      action: `pulse_subscription.${status}`,
      entityType: "pulse_subscription",
      entityId: subscriptionId,
      beforeData: { planId: existing.plan_id, status: existing.status },
      afterData: { planId, status, coverageModuleIds, billingMode: "manual_invoicing_only" },
    });

    revalidatePath("/admin/support");
    revalidatePath("/dashboard/support");
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

