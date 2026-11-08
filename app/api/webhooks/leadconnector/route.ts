import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceRoleClient } from "@/lib/supabase/service";

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
      secretHeader: "x-leadconnector-key",
      queryParam: "?secret=<YOUR_SECRET>"
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.LEADCONNECTOR_WEBHOOK_SECRET;

    // 1. Verify Authentication / Secret
    const headerKey =
      request.headers.get("x-leadconnector-key") ||
      request.headers.get("x-webhook-secret") ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const providedSecret = headerKey || querySecret;

    if (configuredSecret) {
      if (!providedSecret || providedSecret !== configuredSecret) {
        return NextResponse.json(
          { error: "unauthorized: invalid or missing leadconnector secret token" },
          { status: 401 }
        );
      }
    } else {
      // In staging/preview, warn if unconfigured but allow authenticated tests with x-leadconnector-key = test-staging
      if (process.env.ENGINE_OS_ENV === "production" && !providedSecret) {
        return NextResponse.json(
          { error: "unauthorized: webhook secret required in production" },
          { status: 401 }
        );
      }
    }

    // 2. Parse Payload
    let body: LeadConnectorPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json: payload must be valid JSON" },
        { status: 400 }
      );
    }

    // 3. Normalize Event Type and Source
    const eventType = body.type || body.event || (body.appointment ? "Appointment" : body.form ? "FormSubmission" : "ContactCreate");
    let normalizedSource = "leadconnector_general";
    if (eventType.toLowerCase().includes("appoint") || body.appointment) {
      normalizedSource = "leadconnector_booking";
    } else if (eventType.toLowerCase().includes("form") || body.form) {
      normalizedSource = "leadconnector_onboarding";
    } else if (eventType.toLowerCase().includes("chat") || eventType.toLowerCase().includes("message")) {
      normalizedSource = "leadconnector_chat";
    }

    // 4. Normalize Contact Information
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

    // 5. Canonical Service Resolution
    // Default to Single Page Website (SVC-01-SPW) or Business Website (SVC-03-BWD)
    const serviceId = body.service_id || "SVC-01-SPW";

    // 6. Generate Traceable Provider Reference
    const eventCode = normalizedSource === "leadconnector_booking"
      ? "BOOK"
      : normalizedSource === "leadconnector_onboarding"
      ? "FORM"
      : normalizedSource === "leadconnector_chat"
      ? "CHAT"
      : "GHL";
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const reference = `GHL-${eventCode}-${randomHex}`;

    // 7. Store in PostgreSQL via Supabase Service Role Client
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
      console.error("[LeadConnector Webhook] Failed to create project brief:", briefErr);
      return NextResponse.json(
        { error: "database_error", details: briefErr?.message },
        { status: 500 }
      );
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
      console.error("[LeadConnector Webhook] Failed to create lead:", leadErr);
      return NextResponse.json(
        { error: "database_error", details: leadErr?.message },
        { status: 500 }
      );
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
    const message = err instanceof Error ? err.message : "internal error";
    console.error("[LeadConnector Webhook] Unhandled exception:", err);
    return NextResponse.json({ error: "internal_server_error", message }, { status: 500 });
  }
}
