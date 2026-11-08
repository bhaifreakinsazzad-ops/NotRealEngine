"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const decideQuoteSchema = z.object({
  quoteId: z.string().uuid("Invalid quotation identifier"),
  decision: z.enum(["accepted", "rejected"]),
  termsAccepted: z.boolean().optional(),
  reason: z.string().max(1000).optional()
});

export type DecideQuoteResult =
  | { ok: true; decision: "accepted" | "rejected"; orderId?: string }
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
    const { supabase } = await requireUser();

    const { data, error } = await supabase.rpc("decide_quote", {
      p_quote_id: quoteId,
      p_decision: decision
    });

    if (error) {
      if (error.message.includes("quote_not_found")) {
        return { ok: false, error: "Quotation not found or you lack permission for this organization." };
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
      orderId: decision === "accepted" ? (data as string) : undefined
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { ok: false, error: message };
  }
}
