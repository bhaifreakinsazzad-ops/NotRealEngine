import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { projectBriefSchema } from "@/lib/validation/project-brief";
import { intakeConfigured } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  if (!intakeConfigured()) return NextResponse.json({ error: "Secure project intake is not configured yet." }, { status: 503 });
  const raw = await request.json().catch(() => null);
  const parsed = projectBriefSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid project brief." }, { status: 422 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const fingerprint = `${request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"}|${request.headers.get("user-agent") || "unknown"}`;
  const requestHash = createHmac("sha256", secret).update(fingerprint).digest("hex");
  const reference = `NRE-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.rpc("submit_project_brief", { p_payload: parsed.data, p_request_hash: requestHash, p_reference: reference });
  if (error) {
    const limited = error.message.includes("rate_limit");
    return NextResponse.json({ error: limited ? "Too many project requests. Please try again later." : "The secure intake service could not store this brief." }, { status: limited ? 429 : 503 });
  }
  return NextResponse.json({ reference }, { status: 201 });
}
