import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/http/client-ip";
import { labToolSchema, runLabTool } from "@/lib/lab-tools";

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const MAX_PAYLOAD_BYTES = 16_384;

const rateBuckets = new Map<string, number[]>();

function checkRateLimit(ip: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  const cutoff = now - RATE_WINDOW_MS;
  const recent = (rateBuckets.get(ip) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= RATE_MAX_REQUESTS) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000));
    rateBuckets.set(ip, recent);
    return { allowed: false, retryAfterSec };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { allowed: true, retryAfterSec: 0 };
}

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req.headers);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for NRE LAB tools. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Unable to read request body." }, { status: 400 });
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Input payload exceeds the 16 KB limit." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = labToolSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid NRE LAB tool input." },
      { status: 400 }
    );
  }

  const execution = runLabTool(parsed.data);
  if (!execution.ok) {
    return NextResponse.json({ error: execution.error }, { status: 400 });
  }

  return NextResponse.json(execution.result, { status: 200 });
}
