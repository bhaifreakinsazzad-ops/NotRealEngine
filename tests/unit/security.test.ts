import { describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { registerUploadedFileAction } from "@/app/dashboard/actions";
import {
  verifyHmacSha256,
  verifyStripeSignature,
  parseAndVerifyPaymentWebhook
} from "@/lib/integrations/payments/providers";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

// Mock lib/auth
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({
    supabase: {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "projects") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "11111111-1111-4111-8111-111111111111", organization_id: "22222222-2222-4222-8222-222222222222" },
                  error: null
                })
              })
            })
          };
        }
        if (table === "organization_memberships") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { organization_id: "22222222-2222-4222-8222-222222222222" },
                    error: null
                  })
                })
              })
            })
          };
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "file-999" }, error: null })
            })
          })
        };
      })
    },
    user: { id: "user-123" }
  })
}));

describe("Tenant Security & Path Traversal Guards", () => {
  const validProjectId = "11111111-1111-4111-8111-111111111111";
  const validOrgId = "22222222-2222-4222-8222-222222222222";

  it("rejects file registration when storagePath attempts directory traversal (..)", async () => {
    const res = await registerUploadedFileAction({
      projectId: validProjectId,
      organizationId: validOrgId,
      storagePath: `${validProjectId}/../../../etc/passwd`,
      originalName: "passwd",
      mimeType: "text/plain",
      sizeBytes: 1024
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/path traversal/i);
    }
  });

  it("rejects file registration when storagePath prefix does not match projectId", async () => {
    const res = await registerUploadedFileAction({
      projectId: validProjectId,
      organizationId: validOrgId,
      storagePath: "33333333-3333-4333-8333-333333333333/my_file.pdf",
      originalName: "my_file.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/storage path traversal violation/i);
    }
  });

  it("rejects file registration with disallowed MIME type", async () => {
    const res = await registerUploadedFileAction({
      projectId: validProjectId,
      organizationId: validOrgId,
      storagePath: `${validProjectId}/script.sh`,
      originalName: "script.sh",
      mimeType: "application/x-sh",
      sizeBytes: 500
    });

    expect(res.ok).toBe(false);
  });

  it("rejects file registration exceeding 50MB limit", async () => {
    const res = await registerUploadedFileAction({
      projectId: validProjectId,
      organizationId: validOrgId,
      storagePath: `${validProjectId}/huge.zip`,
      originalName: "huge.zip",
      mimeType: "application/zip",
      sizeBytes: 60 * 1024 * 1024 // 60MB
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/50MB/i);
    }
  });

  it("accepts valid, sanitized file registration within tenant boundaries", async () => {
    const res = await registerUploadedFileAction({
      projectId: validProjectId,
      organizationId: validOrgId,
      storagePath: `${validProjectId}/1731000000_brief.pdf`,
      originalName: "brand_guidelines.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024 * 1024
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.fileId).toBe("file-999");
    }
  });
});

describe("Cryptographic Webhook Signature Verification", () => {
  const secret = "test-webhook-secret-32-chars-long-!";
  const rawPayload = JSON.stringify({
    provider: "stripe",
    providerEventId: "evt_123",
    orderId: "11111111-1111-1111-1111-111111111111",
    amountMinor: 50000,
    currency: "BDT",
    status: "paid",
    transactionId: "tx_123",
    rawEvent: {}
  });

  it("verifies valid HMAC-SHA256 signature with constant-time equality", () => {
    const validSig = crypto.createHmac("sha256", secret).update(rawPayload, "utf8").digest("hex");
    expect(verifyHmacSha256(rawPayload, validSig, secret)).toBe(true);
  });

  it("rejects tampered payload or forged HMAC signature", () => {
    const forgedSig = crypto.createHmac("sha256", "wrong-secret").update(rawPayload, "utf8").digest("hex");
    expect(verifyHmacSha256(rawPayload, forgedSig, secret)).toBe(false);
  });

  it("verifies valid Stripe signature within tolerance window", () => {
    const now = Math.floor(Date.now() / 1000);
    const signedPayload = `${now}.${rawPayload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const header = `t=${now},v1=${sig}`;

    const res = verifyStripeSignature(rawPayload, header, secret, 300);
    expect(res.valid).toBe(true);
  });

  it("rejects replayed Stripe signature outside tolerance window", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
    const signedPayload = `${oldTimestamp}.${rawPayload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const header = `t=${oldTimestamp},v1=${sig}`;

    const res = verifyStripeSignature(rawPayload, header, secret, 300);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/tolerance window/i);
  });

  it("fails closed when no recognized signature header is present", () => {
    const headers = new Headers();
    const result = parseAndVerifyPaymentWebhook(rawPayload, headers, { webhookSecret: secret });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/No recognized payment signature header/i);
  });
});
