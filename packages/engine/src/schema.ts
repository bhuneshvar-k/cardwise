import { z } from 'zod';

/** Spend categories. Keep in sync with merchant data and the UI labels. */
export const CATEGORIES = [
  'dining',
  'food_delivery',
  'grocery',
  'fuel',
  'online_shopping',
  'shopping',
  'utilities',
  'travel',
  'transport',
  'entertainment',
  'ott',
  'rent',
  'insurance',
  'education',
  'government',
  'wallet_load',
  'gift_cards',
  'jewellery',
  'international',
  'other',
] as const;
export const categorySchema = z.enum(CATEGORIES);
export type Category = z.infer<typeof categorySchema>;

/** How the purchase is paid. `amazon_pay` = paying through Amazon Pay with the card. */
export const PAYMENT_METHODS = ['in_store', 'online', 'upi', 'amazon_pay'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const NETWORKS = ['visa', 'mastercard', 'rupay', 'amex', 'diners'] as const;
export const networkSchema = z.enum(NETWORKS);

/** Facts about the user's own copy of a card that change which rule applies. */
export const USER_ATTRIBUTES = ['amazonPrime'] as const;
export const userAttributeSchema = z.enum(USER_ATTRIBUTES);
export type UserAttribute = z.infer<typeof userAttributeSchema>;

const mccRangeSchema = z.union([
  z.number().int().min(0).max(9999),
  z.tuple([z.number().int().min(0).max(9999), z.number().int().min(0).max(9999)]),
]);

/** All listed fields must match (AND); values inside a list are alternatives (OR). */
export const matchSchema = z
  .object({
    merchants: z.array(z.string().min(1)).optional(),
    merchantTags: z.array(z.string().min(1)).optional(),
    notMerchants: z.array(z.string().min(1)).optional(),
    categories: z.array(categorySchema).optional(),
    mccs: z.array(mccRangeSchema).optional(),
    paymentMethods: z.array(paymentMethodSchema).optional(),
    emi: z.boolean().optional(),
    minAmountPaise: z.number().int().nonnegative().optional(),
    maxAmountPaise: z.number().int().nonnegative().optional(),
  })
  .strict();
export type Match = z.infer<typeof matchSchema>;

/**
 * - `percent`: reward units = amount × bps / 10 000 (use for cashback, where units are paise).
 * - `per_spend` + `blocks`: floor(amount / perPaise) × units — "2 points per ₹150".
 * - `per_spend` + `proportional`: floor(amount × units / perPaise) — "5% as fuel points".
 */
export const earnSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('percent'), bps: z.number().nonnegative().max(10_000) }).strict(),
  z
    .object({
      type: z.literal('per_spend'),
      units: z.number().nonnegative(),
      perPaise: z.number().int().positive(),
      mode: z.enum(['blocks', 'proportional']),
    })
    .strict(),
]);
export type Earn = z.infer<typeof earnSchema>;

export const capPeriodSchema = z.enum([
  'transaction',
  'statement_cycle',
  'calendar_month',
  'calendar_quarter',
  'calendar_year',
]);
export type CapPeriod = z.infer<typeof capPeriodSchema>;

/** A cap in reward units. Several rules can share one cap id. */
export const capSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    period: capPeriodSchema,
    maxUnits: z.number().nonnegative().optional(),
    /** Cap that depends on card age, e.g. 250 points for 6 months, then 150. */
    byCardAge: z
      .array(
        z
          .object({
            untilMonth: z.number().int().positive().optional(),
            maxUnits: z.number().nonnegative(),
          })
          .strict(),
      )
      .min(1)
      .optional(),
  })
  .strict()
  .refine((c) => (c.maxUnits === undefined) !== (c.byCardAge === undefined), {
    message: 'Set exactly one of maxUnits or byCardAge',
  });
export type Cap = z.infer<typeof capSchema>;

export const earnRuleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    match: matchSchema,
    requires: z.partialRecord(userAttributeSchema, z.boolean()).optional(),
    earn: earnSchema,
    capIds: z.array(z.string().min(1)).optional(),
    /** What spend above the cap earns. Default `nothing` — the conservative reading. */
    afterCap: z.enum(['base', 'nothing']).optional(),
  })
  .strict();
export type EarnRule = z.infer<typeof earnRuleSchema>;

export const exclusionSchema = z
  .object({ id: z.string().min(1), label: z.string().min(1), match: matchSchema })
  .strict();
export type Exclusion = z.infer<typeof exclusionSchema>;

export const surchargeWaiverSchema = z
  .object({
    match: matchSchema,
    bps: z.number().positive().max(10_000),
    minAmountPaise: z.number().int().nonnegative().optional(),
    maxAmountPaise: z.number().int().positive().optional(),
    /** Max waiver per statement cycle, in paise. */
    cycleCapPaise: z.number().int().positive().optional(),
  })
  .strict();
export type SurchargeWaiver = z.infer<typeof surchargeWaiverSchema>;

export const redemptionSchema = z
  .object({ id: z.string().min(1), label: z.string().min(1), paisePerUnit: z.number().positive() })
  .strict();

export const currencySchema = z
  .object({
    kind: z.enum(['cashback', 'points', 'miles']),
    unitLabel: z.string().min(1),
    redemptions: z.array(redemptionSchema).min(1),
    defaultRedemptionId: z.string().min(1),
  })
  .strict()
  .refine((c) => c.redemptions.some((r) => r.id === c.defaultRedemptionId), {
    message: 'defaultRedemptionId must match a redemption',
  });
export type Currency = z.infer<typeof currencySchema>;

export const sourceSchema = z
  .object({
    url: z.url(),
    checkedOn: z.iso.date(),
    note: z.string().optional(),
  })
  .strict();

export const reviewSchema = z
  .object({ reviewedOn: z.iso.date(), reviewedBy: z.string().min(1) })
  .strict();

export const cardProductSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    issuer: z.string().min(1),
    network: networkSchema,
    kind: z.enum(['credit', 'debit']),
    currency: currencySchema,
    baseRule: earnRuleSchema,
    rules: z.array(earnRuleSchema),
    caps: z.array(capSchema),
    exclusions: z.array(exclusionSchema),
    surchargeWaivers: z.array(surchargeWaiverSchema).default([]),
    attributes: z.array(userAttributeSchema).default([]),
    origin: z.enum(['curated', 'cardadvisor']),
    /** CardAdvisor `cardKey`, so curated cards replace the imported version. */
    cardAdvisorKey: z.string().optional(),
    sources: z.array(sourceSchema).min(1),
    review: reviewSchema.optional(),
    notes: z.array(z.string()).default([]),
  })
  .strict()
  .superRefine((card, ctx) => {
    const capIds = new Set(card.caps.map((c) => c.id));
    for (const rule of [card.baseRule, ...card.rules]) {
      for (const capId of rule.capIds ?? []) {
        if (!capIds.has(capId)) {
          ctx.addIssue({
            code: 'custom',
            message: `Rule ${rule.id} references unknown cap ${capId}`,
          });
        }
      }
    }
    const ruleIds = [card.baseRule, ...card.rules].map((r) => r.id);
    if (new Set(ruleIds).size !== ruleIds.length) {
      ctx.addIssue({ code: 'custom', message: `Duplicate rule ids on ${card.id}` });
    }
  });
export type CardProduct = z.infer<typeof cardProductSchema>;
export type CardProductInput = z.input<typeof cardProductSchema>;

export const merchantSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    aliases: z.array(z.string()).default([]),
    category: categorySchema,
    tags: z.array(z.string()).default([]),
    mccs: z.array(z.number().int()).default([]),
    /** Sub-purchases that earn differently, e.g. Amazon gift cards or wallet loads. */
    variants: z
      .array(z.object({ id: z.string(), label: z.string(), category: categorySchema }).strict())
      .default([]),
    online: z.boolean().default(true),
    inStore: z.boolean().default(false),
  })
  .strict();
export type Merchant = z.infer<typeof merchantSchema>;
export type MerchantInput = z.input<typeof merchantSchema>;
