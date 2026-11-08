"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { services } from "@/lib/catalog";
import { type OrderState, canTransition, orderTransitions } from "@/lib/domain/states";

const canonicalServiceMap = new Map<string, string>();
for (const s of services) {
  canonicalServiceMap.set(s.id, s.id);
  canonicalServiceMap.set(s.slug, s.id);
}

const manualSettlementSchema = z.object({
  reference: z.string().trim().min(4, "Settlement reference must be at least 4 characters").max(160),
  method: z
    .enum([
      "bank_transfer",
      "corporate_po",
      "deferred_milestone_agreement",
      "staging_clearance",
      "staging_test_clearance"
    ])
    .default("bank_transfer"),
  note: z.string().trim().max(1000).optional()
});

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
  ]),
  manualSettlement: manualSettlementSchema.optional()
});

export async function updateOrderStateAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateOrderStateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order data." };
  }

  const { orderId, nextState, manualSettlement } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, state, organization_id, total_minor, currency, commercial_snapshot")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return { ok: false, error: "Order not found." };
    }

    if (!canTransition(order.state as OrderState, nextState as OrderState, orderTransitions)) {
      return { ok: false, error: `Invalid transition from ${order.state} to ${nextState}.` };
    }

    const currentSnapshot = (order.commercial_snapshot as Record<string, unknown>) || {};
    let nextSnapshot = currentSnapshot;
    let clearanceMode: "verified_payment" | "approved_manual_settlement" | "none" = "none";

    // Enforce financial clearance before allowing transition to confirmed, in_production, or completed
    if (["confirmed", "in_production", "completed"].includes(nextState)) {
      const { data: paidTx } = await supabase
        .from("payment_transactions")
        .select("id, verified_at")
        .eq("order_id", orderId)
        .eq("state", "paid")
        .not("verified_at", "is", null)
        .limit(1);

      const hasVerifiedPayment = Boolean(paidTx && paidTx.length > 0);
      const existingSettlement = currentSnapshot.settlement as
        | { status?: string; reference?: string; approvedBy?: string }
        | undefined;
      const hasExistingSettlement =
        existingSettlement?.status === "approved_manual_settlement" &&
        Boolean(existingSettlement.reference?.trim()) &&
        Boolean(existingSettlement.approvedBy?.trim());

      if (hasVerifiedPayment) {
        clearanceMode = "verified_payment";
      } else if (hasExistingSettlement) {
        clearanceMode = "approved_manual_settlement";
      } else if (manualSettlement) {
        clearanceMode = "approved_manual_settlement";
        nextSnapshot = {
          ...currentSnapshot,
          settlement: {
            status: "approved_manual_settlement",
            reference: manualSettlement.reference,
            method: manualSettlement.method,
            note: manualSettlement.note ?? null,
            approvedBy: user.id,
            approvedAt: new Date().toISOString()
          }
        };
      } else {
        return {
          ok: false,
          error:
            "Financial clearance required: An unpaid order cannot be confirmed or moved to production without a verified payment transaction or an explicit approved manual settlement reference."
        };
      }
    }

    // If transitioning to in_production, also verify that a project workspace has been provisioned
    if (nextState === "in_production") {
      const { data: linkedProj } = await supabase
        .from("projects")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (!linkedProj) {
        return {
          ok: false,
          error: "Cannot move order to In Production before initializing the dedicated Project Workspace."
        };
      }
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        state: nextState,
        commercial_snapshot: nextSnapshot,
        updated_at: nowIso
      })
      .eq("id", orderId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    if (nextState === "confirmed") {
      await supabase.from("outbox_events").insert({
        aggregate_type: "order",
        aggregate_id: orderId,
        event_type: "Order Confirmed",
        payload: {
          orderId,
          organizationId: order.organization_id,
          totalMinor: order.total_minor,
          clearanceMode
        },
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
      after_data: {
        state: nextState,
        clearanceMode,
        manualSettlement: manualSettlement ?? null
      }
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

    // 1. Fetch order and linked quote/brief to validate eligibility and service identity
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        organization_id,
        state,
        commercial_snapshot,
        quotes (
          project_brief_id,
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

    // 2. Check idempotency first: if project already exists for this order, return it without duplicating
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingProject) {
      return { ok: true, projectId: existingProject.id };
    }

    // 3. Enforce order state & financial clearance eligibility before project provisioning
    if (order.state !== "confirmed" && order.state !== "in_production") {
      return {
        ok: false,
        error: `Order must be in "confirmed" state before initializing a project workspace (current state: "${order.state}").`
      };
    }

    const snapshot = (order.commercial_snapshot as Record<string, unknown>) || {};
    const settlement = snapshot.settlement as { status?: string; reference?: string } | undefined;
    const hasApprovedSettlement =
      settlement?.status === "approved_manual_settlement" && Boolean(settlement.reference?.trim());

    if (!hasApprovedSettlement) {
      const { data: paidTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("order_id", orderId)
        .eq("state", "paid")
        .not("verified_at", "is", null)
        .limit(1);

      if (!paidTx || paidTx.length === 0) {
        return {
          ok: false,
          error:
            "Order lacks financial clearance: a verified payment transaction or approved manual settlement is required before project provisioning."
        };
      }
    }

    // 4. Resolve canonical service_id strictly — NEVER substitute an unrelated fallback service!
    const briefServiceId = (order.quotes as unknown as { project_briefs?: { service_id?: string } })
      ?.project_briefs?.service_id;
    const snapshotServiceId = typeof snapshot.serviceId === "string" ? snapshot.serviceId.trim() : "";
    const candidateServiceRef = (briefServiceId || snapshotServiceId || "").trim();
    const resolvedServiceId = canonicalServiceMap.get(candidateServiceRef);

    if (!resolvedServiceId) {
      return {
        ok: false,
        error: `Invalid or missing canonical service reference ("${candidateServiceRef || "none"}"). Cannot provision project workspace without a verified service identity.`
      };
    }

    const revisionLimit = typeof snapshot.revisionLimit === "number" ? snapshot.revisionLimit : 2;

    const dbWriter =
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
          })
        : supabase;

    // 5. Prefer atomic PostgreSQL RPC initialize_project_from_order when deployed (Migration 0005)
    const { data: rpcProjectId, error: rpcErr } = await supabase.rpc("initialize_project_from_order", {
      p_order_id: orderId,
      p_service_id: resolvedServiceId
    });

    if (!rpcErr && rpcProjectId) {
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath(`/orders/${orderId}`);
      revalidatePath("/admin/projects");
      revalidatePath("/dashboard/projects");
      return { ok: true, projectId: rpcProjectId as string };
    }

    if (rpcErr && !rpcErr.message.includes("does not exist") && !rpcErr.message.includes("schema cache")) {
      return { ok: false, error: rpcErr.message };
    }

    // 6. Transactional Compensating Fallback (if RPC is not yet in schema cache):
    // Checks every insert error and rolls back the created project row if any child insert fails!
    const { data: newProject, error: projErr } = await dbWriter
      .from("projects")
      .insert({
        order_id: orderId,
        organization_id: order.organization_id,
        service_id: resolvedServiceId,
        state: "awaiting_requirements",
        revision_limit: revisionLimit,
        revision_count: 0
      })
      .select("id")
      .single();

    if (projErr || !newProject) {
      // Handle concurrent initialization race on UNIQUE(order_id)
      if (projErr?.code === "23505") {
        const { data: racedProject } = await supabase
          .from("projects")
          .select("id")
          .eq("order_id", orderId)
          .maybeSingle();
        if (racedProject) {
          return { ok: true, projectId: racedProject.id };
        }
      }
      return { ok: false, error: projErr?.message ?? "Failed to initialize project record." };
    }

    const projectId = newProject.id;

    try {
      const { error: reqErr } = await dbWriter.from("project_requirements").insert([
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
      if (reqErr) {
        throw new Error(`Failed to seed project requirements: ${reqErr.message}`);
      }

      const { error: msErr } = await dbWriter.from("milestones").insert([
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
      if (msErr) {
        throw new Error(`Failed to seed project milestones: ${msErr.message}`);
      }

      const { error: outboxErr } = await dbWriter.from("outbox_events").insert({
        aggregate_type: "project",
        aggregate_id: projectId,
        event_type: "Project Created",
        payload: { projectId, orderId, organizationId: order.organization_id, serviceId: resolvedServiceId },
        state: "disabled",
        idempotency_key: `project-created:${projectId}`
      });
      if (outboxErr && outboxErr.code !== "23505") {
        throw new Error(`Failed to enqueue project outbox event: ${outboxErr.message}`);
      }

      const { error: auditErr } = await dbWriter.from("audit_logs").insert({
        organization_id: order.organization_id,
        actor_id: user.id,
        action: "project.initialized",
        entity_type: "project",
        entity_id: projectId,
        after_data: { orderId, serviceId: resolvedServiceId, revisionLimit }
      });
      if (auditErr) {
        throw new Error(`Failed to record project initialization audit log: ${auditErr.message}`);
      }
    } catch (stepErr: unknown) {
      // Compensating rollback so partially initialized projects never remain in database
      await dbWriter.from("projects").delete().eq("id", projectId);
      const reason = stepErr instanceof Error ? stepErr.message : "Project initialization failed.";
      return { ok: false, error: reason };
    }

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
