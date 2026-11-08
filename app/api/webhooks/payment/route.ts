import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { processPaymentWebhook } from "@/lib/integrations/payments/processor";
import { parseAndVerifyPaymentWebhook } from "@/lib/integrations/payments/providers";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  // In accordance with company policy, live payment collection is disabled without credentials
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Payment webhook endpoint is not activated. Live merchant credentials not configured." },
      { status: 503 }
    );
  }

  try {
    const rawBodyText = await req.text();

    // Verify cryptographic signature against raw body
    const verification = parseAndVerifyPaymentWebhook(rawBodyText, req.headers, {
      webhookSecret
    });

    if (!verification.valid || !verification.event) {
      return NextResponse.json(
        { error: verification.error ?? "Invalid payment webhook signature" },
        { status: 401 }
      );
    }

    // Use service role client for verified webhook event processing
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    const supabase = createServerClient(url, key, {
      cookies: { getAll: () => [], setAll: () => {} }
    });

    const result = await processPaymentWebhook(supabase, verification.event);

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
