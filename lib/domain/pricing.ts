import { z } from "zod";

const priceVersionSchema = z.object({
  state: z.literal("approved"),
  amountMinor: z.number().int().positive(),
  currency: z.enum(["BDT", "USD"]),
  market: z.enum(["BD", "US", "GLOBAL"]),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable(),
  approvedAt: z.coerce.date(),
  approvedBy: z.string().uuid()
});

export type PriceVersion = z.infer<typeof priceVersionSchema>;

export type PackageForPricing = {
  active: boolean;
  orderable: boolean;
  approved: boolean;
  serviceActive: boolean;
  prices: readonly unknown[];
};

export function eligiblePrice(pkg: PackageForPricing, market: "BD" | "US", at: Date): PriceVersion | null {
  if (!pkg.active || !pkg.orderable || !pkg.approved || !pkg.serviceActive) return null;

  const eligible = pkg.prices.flatMap((candidate) => {
    const parsed = priceVersionSchema.safeParse(candidate);
    if (!parsed.success) return [];
    const price = parsed.data;
    const marketMatches = price.market === market || price.market === "GLOBAL";
    const withinWindow = price.validFrom <= at && (!price.validTo || price.validTo >= at);
    return marketMatches && withinWindow ? [price] : [];
  });

  return eligible.length === 1 ? eligible[0] : null;
}
