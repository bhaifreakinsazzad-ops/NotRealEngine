"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const submitRequirementSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  key: z.string().min(1),
  response: z.record(z.string(), z.unknown())
});

export async function submitRequirementAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = submitRequirementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid requirement response." };
  }

  const { projectId, key, response } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    // Verify user membership in project organization
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id, state")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found or unauthorized." };
    }

    const { error: updateErr } = await supabase
      .from("project_requirements")
      .update({
        response,
        submitted_by: user.id,
        submitted_at: new Date().toISOString()
      })
      .eq("project_id", projectId)
      .eq("key", key);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    // Check if all required items are answered
    const { data: allReqs } = await supabase
      .from("project_requirements")
      .select("required, response")
      .eq("project_id", projectId);

    const allRequiredSubmitted = allReqs?.every((r) => !r.required || r.response !== null);

    if (allRequiredSubmitted && project.state === "awaiting_requirements") {
      await supabase
        .from("projects")
        .update({ state: "requirements_review", updated_at: new Date().toISOString() })
        .eq("id", projectId);

      await supabase.from("outbox_events").insert({
        aggregate_type: "project",
        aggregate_id: projectId,
        event_type: "Requirements Submitted",
        payload: { projectId, organizationId: project.organization_id },
        state: "disabled",
        idempotency_key: `requirements-submitted:${projectId}`
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: project.organization_id,
      actor_id: user.id,
      action: "requirement.submitted",
      entity_type: "project_requirement",
      entity_id: `${projectId}:${key}`,
      after_data: { response }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/requirements`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error submitting requirement.";
    return { ok: false, error: message };
  }
}

const approvalSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().max(2000).optional()
});

export async function submitApprovalAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid approval submission." };
  }

  const { projectId, decision, note } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id, state")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found." };
    }

    const { error: insErr } = await supabase.from("approvals").insert({
      project_id: projectId,
      organization_id: project.organization_id,
      kind: "milestone_acceptance",
      decision,
      decided_by: user.id,
      note: note || null
    });

    if (insErr) {
      return { ok: false, error: insErr.message };
    }

    if (decision === "approved" && project.state === "client_review") {
      await supabase
        .from("projects")
        .update({ state: "approved", updated_at: new Date().toISOString() })
        .eq("id", projectId);

      await supabase.from("outbox_events").insert({
        aggregate_type: "project",
        aggregate_id: projectId,
        event_type: "Deliverable Approved",
        payload: { projectId, organizationId: project.organization_id, decidedBy: user.id },
        state: "disabled",
        idempotency_key: `deliverable-approved:${projectId}`
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: project.organization_id,
      actor_id: user.id,
      action: `approval.${decision}`,
      entity_type: "project",
      entity_id: projectId,
      after_data: { decision, note }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/review`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const revisionSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  request: z.string().min(10, "Revision request must be at least 10 characters").max(5000)
});

export async function requestRevisionAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = revisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid revision request." };
  }

  const { projectId, request } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id, state, revision_limit, revision_count")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found." };
    }

    if (project.revision_count >= project.revision_limit) {
      return {
        ok: false,
        error: `Revision limit reached (${project.revision_count}/${project.revision_limit}). Out-of-scope change requests require an approved change order.`
      };
    }

    const nextSequence = project.revision_count + 1;

    const { error: revErr } = await supabase.from("revision_requests").insert({
      project_id: projectId,
      organization_id: project.organization_id,
      requested_by: user.id,
      sequence: nextSequence,
      request,
      state: "submitted"
    });

    if (revErr) {
      return { ok: false, error: revErr.message };
    }

    // Increment revision_count and transition state
    await supabase
      .from("projects")
      .update({
        revision_count: nextSequence,
        state: "revision",
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    await supabase.from("outbox_events").insert({
      aggregate_type: "project",
      aggregate_id: projectId,
      event_type: "Revision Requested",
      payload: { projectId, organizationId: project.organization_id, sequence: nextSequence },
      state: "disabled",
      idempotency_key: `revision-requested:${projectId}:${nextSequence}`
    });

    await supabase.from("audit_logs").insert({
      organization_id: project.organization_id,
      actor_id: user.id,
      action: "revision.requested",
      entity_type: "revision_request",
      entity_id: `${projectId}:${nextSequence}`,
      after_data: { sequence: nextSequence, request }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/review`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error submitting revision.";
    return { ok: false, error: message };
  }
}

const registerFileSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  storagePath: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.enum([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
    "application/zip"
  ]),
  sizeBytes: z.number().int().positive().max(52428800, "File exceeds 50MB limit")
});

export async function registerUploadedFileAction(
  input: unknown
): Promise<{ ok: true; fileId: string } | { ok: false; error: string }> {
  const parsed = registerFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid file metadata." };
  }

  const { projectId, organizationId, storagePath, originalName, mimeType, sizeBytes } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    const { data: fileRecord, error: insErr } = await supabase
      .from("project_files")
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        storage_path: storagePath,
        original_name: originalName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        uploaded_by: user.id
      })
      .select("id")
      .single();

    if (insErr || !fileRecord) {
      return { ok: false, error: insErr?.message ?? "Failed to register project file record." };
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "file.uploaded",
      entity_type: "project_file",
      entity_id: fileRecord.id,
      after_data: { storagePath, originalName, mimeType, sizeBytes }
    });

    revalidatePath(`/dashboard/projects/${projectId}/files`);
    return { ok: true, fileId: fileRecord.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const createTicketSchema = z.object({
  organizationId: z.string().uuid("Invalid organization ID"),
  projectId: z.string().uuid().optional().nullable(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  body: z.string().min(15, "Ticket description must be at least 15 characters").max(5000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal")
});

export async function createSupportTicketAction(
  input: unknown
): Promise<{ ok: true; ticketId: string } | { ok: false; error: string }> {
  const parsed = createTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid ticket details." };
  }

  const { organizationId, projectId, subject, body, priority } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        organization_id: organizationId,
        project_id: projectId || null,
        opened_by: user.id,
        subject,
        body,
        priority,
        state: "open"
      })
      .select("id")
      .single();

    if (ticketErr || !ticket) {
      return { ok: false, error: ticketErr?.message ?? "Failed to create support ticket." };
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: "ticket.created",
      entity_type: "support_ticket",
      entity_id: ticket.id,
      after_data: { subject, priority }
    });

    revalidatePath("/dashboard/support");
    return { ok: true, ticketId: ticket.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}
