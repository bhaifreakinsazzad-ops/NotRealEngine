import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { projectBriefSchema } from "@/lib/validation/project-brief";
import { intakeConfigured } from "@/lib/supabase/config";

/**
 * Extracts client IP from trusted platform proxy headers first (e.g., Vercel / Cloudflare),
 * falling back to the last hop of x-forwarded-for or "unknown" to prevent trivial client spoofing.
 */
export function extractClientIp(headers: Headers): string {
  const realIp =
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1]!;
    }
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  if (!intakeConfigured()) {
    return NextResponse.json({ error: "Secure project intake is not configured yet." }, { status: 503 });
  }
  const raw = await request.json().catch(() => null);
  const parsed = projectBriefSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid project brief." }, { status: 422 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const rateLimitSecret = process.env.RATE_LIMIT_SECRET || serviceKey;

  const clientIp = extractClientIp(request.headers);
  const userAgent = (request.headers.get("user-agent") || "unknown").slice(0, 256);
  const fingerprint = `${clientIp}|${userAgent}`;
  const requestHash = createHmac("sha256", rateLimitSecret).update(fingerprint).digest("hex");
  const reference = `NRE-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error } = await supabase.rpc("submit_project_brief", {
    p_payload: parsed.data,
    p_request_hash: requestHash,
    p_reference: reference
  });
  if (error) {
    const limited = error.message.includes("rate_limit");
    return NextResponse.json(
      {
        error: limited
          ? "Too many project requests. Please try again later."
          : "The secure intake service could not store this brief."
      },
      { status: limited ? 429 : 503 }
    );
  }
  return NextResponse.json({ reference }, { status: 201 });
}
