"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { type ProjectState, canTransition, projectTransitions } from "@/lib/domain/states";
import { enqueueServerOutboxEvent, recordServerAuditLog } from "@/lib/supabase/server-events";

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

    const { data: updatedReq, error: updateErr } = await supabase
      .from("project_requirements")
      .update({
        response,
        submitted_by: user.id,
        submitted_at: new Date().toISOString()
      })
      .eq("project_id", projectId)
      .eq("key", key)
      .select("id")
      .maybeSingle();

    if (updateErr || !updatedReq) {
      return { ok: false, error: updateErr?.message ?? "Requirement item not found." };
    }

    // Check if all required items are answered
    const { data: allReqs } = await supabase
      .from("project_requirements")
      .select("required, response")
      .eq("project_id", projectId);

    const allRequiredSubmitted = Boolean(allReqs?.every((r) => !r.required || r.response !== null));

    if (allRequiredSubmitted && canTransition(project.state as ProjectState, "requirements_review", projectTransitions)) {
      const { error: stateErr } = await supabase
        .from("projects")
        .update({ state: "requirements_review", updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (stateErr) {
        return { ok: false, error: stateErr.message };
      }

      await enqueueServerOutboxEvent({
        aggregateType: "project",
        aggregateId: projectId,
        eventType: "Requirements Submitted",
        payload: { projectId, organizationId: project.organization_id },
        idempotencyKey: `requirements-submitted:${projectId}`
      });
    }

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: "requirement.submitted",
      entityType: "project_requirement",
      entityId: `${projectId}:${key}`,
      afterData: { response }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/requirements`);
    revalidatePath(`/admin/projects/${projectId}`);
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

    if (decision === "approved" && !canTransition(project.state as ProjectState, "approved", projectTransitions)) {
      return {
        ok: false,
        error: `Final deliverable approval is only allowed when the project is in client review (current state: "${project.state}").`
      };
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
      const { error: stateErr } = await supabase
        .from("projects")
        .update({ state: "approved", updated_at: new Date().toISOString() })
        .eq("id", projectId);

      if (stateErr) {
        return { ok: false, error: stateErr.message };
      }

      await enqueueServerOutboxEvent({
        aggregateType: "project",
        aggregateId: projectId,
        eventType: "Deliverable Approved",
        payload: { projectId, organizationId: project.organization_id, decidedBy: user.id },
        idempotencyKey: `deliverable-approved:${projectId}`
      });
    }

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: `approval.${decision}`,
      entityType: "project",
      entityId: projectId,
      afterData: { decision, note }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/review`);
    revalidatePath(`/admin/projects/${projectId}`);
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

    if (!canTransition(project.state as ProjectState, "revision", projectTransitions)) {
      return {
        ok: false,
        error: `Revisions can only be requested while the project is in client review (current state: "${project.state}").`
      };
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
    const { error: projUpdErr } = await supabase
      .from("projects")
      .update({
        revision_count: nextSequence,
        state: "revision",
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (projUpdErr) {
      return { ok: false, error: projUpdErr.message };
    }

    await enqueueServerOutboxEvent({
      aggregateType: "project",
      aggregateId: projectId,
      eventType: "Revision Requested",
      payload: { projectId, organizationId: project.organization_id, sequence: nextSequence },
      idempotencyKey: `revision-requested:${projectId}:${nextSequence}`
    });

    await recordServerAuditLog({
      organizationId: project.organization_id,
      actorId: user.id,
      action: "revision.requested",
      entityType: "revision_request",
      entityId: `${projectId}:${nextSequence}`,
      afterData: { sequence: nextSequence, request }
    });

    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/dashboard/projects/${projectId}/review`);
    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error submitting revision.";
    return { ok: false, error: message };
  }
}

const registerFileSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
  storagePath: z.string().min(1).max(500),
  originalName: z.string().min(1).max(255),
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

  // Enforce storage path security: must strictly be `${projectId}/<safe-filename>`
  const expectedPrefix = `${projectId}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Storage path traversal violation: path must start with project ID." };
  }

  const relativeFilename = storagePath.slice(expectedPrefix.length);
  if (
    relativeFilename.includes("..") ||
    relativeFilename.includes("/") ||
    relativeFilename.includes("\\") ||
    relativeFilename.includes("\0") ||
    !/^[a-zA-Z0-9_\-\.]+$/.test(relativeFilename)
  ) {
    return { ok: false, error: "Unsafe storage path characters or path traversal sequence detected." };
  }

  // Sanitize originalName
  const sanitizedOriginalName = originalName.replace(/[\/\x00-\x1f\x7f-\x9f]/g, "_").trim();
  if (!sanitizedOriginalName) {
    return { ok: false, error: "Invalid original file name." };
  }

  try {
    const { supabase, user } = await requireUser();

    // Verify project exists and belongs to the specified organization
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return { ok: false, error: "Project not found or you lack access permission." };
    }

    if (project.organization_id !== organizationId) {
      return { ok: false, error: "Project and organization mismatch." };
    }

    // Verify user is member of organization or staff
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_staff")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_staff) {
        return { ok: false, error: "You are not a member of this organization." };
      }
    }

    const { data: fileRecord, error: insErr } = await supabase
      .from("project_files")
      .insert({
        project_id: projectId,
        organization_id: organizationId,
        storage_path: storagePath,
        original_name: sanitizedOriginalName,
        mime_type: mimeType,
        size_bytes: sizeBytes,
        uploaded_by: user.id
      })
      .select("id")
      .single();

    if (insErr || !fileRecord) {
      return { ok: false, error: insErr?.message ?? "Failed to register project file record." };
    }

    await recordServerAuditLog({
      organizationId,
      actorId: user.id,
      action: "file.uploaded",
      entityType: "project_file",
      entityId: fileRecord.id,
      afterData: { storagePath, originalName: sanitizedOriginalName, mimeType, sizeBytes }
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

    // Verify user is member of organization or staff
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_staff")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_staff) {
        return { ok: false, error: "You are not a member of this organization." };
      }
    }

    // If projectId is provided, verify it belongs to this organization
    if (projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, organization_id")
        .eq("id", projectId)
        .single();

      if (!proj || proj.organization_id !== organizationId) {
        return { ok: false, error: "Associated project does not belong to your organization." };
      }
    }

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

    await recordServerAuditLog({
      organizationId,
      actorId: user.id,
      action: "ticket.created",
      entityType: "support_ticket",
      entityId: ticket.id,
      afterData: { subject, priority }
    });

    revalidatePath("/dashboard/support");
    return { ok: true, ticketId: ticket.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(120),
  phone: z.string().trim().max(40).optional().nullable()
});

export async function updateProfileAction(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };
  }

  const { fullName, phone } = parsed.data;

  try {
    const { supabase, user } = await requireUser();

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (updErr) {
      return { ok: false, error: updErr.message };
    }

    await recordServerAuditLog({
      actorId: user.id,
      action: "profile.updated",
      entityType: "profile",
      entityId: user.id,
      afterData: { fullName, phone: phone || null }
    });

    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error updating profile.";
    return { ok: false, error: message };
  }
}
