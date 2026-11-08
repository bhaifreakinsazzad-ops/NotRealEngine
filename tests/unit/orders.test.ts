import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canTransition,
  orderTransitions,
  projectTransitions
} from "@/lib/domain/states";
import {
  updateOrderStateAction,
  initializeProjectFromOrderAction
} from "@/app/admin/orders/actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

const mockOrderSingle = vi.fn();
const mockPaymentLimit = vi.fn();
const mockProjectMaybeSingle = vi.fn();
const mockOrderUpdateEq = vi.fn();
const mockAuditInsert = vi.fn();
const mockProjectInsertSingle = vi.fn();
const mockProjectDeleteEq = vi.fn();
const mockReqInsert = vi.fn();
const mockMilestoneInsert = vi.fn();
const mockOutboxInsert = vi.fn();
const mockAdminRpc = vi.fn();

const mockDbFrom = (table: string) => {
  if (table === "orders") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: () => mockOrderSingle()
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: (...args: unknown[]) => mockOrderUpdateEq(...args)
      })
    };
  }
  if (table === "payment_transactions") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              limit: () => mockPaymentLimit()
            })
          })
        })
      })
    };
  }
  if (table === "projects") {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: () => mockProjectMaybeSingle()
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: () => mockProjectInsertSingle()
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: (...args: unknown[]) => mockProjectDeleteEq(...args)
      })
    };
  }
  if (table === "project_requirements") {
    return {
      insert: (...args: unknown[]) => mockReqInsert(...args)
    };
  }
  if (table === "milestones") {
    return {
      insert: (...args: unknown[]) => mockMilestoneInsert(...args)
    };
  }
  if (table === "outbox_events") {
    return {
      insert: (...args: unknown[]) => mockOutboxInsert(...args)
    };
  }
  if (table === "audit_logs") {
    return {
      insert: (...args: unknown[]) => mockAuditInsert(...args)
    };
  }
  return {};
};

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn().mockImplementation(async () => ({
    supabase: {
      rpc: (...args: unknown[]) => mockAdminRpc(...args),
      from: vi.fn().mockImplementation(mockDbFrom)
    },
    user: { id: "staff-user-1" },
    staffRole: "super_admin"
  }))
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    rpc: (...args: unknown[]) => mockAdminRpc(...args),
    from: vi.fn().mockImplementation(mockDbFrom)
  }))
}));

describe("order & project lifecycle domain rules", () => {
  it("enforces strict sequential order transitions", () => {
    expect(canTransition("awaiting_payment", "confirmed", orderTransitions)).toBe(true);
    expect(canTransition("confirmed", "in_production", orderTransitions)).toBe(true);
    expect(canTransition("in_production", "completed", orderTransitions)).toBe(true);

    expect(canTransition("awaiting_payment", "in_production", orderTransitions)).toBe(false);
    expect(canTransition("awaiting_payment", "completed", orderTransitions)).toBe(false);
    expect(canTransition("completed", "in_production", orderTransitions)).toBe(false);
  });

  it("handles on-hold states correctly for orders", () => {
    expect(canTransition("awaiting_payment", "on_hold", orderTransitions)).toBe(true);
    expect(canTransition("confirmed", "on_hold", orderTransitions)).toBe(true);
    expect(canTransition("in_production", "on_hold", orderTransitions)).toBe(true);

    expect(canTransition("on_hold", "confirmed", orderTransitions)).toBe(true);
    expect(canTransition("on_hold", "in_production", orderTransitions)).toBe(true);
    expect(canTransition("on_hold", "completed", orderTransitions)).toBe(false);
  });

  it("enforces project production and revision gates", () => {
    expect(canTransition("awaiting_requirements", "requirements_review", projectTransitions)).toBe(true);
    expect(canTransition("requirements_review", "ready_for_production", projectTransitions)).toBe(true);
    expect(canTransition("requirements_review", "awaiting_requirements", projectTransitions)).toBe(true);

    expect(canTransition("ready_for_production", "in_progress", projectTransitions)).toBe(true);
    expect(canTransition("in_progress", "internal_qa", projectTransitions)).toBe(true);
    expect(canTransition("internal_qa", "client_review", projectTransitions)).toBe(true);

    expect(canTransition("client_review", "revision", projectTransitions)).toBe(true);
    expect(canTransition("revision", "in_progress", projectTransitions)).toBe(true);
    expect(canTransition("client_review", "approved", projectTransitions)).toBe(true);
    expect(canTransition("approved", "delivered", projectTransitions)).toBe(true);

    expect(canTransition("delivered", "in_progress", projectTransitions)).toBe(false);
    expect(canTransition("delivered", "revision", projectTransitions)).toBe(false);
  });
});

describe("V12 financial clearance & atomic project initialization", () => {
  const orderId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
  const orgId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  beforeEach(() => {
    mockOrderSingle.mockReset();
    mockPaymentLimit.mockReset();
    mockProjectMaybeSingle.mockReset();
    mockOrderUpdateEq.mockReset();
    mockAuditInsert.mockReset();
    mockProjectInsertSingle.mockReset();
    mockProjectDeleteEq.mockReset();
    mockReqInsert.mockReset();
    mockMilestoneInsert.mockReset();
    mockOutboxInsert.mockReset();
    mockAdminRpc.mockReset();
  });

  it("rejects confirming an unpaid order without a verified payment transaction or manual settlement", async () => {
    mockOrderSingle.mockResolvedValueOnce({
      data: {
        id: orderId,
        organization_id: orgId,
        state: "awaiting_payment",
        commercial_snapshot: {}
      },
      error: null
    });
    mockPaymentLimit.mockResolvedValueOnce({ data: [], error: null });

    const res = await updateOrderStateAction({
      orderId,
      nextState: "confirmed"
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/verified payment transaction or an explicit approved manual settlement/i);
    }
    expect(mockOrderUpdateEq).not.toHaveBeenCalled();
  });

  it("confirms an order when an explicit audited manual settlement is provided", async () => {
    mockOrderSingle.mockResolvedValueOnce({
      data: {
        id: orderId,
        organization_id: orgId,
        state: "awaiting_payment",
        total_minor: 25000000,
        commercial_snapshot: {}
      },
      error: null
    });
    mockPaymentLimit.mockResolvedValueOnce({ data: [], error: null });
    mockOrderUpdateEq.mockResolvedValueOnce({ error: null });
    mockOutboxInsert.mockResolvedValueOnce({ error: null });
    mockAuditInsert.mockResolvedValueOnce({ error: null });

    const res = await updateOrderStateAction({
      orderId,
      nextState: "confirmed",
      manualSettlement: {
        reference: "WIRE-20261108-99",
        method: "bank_transfer",
        note: "Verified corporate wire receipt"
      }
    });

    expect(res.ok).toBe(true);
    expect(mockOrderUpdateEq).toHaveBeenCalledTimes(1);
    expect(mockAuditInsert).toHaveBeenCalledTimes(1);
  });

  it("returns existing project ID without creating duplicates on duplicate project initialization", async () => {
    mockOrderSingle.mockResolvedValueOnce({
      data: {
        id: orderId,
        organization_id: orgId,
        state: "confirmed",
        commercial_snapshot: {
          settlement: { status: "approved_manual_settlement", reference: "WIRE-1" }
        }
      },
      error: null
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({
      data: { id: "existing-project-uuid" },
      error: null
    });

    const res = await initializeProjectFromOrderAction(orderId);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.projectId).toBe("existing-project-uuid");
    }
    expect(mockProjectInsertSingle).not.toHaveBeenCalled();
  });

  it("rejects project initialization when canonical service_id is missing or invalid (never substitutes fallback)", async () => {
    mockOrderSingle.mockResolvedValueOnce({
      data: {
        id: orderId,
        organization_id: orgId,
        state: "confirmed",
        commercial_snapshot: {
          serviceId: "non-existent-service-slug",
          settlement: { status: "approved_manual_settlement", reference: "WIRE-1" }
        },
        quotes: { project_brief_id: null, project_briefs: null }
      },
      error: null
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const res = await initializeProjectFromOrderAction(orderId);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Invalid or missing canonical service reference/i);
    }
    expect(mockProjectInsertSingle).not.toHaveBeenCalled();
  });

  it("rolls back the created project row if requirements or milestone insertion fails", async () => {
    mockOrderSingle.mockResolvedValueOnce({
      data: {
        id: orderId,
        organization_id: orgId,
        state: "confirmed",
        commercial_snapshot: {
          serviceId: "SVC-01-SPW",
          settlement: { status: "approved_manual_settlement", reference: "WIRE-1" }
        },
        quotes: {
          project_brief_id: null,
          project_briefs: null
        }
      },
      error: null
    });
    mockProjectMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Simulate RPC not yet applied so compensating path runs
    mockAdminRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Could not find the function public.initialize_project_from_order in the schema cache" }
    });
    mockProjectInsertSingle.mockResolvedValueOnce({
      data: { id: "new-proj-to-rollback" },
      error: null
    });
    mockReqInsert.mockResolvedValueOnce({ error: null });
    // Simulate milestone insert failure!
    mockMilestoneInsert.mockResolvedValueOnce({
      error: { message: "simulated milestone constraint failure" }
    });
    mockProjectDeleteEq.mockResolvedValueOnce({ error: null });

    const res = await initializeProjectFromOrderAction(orderId);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/Failed to seed project milestones/i);
    }
    // Verify compensating rollback deleted the orphan project row!
    expect(mockProjectDeleteEq).toHaveBeenCalledWith("id", "new-proj-to-rollback");
  });
});
