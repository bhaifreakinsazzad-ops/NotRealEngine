import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceRoleClient } from "@/lib/supabase/service";
import { extractClientIp } from "@/lib/http/client-ip";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

// Best-effort, per-instance only: does not share state across serverless invocations.
// Primary abuse control is the mandatory shared-secret auth below; this is defense in depth.
const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Constant-time secret comparison. Hashing both sides to a fixed-length digest before
 * comparing means timingSafeEqual never short-circuits on a length mismatch, which would
 * otherwise leak the configured secret's length to an attacker.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const digestA = crypto.createHash("sha256").update(a).digest();
  const digestB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * GoHighLevel/LeadConnector "Workflow Webhook" actions (what this adapter targets) support a
 * custom request header but do not sign the payload — there is no HMAC/body-signature scheme
 * to verify here. (The separate GHL Marketplace App webhook product signs with a JWT via
 * x-wh-signature, but this integration does not use that product.) Authentication is therefore
 * a mandatory, fail-closed shared secret delivered via header only.
 */
function extractProvidedSecret(request: NextRequest): string | null {
  const headerKey =
    request.headers.get("x-leadconnector-key") ||
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const trimmed = headerKey?.trim();
  return trimmed ? trimmed : null;
}

interface LeadConnectorPayload {
  type?: string;
  event?: string;
  id?: string;
  contact_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  organization_name?: string;
  service_id?: string;
  appointment?: {
    id?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    calendarName?: string;
    address?: string;
  };
  form?: {
    id?: string;
    formId?: string;
    formName?: string;
    fields?: Record<string, unknown>;
  };
  message?: string;
  notes?: string;
  customData?: Record<string, unknown>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "active",
    adapter: "ENGINE//OS LeadConnector Inbound Ingestion Webhook",
    version: "V14.0",
    supportedEvents: ["Appointment", "FormSubmission", "ContactCreate", "InboundMessage"],
    configurationInstructions: {
      webhookUrl: `${request.nextUrl.origin}/api/webhooks/leadconnector`,
      secretHeader: "x-leadconnector-key"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Abuse control (best-effort, IP-keyed) — runs before auth so a flood of invalid
    // credential attempts is also throttled, not just successful requests.
    const clientIp = extractClientIp(request.headers);
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    // 2. Mandatory, fail-closed authentication. No environment-based bypass: if the secret
    // is not configured, every request is rejected, not just ones in a "production" environment.
    const configuredSecret = process.env.LEADCONNECTOR_WEBHOOK_SECRET;
    if (!configuredSecret) {
      console.error("[LeadConnector Webhook] Rejected request: LEADCONNECTOR_WEBHOOK_SECRET is not configured.");
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const providedSecret = extractProvidedSecret(request);
    if (!providedSecret || !constantTimeEqual(providedSecret, configuredSecret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // 3. Bound request size before reading/parsing the body.
    const declaredLength = Number(request.headers.get("content-length") || "0");
    if (declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    // 4. Parse Payload
    let body: LeadConnectorPayload;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "invalid_json: payload must be valid JSON" },
        { status: 400 }
      );
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json(
        { error: "invalid_payload: payload must be a JSON object" },
        { status: 400 }
      );
    }

    // 5. Normalize Event Type and Source
    const eventType = body.type || body.event || (body.appointment ? "Appointment" : body.form ? "FormSubmission" : "ContactCreate");
    let normalizedSource = "leadconnector_general";
    if (eventType.toLowerCase().includes("appoint") || body.appointment) {
      normalizedSource = "leadconnector_booking";
    } else if (eventType.toLowerCase().includes("form") || body.form) {
      normalizedSource = "leadconnector_onboarding";
    } else if (eventType.toLowerCase().includes("chat") || eventType.toLowerCase().includes("message")) {
      normalizedSource = "leadconnector_chat";
    }

    // 6. Normalize Contact Information
    const rawName =
      body.name ||
      [body.first_name, body.last_name].filter(Boolean).join(" ") ||
      "Inbound Lead";
    const contactName = String(rawName).trim().slice(0, 120);

    const rawEmail = body.email || (body.customData?.email as string) || "";
    const contactEmail = String(rawEmail).trim().toLowerCase();

    const rawPhone = body.phone || (body.customData?.phone as string) || "";
    const contactPhone = String(rawPhone).trim();

    if (!contactEmail && !contactPhone) {
      return NextResponse.json(
        { error: "missing_contact_info: at least an email or phone number is required" },
        { status: 422 }
      );
    }

    const orgName =
      body.organization_name ||
      body.company_name ||
      (contactName ? `${contactName}'s Team` : "Direct Client");

    // 7. Canonical Service Resolution
    // Default to Single Page Website (SVC-01-SPW) or Business Website (SVC-03-BWD)
    const serviceId = body.service_id || "SVC-01-SPW";

    // 8. Generate Traceable Provider Reference
    const eventCode = normalizedSource === "leadconnector_booking"
      ? "BOOK"
      : normalizedSource === "leadconnector_onboarding"
      ? "FORM"
      : normalizedSource === "leadconnector_chat"
      ? "CHAT"
      : "GHL";
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const reference = `GHL-${eventCode}-${randomHex}`;

    // 9. Store in PostgreSQL via Supabase Service Role Client
    const supabase = getServiceRoleClient();

    // Check for recent duplicate (within 1 hour) with same email and source
    if (contactEmail) {
      const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
      const { data: existingBrief } = await supabase
        .from("project_briefs")
        .select("id, reference")
        .eq("contact_email", contactEmail)
        .gte("created_at", oneHourAgo)
        .limit(1)
        .maybeSingle();

      if (existingBrief) {
        return NextResponse.json({
          ok: true,
          status: "deduplicated",
          message: "Existing recent enquiry recognized; deduplicated to prevent duplicate lead spam.",
          reference: existingBrief.reference,
          briefId: existingBrief.id
        });
      }
    }

    // Create Project Brief
    const { data: brief, error: briefErr } = await supabase
      .from("project_briefs")
      .insert({
        reference,
        service_id: serviceId,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        organization_name: orgName,
        status: "submitted",
        payload: {
          rawEvent: eventType,
          appointment: body.appointment,
          form: body.form,
          notes: body.notes || body.message,
          customData: body.customData,
          ingestedVia: "leadconnector_webhook_v14"
        },
        attribution: {
          source: normalizedSource,
          provider: "leadconnector",
          providerReference: body.id || body.contact_id || body.appointment?.id || body.form?.id,
          utm_source: body.utm_source,
          utm_medium: body.utm_medium,
          utm_campaign: body.utm_campaign,
          utm_content: body.utm_content,
          utm_term: body.utm_term
        }
      })
      .select("id, reference")
      .single();

    if (briefErr || !brief) {
      console.error("[LeadConnector Webhook] Failed to create project brief:", briefErr?.code, briefErr?.message);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    // Create Lead Record
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        project_brief_id: brief.id,
        status: "new"
      })
      .select("id, status")
      .single();

    if (leadErr || !lead) {
      console.error("[LeadConnector Webhook] Failed to create lead:", leadErr?.code, leadErr?.message);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    // Record Audit Log Event
    await supabase.from("audit_logs").insert({
      action: "lead.ingested_from_leadconnector",
      entity_type: "lead",
      entity_id: lead.id,
      after_data: {
        leadId: lead.id,
        briefId: brief.id,
        reference: brief.reference,
        source: normalizedSource,
        contactEmail,
        contactName,
        provider: "leadconnector"
      }
    });

    return NextResponse.json(
      {
        ok: true,
        leadId: lead.id,
        briefId: brief.id,
        reference: brief.reference,
        source: normalizedSource,
        status: "new"
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[LeadConnector Webhook] Unhandled exception:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}
