import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { processOutboxBatch } from "@/lib/integrations/outbox-worker";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed if CRON_SECRET is not configured or auth header is missing/mismatched
  const authHeader = req.headers.get("authorization");
  const providedToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!cronSecret || !providedToken || providedToken !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized worker invocation." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Database service unavailable." }, { status: 503 });
  }

  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => [], setAll: () => {} }
  });

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
