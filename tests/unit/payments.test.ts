import { describe, expect, it } from "vitest";
import { verifiedPaymentEventSchema } from "@/lib/integrations/payments/types";

describe("payment webhook and processor rules", () => {
  const validPaymentPayload = {
    provider: "bkash",
    providerEventId: "evt_1002938481",
    orderId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    amountMinor: 25000000,
    currency: "BDT",
    status: "paid",
    transactionId: "TXN_784920194",
    rawEvent: {
      signature: "sig_abc123",
      paymentID: "pay_1002"
    }
  };

  it("validates compliant payment webhook event data", () => {
    const result = verifiedPaymentEventSchema.safeParse(validPaymentPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amountMinor).toBe(25000000);
      expect(result.data.currency).toBe("BDT");
    }
  });

  it("rejects non-integer or negative payment amounts", () => {
    const invalidAmount = {
      ...validPaymentPayload,
      amountMinor: -500
    };
    const result = verifiedPaymentEventSchema.safeParse(invalidAmount);
    expect(result.success).toBe(false);
  });

  it("rejects unsupported currencies", () => {
    const invalidCurrency = {
      ...validPaymentPayload,
      currency: "EUR"
    };
    const result = verifiedPaymentEventSchema.safeParse(invalidCurrency);
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID order references", () => {
    const invalidOrder = {
      ...validPaymentPayload,
      orderId: "not-a-uuid"
    };
    const result = verifiedPaymentEventSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });
});
