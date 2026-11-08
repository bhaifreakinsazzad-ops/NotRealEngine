import { z } from "zod";
import { type QuoteState, canTransition, quoteTransitions } from "./states";

export const APPROVED_TERMS_VERSIONS = new Set<string>([
  "ENGINE//OS-TERMS-V1.0",
  "STANDARD-V1.0",
  "STAGING-TEST-TERMS-V1.0"
]);

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
  now?: Date;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const now = params.now ?? new Date();

  if (params.state !== "under_review" && params.state !== "draft") {
    errors.push(`Cannot publish quote in state "${params.state}". Must be "draft" or "under_review".`);
  }

  if (!params.termsVersion || params.termsVersion.trim() === "") {
    errors.push("Terms version is required for publishing.");
  } else if (!APPROVED_TERMS_VERSIONS.has(params.termsVersion)) {
    errors.push(`Terms version "${params.termsVersion}" is not an approved commercial terms version.`);
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
  validUntil: Date;
  scope: QuoteScope;
  items: QuoteItem[];
  now?: Date;
}): QuoteSnapshot {
  return {
    quoteId: params.quoteId,
    organizationId: params.organizationId,
    currency: params.currency,
    totalMinor: params.totalMinor,
    revisionLimit: params.revisionLimit,
    termsVersion: params.termsVersion,
    validUntil: params.validUntil.toISOString(),
    scope: params.scope,
    items: params.items,
    publishedAt: (params.now ?? new Date()).toISOString()
  };
}

export { canTransition, quoteTransitions };
