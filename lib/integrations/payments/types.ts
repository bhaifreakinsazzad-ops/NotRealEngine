import { z } from "zod";

export const verifiedPaymentEventSchema = z.object({
  provider: z.string().min(1),
  providerEventId: z.string().min(1),
  orderId: z.string().uuid("Invalid order ID"),
  amountMinor: z.number().int().positive("Amount must be positive integer minor units"),
  currency: z.enum(["BDT", "USD"]),
  status: z.enum(["paid", "failed", "pending"]),
  transactionId: z.string().min(1),
  rawEvent: z.record(z.string(), z.unknown())
});

export type VerifiedPaymentEvent = z.infer<typeof verifiedPaymentEventSchema>;

export interface PaymentGatewayAdapter {
  providerName: string;
  verifySignature(rawBody: string, signature: string, secret: string): boolean;
  parseWebhookPayload(body: unknown): VerifiedPaymentEvent | null;
}
