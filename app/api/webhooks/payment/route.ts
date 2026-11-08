import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { processPaymentWebhook } from "@/lib/integrations/payments/processor";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  // In accordance with company policy, live payment collection is disabled without credentials
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Payment webhook endpoint is not activated. Live merchant credentials not configured." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature header" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();

    // Use service role client for webhook event processing
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    const supabase = createServerClient(url, key, {
      cookies: { getAll: () => [], setAll: () => {} }
    });

    const result = await processPaymentWebhook(supabase, rawBody);

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    }

    return NextResponse.json({
      received: true,
      orderId: result.orderId,
      duplicate: result.duplicate ?? false
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error processing payment event";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
