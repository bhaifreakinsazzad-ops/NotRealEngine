import { intakeConfigured } from "./config";
import { getServiceRoleClient } from "./service";

interface AuditLogEntry {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  requestId?: string | null;
}

interface OutboxEventEntry {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  state?: "pending" | "disabled";
}

/**
 * Writes an immutable audit log entry from trusted server code.
 * public.audit_logs intentionally forbids direct client/authenticated INSERT via RLS
 * so system audit records cannot be forged from browser sessions.
 */
export async function recordServerAuditLog(entry: AuditLogEntry): Promise<void> {
  if (!intakeConfigured()) return;
  try {
    const admin = getServiceRoleClient();
    const { error } = await admin.from("audit_logs").insert({
      organization_id: entry.organizationId ?? null,
      actor_id: entry.actorId ?? null,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      before_data: entry.beforeData ?? null,
      after_data: entry.afterData ?? null,
      request_id: entry.requestId ?? null
    });
    if (error) {
      console.error("[audit_logs] Server audit insert failed:", error.message);
    }
  } catch (err) {
    console.error("[audit_logs] Unexpected server audit error:", err);
  }
}

/**
 * Enqueues an idempotent outbox event from trusted server code.
 * public.outbox_events intentionally forbids direct browser/authenticated INSERT via RLS.
 */
export async function enqueueServerOutboxEvent(entry: OutboxEventEntry): Promise<void> {
  if (!intakeConfigured()) return;
  try {
    const admin = getServiceRoleClient();
    const { error } = await admin.from("outbox_events").upsert(
      {
        aggregate_type: entry.aggregateType,
        aggregate_id: entry.aggregateId,
        event_type: entry.eventType,
        payload: entry.payload,
        state: entry.state ?? "disabled",
        idempotency_key: entry.idempotencyKey
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    );
    if (error) {
      console.error("[outbox_events] Server outbox insert failed:", error.message);
    }
  } catch (err) {
    console.error("[outbox_events] Unexpected server outbox error:", err);
  }
}
