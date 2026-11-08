import { describe, expect, it, vi } from "vitest";
import { processOutboxBatch, type OutboxEventRecord } from "@/lib/integrations/outbox-worker";
import { type SupabaseClient } from "@supabase/supabase-js";

describe("Outbox Worker", () => {
  it("returns zero counts when no events are pending", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseClient;

    const result = await processOutboxBatch(mockSupabase);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.disabled).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("marks events as disabled when external delivery is disabled", async () => {
    const mockEvent: OutboxEventRecord = {
      id: "ev-1",
      aggregate_type: "quotes",
      aggregate_id: "q-123",
      event_type: "Quote Published",
      payload: {},
      state: "pending",
      attempts: 0,
      available_at: new Date(Date.now() - 1000).toISOString(),
      processed_at: null,
      idempotency_key: "idemp-1",
      created_at: new Date().toISOString()
    };

    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: "ev-2" }, error: null });
    chain.then = (resolve: (val: unknown) => unknown) => resolve({ error: null });

    const updateMock = vi.fn().mockReturnValue(chain);

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
                })
              })
            })
          })
        }),
        update: updateMock
      })
    } as unknown as SupabaseClient;

    const result = await processOutboxBatch(mockSupabase, { externalDeliveryEnabled: false });

    expect(result.disabled).toBe(1);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "disabled",
        attempts: 1
      })
    );
  });

  it("processes events when delivery is enabled and handler succeeds", async () => {
    const mockEvent: OutboxEventRecord = {
      id: "ev-2",
      aggregate_type: "leads",
      aggregate_id: "lead-456",
      event_type: "Lead Submitted",
      payload: { name: "Alice" },
      state: "pending",
      attempts: 0,
      available_at: new Date(Date.now() - 1000).toISOString(),
      processed_at: null,
      idempotency_key: "idemp-2",
      created_at: new Date().toISOString()
    };

    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { id: "ev-2" }, error: null });
    chain.then = (resolve: (val: unknown) => unknown) => resolve({ error: null });

    const updateMock = vi.fn().mockReturnValue(chain);

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
                })
              })
            })
          })
        }),
        update: updateMock
      })
    } as unknown as SupabaseClient;

    const result = await processOutboxBatch(mockSupabase, { externalDeliveryEnabled: true });

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.disabled).toBe(0);
  });

  it("skips event when another concurrent worker acquired CAS lock", async () => {
    const mockEvent: OutboxEventRecord = {
      id: "ev-3",
      aggregate_type: "quotes",
      aggregate_id: "q-789",
      event_type: "Quote Accepted",
      payload: {},
      state: "pending",
      attempts: 0,
      available_at: new Date(Date.now() - 1000).toISOString(),
      processed_at: null,
      idempotency_key: "idemp-3",
      created_at: new Date().toISOString()
    };

    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.select = vi.fn().mockReturnValue(chain);
    // Simulating race condition: another worker updated the row first, so CAS returns null
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.then = (resolve: (val: unknown) => unknown) => resolve({ error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              lt: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [mockEvent], error: null })
                })
              })
            })
          })
        }),
        update: vi.fn().mockReturnValue(chain)
      })
    } as unknown as SupabaseClient;

    const result = await processOutboxBatch(mockSupabase, { externalDeliveryEnabled: true });

    // Skipped safely, not marked processed, failed, or disabled
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.disabled).toBe(0);
  });
});
