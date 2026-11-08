import crypto from "crypto";
import { type SupabaseClient } from "@supabase/supabase-js";
import { type VerifiedPaymentEvent, verifiedPaymentEventSchema } from "./types";
import { canTransition, orderTransitions } from "@/lib/domain/states";

export type PaymentProcessResult =
  | { success: true; orderId: string; transactionId: string; duplicate?: boolean }
  | { success: false; error: string; code: "INVALID_EVENT" | "ORDER_MISMATCH" | "TRANSITION_FAILED" | "DB_ERROR" };

export async function processPaymentWebhook(
  supabase: SupabaseClient,
  rawEvent: unknown
): Promise<PaymentProcessResult> {
  const parsed = verifiedPaymentEventSchema.safeParse(rawEvent);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid payment webhook schema",
      code: "INVALID_EVENT"
    };
  }

  const event: VerifiedPaymentEvent = parsed.data;

  // Compute hash of the payload for tamper evidence
  const payloadHash = crypto.createHash("sha256").update(JSON.stringify(event.rawEvent)).digest("hex");

  // 1. Idempotent deduplication in webhook_events table
  const { error: dedupeErr } = await supabase.from("webhook_events").insert({
    provider: event.provider,
    provider_event_id: event.providerEventId,
    payload_hash: payloadHash,
    state: "verified"
  });

  if (dedupeErr) {
    // Unique violation indicates duplicate / replayed webhook
    if (dedupeErr.code === "23505" || dedupeErr.message.includes("unique")) {
      return {
        success: true,
        orderId: event.orderId,
        transactionId: event.transactionId,
        duplicate: true
      };
    }
  }

  // 2. Fetch order to verify amount, currency, and organization
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, state, total_minor, currency, organization_id")
    .eq("id", event.orderId)
    .single();

  if (orderErr || !order) {
    return {
      success: false,
      error: `Order ${event.orderId} not found.`,
      code: "ORDER_MISMATCH"
    };
  }

  // Currency and Amount validation (strict integer minor units)
  if (order.currency !== event.currency || order.total_minor !== event.amountMinor) {
    return {
      success: false,
      error: `Payment amount (${event.currency} ${event.amountMinor}) does not match order requirement (${order.currency} ${order.total_minor}).`,
      code: "ORDER_MISMATCH"
    };
  }

  // 3. Insert or update payment transaction record
  const now = new Date().toISOString();
  const { data: transaction, error: txErr } = await supabase
    .from("payment_transactions")
    .insert({
      order_id: order.id,
      organization_id: order.organization_id,
      provider: event.provider,
      provider_event_id: event.providerEventId,
      provider_transaction_id: event.transactionId,
      state: event.status,
      amount_minor: event.amountMinor,
      currency: event.currency,
      verified_at: event.status === "paid" ? now : null,
      raw_event: event.rawEvent
    })
    .select("id")
    .single();

  if (txErr) {
    return {
      success: false,
      error: `Failed to insert payment transaction: ${txErr.message}`,
      code: "DB_ERROR"
    };
  }

  // 4. If payment succeeded, transition order state to confirmed
  if (event.status === "paid") {
    if (canTransition(order.state, "confirmed", orderTransitions)) {
      const { error: updErr } = await supabase
        .from("orders")
        .update({ state: "confirmed", updated_at: now })
        .eq("id", order.id);

      if (updErr) {
        return {
          success: false,
          error: `Order state update failed: ${updErr.message}`,
          code: "TRANSITION_FAILED"
        };
      }

      // Enqueue Outbox Event
      await supabase.from("outbox_events").insert({
        aggregate_type: "order",
        aggregate_id: order.id,
        event_type: "Order Confirmed",
        payload: {
          orderId: order.id,
          organizationId: order.organization_id,
          transactionId: transaction.id,
          provider: event.provider
        },
        state: "disabled",
        idempotency_key: `order-confirmed:${order.id}`
      });

      // Append Audit Log
      await supabase.from("audit_logs").insert({
        organization_id: order.organization_id,
        action: "order.confirmed_by_payment",
        entity_type: "order",
        entity_id: order.id,
        after_data: {
          transactionId: transaction.id,
          amountMinor: event.amountMinor,
          provider: event.provider
        }
      });
    }
  }

  // Mark webhook event processed
  await supabase
    .from("webhook_events")
    .update({ state: "processed", processed_at: now })
    .eq("provider", event.provider)
    .eq("provider_event_id", event.providerEventId);

  return {
    success: true,
    orderId: order.id,
    transactionId: transaction.id
  };
}
