"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  type CommercialTermsMetadata,
  type TermsClassification,
  type QuoteItem,
  type QuoteScope,
  DEFAULT_TERMS_REGISTRY,
  buildQuoteSnapshot,
  calculateQuoteTotalMinor,
  quoteItemSchema,
  quoteScopeSchema,
  validateQuoteForPublishing
} from "@/lib/domain/quotes";
import { type QuoteState, canTransition, quoteTransitions } from "@/lib/domain/states";

const createQuoteSchema = z.object({
  organizationId: z.string().uuid("Invalid organization selection"),
  projectBriefId: z.string().uuid().optional().nullable(),
  currency: z.enum(["BDT", "USD"]).default("BDT"),
  revisionLimit: z.number().int().min(0).max(10).default(2),
  validityDays: z.number().int().min(1).max(90).default(14),
  termsVersion: z.string().min(1).default("ENGINE//OS-TERMS-V1.0"),
  scope: quoteScopeSchema,
  items: z.array(quoteItemSchema).min(1, "At least one quotation item is required"),
  initialState: z.enum(["draft", "under_review", "sent"]).default("draft")
});

export type CreateQuoteResult = { ok: true; quoteId: string } | { ok: false; error: string };

export async function createQuoteAction(input: unknown): Promise<CreateQuoteResult> {
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quotation data." };
  }

  const {
    organizationId,
    projectBriefId,
    currency,
    revisionLimit,
    validityDays,
    termsVersion,
    scope,
    items,
    initialState
  } = parsed.data;

  try {
    const { supabase, user } = await requireAdmin();

    const totalMinor = calculateQuoteTotalMinor(items);
    const now = new Date();
    const validUntil = new Date(now.getTime() + validityDays * 24 * 3600 * 1000);

    const snapshot = null;
    let sentAt = null;

    if (initialState === "sent") {
      const { data: dbTerms } = await supabase
        .from("commercial_terms_versions")
        .select("version, document_id, title, classification, approved_by, approved_at, approval_reference")
        .eq("version", termsVersion)
        .maybeSingle();

      const termsMetadata: CommercialTermsMetadata | null = dbTerms
        ? {
            version: dbTerms.version,
            documentId: dbTerms.document_id,
            title: dbTerms.title,
            classification: dbTerms.classification as TermsClassification,
            approvedBy: dbTerms.approved_by,
            approvedAt: dbTerms.approved_at,
            approvalReference: dbTerms.approval_reference
          }
        : (DEFAULT_TERMS_REGISTRY[termsVersion] ?? null);

      const val = validateQuoteForPublishing({
        state: "draft",
        currency,
        totalMinor,
        revisionLimit,
        termsVersion,
        validUntil,
        scope,
        items,
        termsMetadata,
        now
      });
      if (!val.valid) {
        return { ok: false, error: `Cannot publish: ${val.errors.join("; ")}` };
      }
      sentAt = now.toISOString();
    }

    // Insert quote record
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        organization_id: organizationId,
        project_brief_id: projectBriefId || null,
        state: initialState,
        currency,
        total_minor: totalMinor,
        revision_limit: revisionLimit,
        valid_until: validUntil.toISOString(),
        terms_version: termsVersion,
        scope,
        snapshot,
        sent_at: sentAt,
        created_by: user.id
      })
      .select("id")
      .single();

    if (quoteError || !quote) {
      return { ok: false, error: quoteError?.message ?? "Failed to create quote." };
    }

    const quoteId = quote.id;

    // Insert line items
    const lineItemRows = items.map((item, idx) => ({
      quote_id: quoteId,
      label: item.label,
      description: item.description ?? null,
      quantity: item.quantity,
      unit_amount_minor: item.unitAmountMinor,
      recurring_interval: item.recurringInterval ?? null,
      display_order: item.displayOrder ?? idx + 1
    }));

    const { error: itemsError } = await supabase.from("quote_items").insert(lineItemRows);
    if (itemsError) {
      return { ok: false, error: `Quote created (${quoteId}), but line items failed: ${itemsError.message}` };
    }

    // If published immediately, build and attach immutable snapshot
    if (initialState === "sent") {
      const generatedSnapshot = buildQuoteSnapshot({
        quoteId,
        organizationId,
        currency,
        totalMinor,
        revisionLimit,
        termsVersion,
        validUntil,
        scope: scope as QuoteScope,
        items: items as QuoteItem[],
        now
      });

      await supabase
        .from("quotes")
        .update({ snapshot: generatedSnapshot })
        .eq("id", quoteId);

      await supabase.from("outbox_events").insert({
        aggregate_type: "quote",
        aggregate_id: quoteId,
        event_type: "Quote Published",
        payload: { quoteId, organizationId, totalMinor, currency },
        state: "disabled",
        idempotency_key: `quote-published:${quoteId}`
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      actor_id: user.id,
      action: `quote.${initialState}`,
      entity_type: "quote",
      entity_id: quoteId,
      after_data: { totalMinor, currency, revisionLimit, initialState }
    });

    revalidatePath("/admin/quotes");
    return { ok: true, quoteId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error creating quote.";
    return { ok: false, error: message };
  }
}

export async function publishQuoteAction(quoteId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireAdmin();

    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("id, organization_id, state, currency, total_minor, revision_limit, valid_until, terms_version, scope")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return { ok: false, error: "Quote not found." };
    }

    if (!canTransition(quote.state as QuoteState, "sent", quoteTransitions)) {
      return { ok: false, error: `Cannot transition quote from ${quote.state} to sent.` };
    }

    const { data: items, error: itemsErr } = await supabase
      .from("quote_items")
      .select("label, description, quantity, unit_amount_minor, recurring_interval, display_order")
      .eq("quote_id", quoteId)
      .order("display_order", { ascending: true });

    if (itemsErr || !items || items.length === 0) {
      return { ok: false, error: "Quote has no line items." };
    }

    const now = new Date();
    const validUntilDate = quote.valid_until ? new Date(quote.valid_until) : null;

    const { data: dbTerms } = quote.terms_version
      ? await supabase
          .from("commercial_terms_versions")
          .select("version, document_id, title, classification, approved_by, approved_at, approval_reference")
          .eq("version", quote.terms_version)
          .maybeSingle()
      : { data: null };

    const termsMetadata: CommercialTermsMetadata | null = dbTerms
      ? {
          version: dbTerms.version,
          documentId: dbTerms.document_id,
          title: dbTerms.title,
          classification: dbTerms.classification as TermsClassification,
          approvedBy: dbTerms.approved_by,
          approvedAt: dbTerms.approved_at,
          approvalReference: dbTerms.approval_reference
        }
      : quote.terms_version
      ? (DEFAULT_TERMS_REGISTRY[quote.terms_version] ?? null)
      : null;

    const val = validateQuoteForPublishing({
      state: quote.state as QuoteState,
      currency: quote.currency as "BDT" | "USD",
      totalMinor: quote.total_minor,
      revisionLimit: quote.revision_limit,
      termsVersion: quote.terms_version,
      validUntil: validUntilDate,
      scope: quote.scope,
      items: items.map((i) => ({
        label: i.label,
        description: i.description,
        quantity: Number(i.quantity),
        unitAmountMinor: i.unit_amount_minor,
        recurringInterval: i.recurring_interval,
        displayOrder: i.display_order
      })),
      termsMetadata,
      now
    });

    if (!val.valid) {
      return { ok: false, error: val.errors.join("; ") };
    }

    const snapshot = buildQuoteSnapshot({
      quoteId: quote.id,
      organizationId: quote.organization_id,
      currency: quote.currency as "BDT" | "USD",
      totalMinor: quote.total_minor,
      revisionLimit: quote.revision_limit,
      termsVersion: quote.terms_version!,
      validUntil: validUntilDate!,
      scope: quote.scope as QuoteScope,
      items: items.map((i) => ({
        label: i.label,
        description: i.description,
        quantity: Number(i.quantity),
        unitAmountMinor: i.unit_amount_minor,
        recurringInterval: i.recurring_interval as "week" | "month" | "year" | null | undefined,
        displayOrder: i.display_order
      })),
      now
    });

    const { error: updateErr } = await supabase
      .from("quotes")
      .update({
        state: "sent",
        snapshot,
        sent_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq("id", quoteId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await supabase.from("outbox_events").insert({
      aggregate_type: "quote",
      aggregate_id: quoteId,
      event_type: "Quote Published",
      payload: { quoteId, organizationId: quote.organization_id, totalMinor: quote.total_minor },
      state: "disabled",
      idempotency_key: `quote-published:${quoteId}`
    });

    await supabase.from("audit_logs").insert({
      organization_id: quote.organization_id,
      actor_id: user.id,
      action: "quote.published",
      entity_type: "quote",
      entity_id: quoteId,
      after_data: { state: "sent", publishedAt: now.toISOString() }
    });

    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/quotes/${quoteId}`);
    revalidatePath(`/quotes/${quoteId}`);

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error publishing quote.";
    return { ok: false, error: message };
  }
}

export async function updateQuoteStatusAction(
  quoteId: string,
  newState: QuoteState
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireAdmin();

    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("id, state, organization_id")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return { ok: false, error: "Quote not found." };
    }

    if (!canTransition(quote.state as QuoteState, newState, quoteTransitions)) {
      return { ok: false, error: `Invalid transition from ${quote.state} to ${newState}.` };
    }

    const { error: updateErr } = await supabase
      .from("quotes")
      .update({ state: newState, updated_at: new Date().toISOString() })
      .eq("id", quoteId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    await supabase.from("audit_logs").insert({
      organization_id: quote.organization_id,
      actor_id: user.id,
      action: `quote.${newState}`,
      entity_type: "quote",
      entity_id: quoteId,
      before_data: { state: quote.state },
      after_data: { state: newState }
    });

    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return { ok: false, error: message };
  }
}
