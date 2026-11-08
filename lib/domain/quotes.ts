import { z } from "zod";
import { type QuoteState, canTransition, quoteTransitions } from "./states";

export type TermsClassification =
  | "draft"
  | "staging_synthetic"
  | "approved_production"
  | "retired";

export interface CommercialTermsMetadata {
  version: string;
  documentId: string;
  title: string;
  classification: TermsClassification;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalReference: string | null;
}

/**
 * Authoritative default registry of commercial terms versions.
 * IMPORTANT:
 * - "ENGINE//OS-TERMS-V1.0" and "STANDARD-V1.0" are strictly classified as "draft"
 *   until founder/counsel approval metadata is recorded in public.commercial_terms_versions.
 * - "STAGING-TEST-TERMS-V1.0" is classified as "staging_synthetic" for non-binding staging tests.
 * - No hardcoded terms version is automatically treated as "approved_production".
 */
export const DEFAULT_TERMS_REGISTRY: Record<string, CommercialTermsMetadata> = {
  "ENGINE//OS-TERMS-V1.0": {
    version: "ENGINE//OS-TERMS-V1.0",
    documentId: "DOC-TERMS-2026-V1",
    title: "ENGINE//OS Master Commercial Terms v1.0 (Draft Pending Founder Approval)",
    classification: "draft",
    approvedBy: null,
    approvedAt: null,
    approvalReference: null
  },
  "STANDARD-V1.0": {
    version: "STANDARD-V1.0",
    documentId: "DOC-STD-2026-V1",
    title: "Standard Commercial Proposal Terms v1.0 (Draft Pending Founder Approval)",
    classification: "draft",
    approvedBy: null,
    approvedAt: null,
    approvalReference: null
  },
  "STAGING-TEST-TERMS-V1.0": {
    version: "STAGING-TEST-TERMS-V1.0",
    documentId: "DOC-STG-SYNTHETIC-V1",
    title: "Non-Binding Synthetic Staging Verification Terms v1.0",
    classification: "staging_synthetic",
    approvedBy: null,
    approvedAt: null,
    approvalReference: null
  }
};

/**
 * Evaluates whether a terms metadata record is eligible for customer quotation acceptance
 * in the specified environment ("staging" vs "production").
 */
export function evaluateTermsAcceptanceEligibility(
  terms: CommercialTermsMetadata | null | undefined,
  environment: "staging" | "production" = process.env.ENGINE_OS_ENV === "production" ? "production" : "staging"
): { allowed: boolean; isNonBindingStaging: boolean; reason?: string } {
  if (!terms) {
    return {
      allowed: false,
      isNonBindingStaging: false,
      reason: "Quotation terms version is not registered in the commercial terms registry."
    };
  }

  if (terms.classification === "retired") {
    return {
      allowed: false,
      isNonBindingStaging: false,
      reason: `Terms version "${terms.version}" is retired and can no longer be accepted.`
    };
  }

  if (terms.classification === "draft") {
    return {
      allowed: false,
      isNonBindingStaging: false,
      reason: `Terms version "${terms.version}" (${terms.documentId}) is currently in DRAFT status pending founder legal approval. Binding customer acceptance is disabled until approved production terms are activated.`
    };
  }

  if (terms.classification === "staging_synthetic") {
    if (environment === "production") {
      return {
        allowed: false,
        isNonBindingStaging: false,
        reason: `Synthetic staging terms "${terms.version}" cannot be used for binding production orders.`
      };
    }
    return {
      allowed: true,
      isNonBindingStaging: true
    };
  }

  if (terms.classification === "approved_production") {
    if (!terms.approvedBy || !terms.approvedAt || !terms.approvalReference?.trim()) {
      return {
        allowed: false,
        isNonBindingStaging: false,
        reason: `Terms version "${terms.version}" lacks verified founder approval metadata (approvedBy, approvedAt, approvalReference).`
      };
    }
    return {
      allowed: true,
      isNonBindingStaging: false
    };
  }

  return {
    allowed: false,
    isNonBindingStaging: false,
    reason: "Unrecognized terms classification."
  };
}

export const quoteItemSchema = z.object({
  label: z.string().min(2, "Item label is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  quantity: z.number().positive("Quantity must be positive").default(1),
  unitAmountMinor: z.number().int().nonnegative("Unit amount must be non-negative integer minor units"),
  recurringInterval: z.enum(["week", "month", "year"]).optional().nullable(),
  displayOrder: z.number().int().default(1)
});

export type QuoteItem = z.infer<typeof quoteItemSchema>;

export const quoteScopeSchema = z.object({
  summary: z.string().min(10, "Summary must be at least 10 characters").max(2000),
  deliverables: z.array(z.string().min(2)).min(1, "At least one deliverable is required"),
  exclusions: z.array(z.string().min(2)).default([]),
  milestones: z.array(z.string().min(2)).default([])
});

export type QuoteScope = z.infer<typeof quoteScopeSchema>;

export const quoteSnapshotSchema = z.object({
  quoteId: z.string().uuid(),
  organizationId: z.string().uuid(),
  currency: z.enum(["BDT", "USD"]),
  totalMinor: z.number().int().positive(),
  revisionLimit: z.number().int().nonnegative(),
  termsVersion: z.string().min(1),
  termsDocumentId: z.string().min(1).optional(),
  termsClassification: z.enum(["draft", "staging_synthetic", "approved_production", "retired"]).optional(),
  validUntil: z.string().datetime(),
  scope: quoteScopeSchema,
  items: z.array(quoteItemSchema).min(1),
  publishedAt: z.string().datetime()
});

export type QuoteSnapshot = z.infer<typeof quoteSnapshotSchema>;

export function calculateQuoteTotalMinor(items: readonly QuoteItem[]): number {
  return items.reduce((acc, item) => {
    const itemTotal = Math.round(item.quantity * item.unitAmountMinor);
    return acc + itemTotal;
  }, 0);
}

export function validateQuoteForPublishing(params: {
  state: QuoteState;
  currency: "BDT" | "USD";
  totalMinor: number;
  revisionLimit: number;
  termsVersion: string | null;
  validUntil: Date | null;
  scope: unknown;
  items: readonly unknown[];
  termsMetadata?: CommercialTermsMetadata | null;
  now?: Date;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const now = params.now ?? new Date();

  if (params.state !== "under_review" && params.state !== "draft") {
    errors.push(`Cannot publish quote in state "${params.state}". Must be "draft" or "under_review".`);
  }

  if (!params.termsVersion || params.termsVersion.trim() === "") {
    errors.push("Terms version is required for publishing.");
  } else {
    const resolvedTerms = params.termsMetadata ?? DEFAULT_TERMS_REGISTRY[params.termsVersion];
    if (!resolvedTerms) {
      errors.push(`Terms version "${params.termsVersion}" is not registered in the commercial terms registry.`);
    } else if (resolvedTerms.classification === "retired") {
      errors.push(`Terms version "${params.termsVersion}" is retired and cannot be published.`);
    }
  }

  if (!params.validUntil) {
    errors.push("Validity date is required.");
  } else if (params.validUntil <= now) {
    errors.push("Validity date must be in the future.");
  }

  if (params.totalMinor <= 0) {
    errors.push("Quote total must be greater than zero.");
  }

  const scopeParsed = quoteScopeSchema.safeParse(params.scope);
  if (!scopeParsed.success) {
    errors.push(...scopeParsed.error.issues.map((i) => `Scope: ${i.message}`));
  }

  if (!params.items || params.items.length === 0) {
    errors.push("Quote must have at least one line item.");
  } else {
    for (const [idx, item] of params.items.entries()) {
      const itemParsed = quoteItemSchema.safeParse(item);
      if (!itemParsed.success) {
        errors.push(...itemParsed.error.issues.map((i) => `Item ${idx + 1}: ${i.message}`));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function buildQuoteSnapshot(params: {
  quoteId: string;
  organizationId: string;
  currency: "BDT" | "USD";
  totalMinor: number;
  revisionLimit: number;
  termsVersion: string;
  termsMetadata?: CommercialTermsMetadata | null;
  validUntil: Date;
  scope: QuoteScope;
  items: QuoteItem[];
  now?: Date;
}): QuoteSnapshot {
  const resolvedTerms = params.termsMetadata ?? DEFAULT_TERMS_REGISTRY[params.termsVersion];
  return {
    quoteId: params.quoteId,
    organizationId: params.organizationId,
    currency: params.currency,
    totalMinor: params.totalMinor,
    revisionLimit: params.revisionLimit,
    termsVersion: params.termsVersion,
    termsDocumentId: resolvedTerms?.documentId ?? "DOC-UNSPECIFIED",
    termsClassification: resolvedTerms?.classification ?? "draft",
    validUntil: params.validUntil.toISOString(),
    scope: params.scope,
    items: params.items,
    publishedAt: (params.now ?? new Date()).toISOString()
  };
}

export { canTransition, quoteTransitions };
