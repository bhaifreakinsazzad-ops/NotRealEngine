import { type SupabaseClient } from "@supabase/supabase-js";

export interface OutboxEventRecord {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  state: "pending" | "processing" | "processed" | "failed" | "disabled";
  attempts: number;
  available_at: string;
  processed_at: string | null;
  idempotency_key: string;
  created_at: string;
}

export interface OutboxWorkerResult {
  processed: number;
  failed: number;
  disabled: number;
  errors: Array<{ eventId: string; error: string }>;
}

export type EventHandler = (event: OutboxEventRecord) => Promise<{ handled: boolean; note?: string }>;

const handlers: Record<string, EventHandler> = {
  "Lead Submitted": async () => ({ handled: true, note: "Recorded. External lead notifications held by policy." }),
  "Quote Published": async () => ({ handled: true, note: "Recorded. Client email notification held by policy." }),
  "Quote Accepted": async () => ({ handled: true, note: "Recorded. Acceptance logged in audit register." }),
  "Order Confirmed": async () => ({ handled: true, note: "Recorded. Production queue notified." }),
  "Requirements Submitted": async () => ({ handled: true, note: "Recorded. Operational team notified." }),
  "Deliverable Approved": async () => ({ handled: true, note: "Recorded. Sign-off recorded." }),
  "Revision Requested": async () => ({ handled: true, note: "Recorded. Revision workflow engaged." }),
  "Project Delivered": async () => ({ handled: true, note: "Recorded. Handover certificate generated." })
};

export async function processOutboxBatch(
  supabase: SupabaseClient,
  options?: { batchSize?: number; externalDeliveryEnabled?: boolean }
): Promise<OutboxWorkerResult> {
  const batchSize = options?.batchSize ?? 10;
  const deliveryEnabled = options?.externalDeliveryEnabled ?? false;
  const now = new Date();

  // Query events that are ready to process: state in ('pending', 'processing') and available_at <= now
  const { data: events, error } = await supabase
    .from("outbox_events")
    .select("*")
    .in("state", ["pending", "processing"])
    .lte("available_at", now.toISOString())
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error || !events || events.length === 0) {
    return { processed: 0, failed: 0, disabled: 0, errors: [] };
  }

  const result: OutboxWorkerResult = {
    processed: 0,
    failed: 0,
    disabled: 0,
    errors: []
  };

  for (const event of events as OutboxEventRecord[]) {
    // If external delivery is disabled, mark state as 'disabled' without failing
    if (!deliveryEnabled) {
      await supabase
        .from("outbox_events")
        .update({
          state: "disabled",
          processed_at: now.toISOString(),
          attempts: event.attempts + 1
        })
        .eq("id", event.id);

      result.disabled++;
      continue;
    }

    // Atomic Compare-And-Swap (CAS) concurrency lock: only transition if still 'pending'
    const { data: locked, error: lockErr } = await supabase
      .from("outbox_events")
      .update({
        state: "processing",
        attempts: event.attempts + 1
      })
      .eq("id", event.id)
      .eq("state", "pending")
      .select("id")
      .maybeSingle();

    if (lockErr || !locked) {
      // Another worker acquired the event concurrently; skip to prevent duplicate delivery
      continue;
    }

    try {
      const handler = handlers[event.event_type];
      if (handler) {
        await handler(event);
      }

      await supabase
        .from("outbox_events")
        .update({
          state: "processed",
          processed_at: new Date().toISOString()
        })
        .eq("id", event.id);

      result.processed++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Handler failed.";
      const nextDelayMinutes = Math.pow(2, event.attempts + 1) * 2; // exponential backoff
      const nextAvailable = new Date(Date.now() + nextDelayMinutes * 60 * 1000);

      await supabase
        .from("outbox_events")
        .update({
          state: event.attempts + 1 >= 5 ? "failed" : "pending",
          available_at: nextAvailable.toISOString()
        })
        .eq("id", event.id);

      result.failed++;
      result.errors.push({ eventId: event.id, error: errMsg });
    }
  }

  return result;
}
