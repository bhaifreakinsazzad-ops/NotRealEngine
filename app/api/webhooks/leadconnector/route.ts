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
  submissionId?: string;
  submission_id?: string;
  formSubmissionId?: string;
  workflowExecutionId?: string;
  executionId?: string;
  workflow?: {
    id?: string;
    executionId?: string;
    name?: string;
  };
  contact_id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  organization_name?: string;
  service_id?: string;
  appointmentId?: string;
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
  messageId?: string;
  chatId?: string;
  message?: string;
  notes?: string;
  customData?: Record<string, unknown>;
  submittedAt?: string;
  timestamp?: string;
  dateAdded?: string;
  createdAt?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  [key: string]: unknown;
}

/**
 * Derives a true unique event/submission identifier.
 * Prevents using a static form template ID or contact ID alone as event seed,
 * which would incorrectly cause distinct user inquiries on the same form to be discarded.
 */
function deriveProviderEventId(
  body: LeadConnectorPayload,
  eventType: string,
  contactKey: string
): { providerEventId: string; providerEventSeed: string } {
  // 1. Explicit appointment ID
  const apptId = body.appointment?.id || body.appointmentId;
  if (apptId) {
    const seed = String(apptId);
    return { providerEventId: `Appointment:${seed}`, providerEventSeed: seed };
  }

  // 2. Explicit chat / message ID
  const msgId = body.messageId || body.chatId;
  if (msgId) {
    const seed = String(msgId);
    return { providerEventId: `ChatMessage:${seed}`, providerEventSeed: seed };
  }

  // 3. Explicit unique form submission or workflow execution ID
  const explicitSubmissionId =
    body.submissionId ||
    body.submission_id ||
    body.formSubmissionId ||
    body.workflow?.executionId ||
    body.workflowExecutionId ||
    body.executionId;
  if (explicitSubmissionId) {
    const seed = String(explicitSubmissionId);
    return { providerEventId: `FormSubmission:${seed}`, providerEventSeed: seed };
  }

  // 4. Top-level event notification ID (if distinct from static form template or contact ID)
  if (
    body.id &&
    body.id !== body.form?.id &&
    body.id !== body.form?.formId &&
    body.id !== body.contact_id
  ) {
    const seed = String(body.id);
    return { providerEventId: `${eventType}:${seed}`, providerEventSeed: seed };
  }

  // 5. Fallback for form submissions without explicit submission UUID:
  // Must qualify with contact identity and timestamp (or content digest) so that:
  // - Two distinct visitors submitting the same form template do NOT collide.
  // - The same visitor submitting multiple distinct inquiries is not discarded.
  // - Network delivery retries of the identical submission are recognized as duplicates.
  const formTemplateId = body.form?.id || body.form?.formId || "general_form";
  const submissionTimestamp = body.submittedAt || body.timestamp || body.dateAdded || body.createdAt;
  if (submissionTimestamp) {
    const seed = `${formTemplateId}:${contactKey}:${submissionTimestamp}`;
    return { providerEventId: `FormSubmission:${seed}`, providerEventSeed: seed };
  }

  // Content fingerprint fallback when provider sends no timestamp
  const contentDigest = crypto
    .createHash("sha256")
    .update(`${contactKey}|${JSON.stringify(body.form?.fields || {})}|${body.notes || body.message || ""}`)
    .digest("hex")
    .slice(0, 16);
  const seed = `${formTemplateId}:${contactKey}:${contentDigest}`;
  return { providerEventId: `${eventType}:${seed}`, providerEventSeed: seed };
}

/**
 * Data minimization: sanitize form fields, discarding potential auth tokens or credential keys.
 */
function sanitizeFormFields(fields: unknown): Record<string, unknown> | undefined {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return undefined;
  const sanitized: Record<string, unknown> = {};
  const SENSITIVE_REGEX = /(password|passphrase|token|secret|cvv|credit_card|auth|session)/i;
  for (const [k, v] of Object.entries(fields as Record<string, unknown>)) {
    if (SENSITIVE_REGEX.test(k)) continue;
    if (typeof v === "string") {
      sanitized[k] = v.slice(0, 1000);
    } else if (typeof v === "number" || typeof v === "boolean") {
      sanitized[k] = v;
    } else if (Array.isArray(v)) {
      sanitized[k] = v.slice(0, 10).map((item) => (typeof item === "string" ? item.slice(0, 500) : item));
    }
  }
  return sanitized;
}

/**
 * Data minimization: sanitize custom data, extracting only relevant qualification properties.
 */
function sanitizeCustomData(custom: unknown): Record<string, unknown> | undefined {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return undefined;
  const sanitized: Record<string, unknown> = {};
  const SENSITIVE_REGEX = /(password|passphrase|token|secret|cookie|session|jwt)/i;
  for (const [k, v] of Object.entries(custom as Record<string, unknown>)) {
    if (SENSITIVE_REGEX.test(k)) continue;
    if (typeof v === "string") {
      sanitized[k] = v.slice(0, 1000);
    } else if (typeof v === "number" || typeof v === "boolean") {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Canonicalizes an arbitrary JSON-compatible value by sorting object keys lexicographically
 * and filtering out transient transport metadata.
 */
function canonicalizeValue(val: unknown): unknown {
  if (val === null || typeof val !== "object") {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(canonicalizeValue);
  }
  const obj = val as Record<string, unknown>;
  const transientKeys = new Set([
    "_delivery_attempt",
    "attempt",
    "retryCount",
    "deliveryTimestamp",
    "webhookId",
    "request_id",
    "trace_id"
  ]);
  const sortedKeys = Object.keys(obj)
    .filter((k) => !transientKeys.has(k))
    .sort();
  const result: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    result[k] = canonicalizeValue(obj[k]);
  }
  return result;
}

/**
 * Computes a deterministic SHA-256 hash of the semantic payload.
 * Guarantees that key reordering, JSON formatting, or transport retry metadata
 * do NOT trigger false 409 Conflicts. Real data contradictions on the same
 * event ID will continue to be detected accurately.
 */
export function computeSemanticPayloadHash(
  sanitizedPayload: Record<string, unknown>,
  contactName: string,
  contactEmail: string,
  contactPhone: string,
  serviceId: string | null
): string {
  const semanticData = {
    contactEmail: contactEmail.toLowerCase().trim(),
    contactName: contactName.trim(),
    contactPhone: contactPhone.trim(),
    serviceId: serviceId || null,
    payload: canonicalizeValue(sanitizedPayload)
  };

  const canonicalJson = JSON.stringify(semanticData);
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "active",
    adapter: "ENGINE//OS LeadConnector Inbound Ingestion Webhook",
    version: "V18.0",
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
    // requests from a single client is throttled early without computing constantTimeEqual.
    const clientIp = extractClientIp(request.headers);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "too_many_requests: rate limit exceeded" },
        { status: 429 }
      );
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
    const eventType =
      body.type ||
      body.event ||
      (body.appointment ? "Appointment" : body.form ? "FormSubmission" : "ContactCreate");
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

    // 7. Event Identity for Idempotency
    const contactKey = contactEmail || contactPhone;
    const { providerEventId, providerEventSeed } = deriveProviderEventId(body, eventType, contactKey);

    // 8. Canonical Service Resolution
    // Only use a canonical service id if the provider explicitly sent one; the RPC itself
    // re-validates it against the active catalog and discards anything unrecognized rather
    // than guessing. An unclassified enquiry is preserved as such for staff qualification --
    // never silently defaulted to Single Page Website.
    const requestedServiceId = typeof body.service_id === "string" ? body.service_id : null;

    // 9. Generate Traceable Provider Reference
    const eventCode =
      normalizedSource === "leadconnector_booking"
        ? "BOOK"
        : normalizedSource === "leadconnector_onboarding"
        ? "FORM"
        : normalizedSource === "leadconnector_chat"
        ? "CHAT"
        : "GHL";
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const reference = `GHL-${eventCode}-${randomHex}`;

    // 10. Construct Sanitized Payload & Attribution (Data Minimization)
    const sanitizedPayload: Record<string, unknown> = {
      rawEvent: eventType,
      appointment: body.appointment
        ? {
            id: body.appointment.id,
            startTime: body.appointment.startTime,
            endTime: body.appointment.endTime,
            title: body.appointment.title,
            calendarName: body.appointment.calendarName,
            address: body.appointment.address
          }
        : undefined,
      form: body.form
        ? {
            formId: body.form.id || body.form.formId,
            formName: body.form.formName,
            fields: sanitizeFormFields(body.form.fields)
          }
        : undefined,
      notes: (body.notes || body.message || "").slice(0, 2000),
      customData: sanitizeCustomData(body.customData),
      ingestedVia: "leadconnector_webhook_v19"
    };

    const attributionData: Record<string, unknown> = {
      source: normalizedSource,
      provider: "leadconnector",
      providerReference: providerEventSeed,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      utm_term: body.utm_term
    };

    // 11. Compute Semantic Payload Hash (eliminates false 409 on whitespace/key-ordering/retry metadata)
    const payloadHash = computeSemanticPayloadHash(
      sanitizedPayload,
      contactName,
      contactEmail,
      contactPhone,
      requestedServiceId
    );

    // 12. Atomic, Idempotent Ingestion via Supabase RPC
    const supabase = getServiceRoleClient();
    const { data: result, error: rpcErr } = await supabase.rpc("ingest_leadconnector_event", {
      p_provider_event_id: providerEventId,
      p_payload_hash: payloadHash,
      p_reference: reference,
      p_service_id: requestedServiceId,
      p_contact_name: contactName,
      p_contact_email: contactEmail || null,
      p_contact_phone: contactPhone || null,
      p_organization_name: orgName,
      p_payload: sanitizedPayload,
      p_attribution: attributionData
    });

    if (rpcErr || !result) {
      console.error("[LeadConnector Webhook] Ingestion RPC failed:", rpcErr?.code, rpcErr?.message);
      return NextResponse.json({ error: "database_error" }, { status: 500 });
    }

    if (result.conflict) {
      console.warn("[LeadConnector Webhook] Conflicting payload for existing event ID:", providerEventId);
      return NextResponse.json(
        {
          ok: false,
          status: "conflict",
          error: "conflicting_payload_for_event_id",
          message: "An event with this provider ID was previously recorded with different payload content.",
          reference: result.reference,
          briefId: result.projectBriefId,
          leadId: result.leadId
        },
        { status: 409 }
      );
    }

    if (result.duplicate) {
      return NextResponse.json({
        ok: true,
        status: "deduplicated",
        message: "This event was already ingested; replay recognized and safely ignored.",
        reference: result.reference,
        briefId: result.projectBriefId,
        leadId: result.leadId
      });
    }

    return NextResponse.json(
      {
        ok: true,
        leadId: result.leadId,
        briefId: result.projectBriefId,
        reference: result.reference,
        serviceId: result.serviceId,
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
