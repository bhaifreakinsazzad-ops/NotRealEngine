"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { type OrderState, canTransition, orderTransitions } from "@/lib/domain/states";

const updateOrderStateSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  nextState: z.enum([
    "draft",
    "awaiting_acceptance",
    "awaiting_payment",
    "confirmed",
    "in_production",
    "completed",
    "cancelled",
    "on_hold"
  ])
});

export async function updateOrderStateAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateOrderStateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order data." };
  }

  const { orderId, nextState } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, state, organization_id, total_minor, currency")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return { ok: false, error: "Order not found." };
    }

    if (!canTransition(order.state as OrderState, nextState as OrderState, orderTransitions)) {
      return { ok: false, error: `Invalid transition from ${order.state} to ${nextState}.` };
    }

    const { error: updateErr } = await supabase
      .from("orders")
      .update({ state: nextState, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    if (nextState === "confirmed") {
      await supabase.from("outbox_events").insert({
        aggregate_type: "order",
        aggregate_id: orderId,
        event_type: "Order Confirmed",
        payload: { orderId, organizationId: order.organization_id, totalMinor: order.total_minor },
        state: "disabled",
        idempotency_key: `order-confirmed:${orderId}`
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: order.organization_id,
      actor_id: user.id,
      action: `order.${nextState}`,
      entity_type: "order",
      entity_id: orderId,
      before_data: { state: order.state },
      after_data: { state: nextState }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/dashboard/orders");

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error updating order.";
    return { ok: false, error: message };
  }
}

export async function initializeProjectFromOrderAction(
  orderId: string
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireAdmin();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        organization_id,
        state,
        commercial_snapshot,
        quotes (
          service_id: project_brief_id,
          project_briefs (
            service_id
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return { ok: false, error: "Order not found." };
    }

    // Verify project does not already exist
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingProject) {
      return { ok: true, projectId: existingProject.id };
    }

    // Determine service_id and revision_limit
    const snapshot = (order.commercial_snapshot as Record<string, unknown>) || {};
    const briefServiceId = (order.quotes as unknown as { project_briefs?: { service_id?: string } })
      ?.project_briefs?.service_id;
    const serviceId =
      briefServiceId ||
      (typeof snapshot.serviceId === "string" ? snapshot.serviceId : "custom-software-full-stack-development");
    const revisionLimit = typeof snapshot.revisionLimit === "number" ? snapshot.revisionLimit : 2;

    // Insert Project
    const { data: newProject, error: projErr } = await supabase
      .from("projects")
      .insert({
        order_id: orderId,
        organization_id: order.organization_id,
        service_id: serviceId,
        state: "awaiting_requirements",
        revision_limit: revisionLimit,
        revision_count: 0
      })
      .select("id")
      .single();

    if (projErr || !newProject) {
      return { ok: false, error: projErr?.message ?? "Failed to initialize project record." };
    }

    const projectId = newProject.id;

    // Seed default standard project requirements
    await supabase.from("project_requirements").insert([
      {
        project_id: projectId,
        key: "brand_assets",
        label: "Brand Assets & Identity (Logos, Vectors, Color Palette, Brand Guide)",
        required: true
      },
      {
        project_id: projectId,
        key: "content_copy",
        label: "Primary Content Copy, Offer Descriptions, and Media Files",
        required: true
      },
      {
        project_id: projectId,
        key: "infrastructure_credentials",
        label: "Hosting / DNS / Domain Access Requirements",
        required: false
      }
    ]);

    // Seed default milestones
    await supabase.from("milestones").insert([
      {
        project_id: projectId,
        label: "Requirement Verification & Technical Architecture",
        state: "pending",
        display_order: 1
      },
      {
        project_id: projectId,
        label: "Core Module Implementation & Integration",
        state: "pending",
        display_order: 2
      },
      {
        project_id: projectId,
        label: "Internal Security & QA Validation",
        state: "pending",
        display_order: 3
      },
      {
        project_id: projectId,
        label: "Client UAT & Sign-off Review",
        state: "pending",
        display_order: 4
      },
      {
        project_id: projectId,
        label: "Production Deployment & Handover",
        state: "pending",
        display_order: 5
      }
    ]);

    // Enqueue outbox event
    await supabase.from("outbox_events").insert({
      aggregate_type: "project",
      aggregate_id: projectId,
      event_type: "Project Created",
      payload: { projectId, orderId, organizationId: order.organization_id, serviceId },
      state: "disabled",
      idempotency_key: `project-created:${projectId}`
    });

    // Record audit log
    await supabase.from("audit_logs").insert({
      organization_id: order.organization_id,
      actor_id: user.id,
      action: "project.initialized",
      entity_type: "project",
      entity_id: projectId,
      after_data: { orderId, serviceId, revisionLimit }
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/admin/projects");
    revalidatePath("/dashboard/projects");

    return { ok: true, projectId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error initializing project.";
    return { ok: false, error: message };
  }
}
