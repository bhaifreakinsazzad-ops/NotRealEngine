import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/http/client-ip";
import {
  consumeLabAiBudget,
  getLabAiGatewayStatus,
  labAiEnhanceSchema,
  runOwnerGatedLabAiPolish,
} from "@/lib/lab-ai-gateway";

const MAX_PAYLOAD_BYTES = 12_288;

export async function GET() {
  const status = getLabAiGatewayStatus();
  return NextResponse.json(
    {
      enabled: status.enabled,
      reason: status.reason ?? null,
      engine: status.enabled ? "server-ai-gemini" : "deterministic-only",
    },
    { status: 200 },
  );
}

export async function POST(req: NextRequest) {
  const status = getLabAiGatewayStatus();
  if (!status.enabled) {
    return NextResponse.json(
      { error: status.reason ?? "Owner-controlled AI gateway is currently disabled." },
      { status: 503 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Unable to read request body." }, { status: 400 });
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Input exceeds 12 KB limit." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = labAiEnhanceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid AI polish request." },
      { status: 400 },
    );
  }

  const ip = extractClientIp(req.headers);
  const budget = consumeLabAiBudget(ip, status.dailyLimit);
  if (!budget.allowed) {
    return NextResponse.json(
      { error: budget.reason },
      { status: 429, headers: { "Retry-After": String(budget.retryAfterSec) } },
    );
  }

  try {
    const output = await runOwnerGatedLabAiPolish(parsed.data);
    return NextResponse.json(
      {
        ...output,
        remainingDailyBudget: budget.remainingToday,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI gateway request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
