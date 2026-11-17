import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processOutboxBatch } from "@/lib/integrations/outbox-worker";
import { intakeConfigured } from "@/lib/supabase/config";
import { getServiceRoleClient } from "@/lib/supabase/service";

function timingSafeSecretEqual(provided: string, expected: string): boolean {
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed if CRON_SECRET is not configured or auth header is missing/mismatched
  const authHeader = req.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!cronSecret || !providedToken || !timingSafeSecretEqual(providedToken, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized worker invocation." }, { status: 401 });
  }

  if (!intakeConfigured()) {
    return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
  }

  const supabase = getServiceRoleClient();
  const externalDeliveryEnabled = process.env.NOTIFICATIONS_ENABLED === "true";

  try {
    const result = await processOutboxBatch(supabase, {
      batchSize: 20,
      externalDeliveryEnabled
    });

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      disabled: result.disabled,
      failed: result.failed,
      errorCount: result.errors.length,
      deliveryPolicy: externalDeliveryEnabled ? "live" : "held"
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Outbox worker execution failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
