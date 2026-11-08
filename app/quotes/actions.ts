"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  type CommercialTermsMetadata,
   type TermsClassification,
  DEFAULT_TERMS_REGISTRY,
  evaluateTermsAcceptanceEligibility
} from "@/lib/domain/quotes";

const decideQuoteSchema = z.object({
  quoteId: z.string().uuid("Invalid quotation identifier"),
  decision: z.enum(["accepted", "rejected"]),
  termsAccepted: z.boolean().optional(),
  termsVersion: z.string().optional(),
  reason: z.string().max(1000).optional()
});

export type DecideQuoteResult =
  | { ok: true; decision: "accepted" | "rejected"; orderId?: string; isNonBindingStaging?: boolean }
  | { ok: false; error: string };

export async function decideQuoteAction(input: unknown): Promise<DecideQuoteResult> {
  const parsed = decideQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid quotation submission." };
  }

  const { quoteId, decision, termsAccepted } = parsed.data;

  if (decision === "accepted" && !termsAccepted) {
    return { ok: false, error: "You must accept the commercial terms and scope to proceed." };
  }

  try {
    const { supabase, user } = await requireUser();

    // 1. Fetch quote metadata to validate organization signatory authority & terms governance
    const { data: quote, error: quoteErr } = await supabase
      .from("quotes")
      .select("id, organization_id, state, valid_until, terms_version, snapshot")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quote) {
      return { ok: false, error: "Quotation not found or you lack permission for this organization." };
    }

    // 2. Verify caller is an authorized organization signatory (owner or admin)
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", quote.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return {
        ok: false,
        error: "Only an authorized organization owner or administrator may sign off on a commercial quotation."
      };
    }

    let isNonBindingStaging = false;

    // 3. Enforce server-authoritative terms classification & snapshot governance before accepting
    if (decision === "accepted") {
      if (!quote.terms_version) {
        return {
          ok: false,
          error: "This quotation lacks a commercial terms version and cannot bind an order."
        };
      }

      // Query database commercial_terms_versions registry (falls back to DEFAULT_TERMS_REGISTRY only if table query fails)
      let termsMeta: CommercialTermsMetadata | null = null;
      const { data: dbTerms } = await supabase
        .from("commercial_terms_versions")
        .select("version, document_id, title, classification, approved_by, approved_at, approval_reference")
        .eq("version", quote.terms_version)
        .maybeSingle();

      if (dbTerms) {
        termsMeta = {
          version: dbTerms.version,
          documentId: dbTerms.document_id,
          title: dbTerms.title,
          classification: dbTerms.classification as TermsClassification,
          approvedBy: dbTerms.approved_by,
          approvedAt: dbTerms.approved_at,
          approvalReference: dbTerms.approval_reference
        };
      } else {
        termsMeta = DEFAULT_TERMS_REGISTRY[quote.terms_version] ?? null;
      }

      const activeEnv = process.env.ENGINE_OS_ENV === "production" ? "production" : "staging";
      const eligibility = evaluateTermsAcceptanceEligibility(termsMeta, activeEnv);
      if (!eligibility.allowed) {
        return {
          ok: false,
          error: eligibility.reason ?? "This quotation references unapproved legal terms and cannot bind an order."
        };
      }
      isNonBindingStaging = eligibility.isNonBindingStaging;

      if (!quote.snapshot) {
        return { ok: false, error: "Quotation snapshot is missing. Please contact staff to republish." };
      }
      if (!quote.valid_until || new Date(quote.valid_until) <= new Date()) {
        return { ok: false, error: "This quotation has expired and is no longer open for acceptance." };
      }
    }

    // 4. Execute atomic PostgreSQL RPC
    const { data, error } = await supabase.rpc("decide_quote", {
      p_quote_id: quoteId,
      p_decision: decision
    });

    if (error) {
      if (error.message.includes("quote_not_found") || error.message.includes("unauthorized_signatory")) {
        return { ok: false, error: "Quotation not found or you lack signatory permission for this organization." };
      }
      if (error.message.includes("unapproved_terms_version")) {
        return {
          ok: false,
          error: "Database governance check blocked acceptance: the referenced commercial terms version is not approved for binding acceptance."
        };
      }
      if (error.message.includes("quote_not_acceptable")) {
        return { ok: false, error: "This quotation is not open for acceptance or has expired." };
      }
      if (error.message.includes("missing_snapshot")) {
        return { ok: false, error: "Quotation snapshot is missing. Please contact staff to republish." };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath(`/quotes/${quoteId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");

    return {
      ok: true,
      decision,
      orderId: decision === "accepted" ? (data as string) : undefined,
      isNonBindingStaging
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { ok: false, error: message };
  }
}
