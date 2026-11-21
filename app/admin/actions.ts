"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { type ProjectState, canTransition, projectTransitions } from "@/lib/domain/states";
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
      .select("id, project_id")
      .single();

    if (updErr || !updatedMilestone) {
      return { ok: false, error: updErr?.message ?? "Milestone not found." };
    }

    await recordServerAuditLog({
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
  state: z.enum(["open", "in_progress", "waiting_client", "resolved", "closed"]),
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

