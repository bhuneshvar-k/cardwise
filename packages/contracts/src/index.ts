import { cardProductSchema, categorySchema, userAttributeSchema } from '@cardwise/engine';
import { z } from 'zod';

const isoDate = z.iso.date();
const timestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Soft delete, so sync can pass deletions on. */
  deletedAt: z.iso.datetime().nullable(),
};

/** The user's copy of a card. Product id and preferences only — never card numbers. */
export const storedUserCardSchema = z.object({
  id: z.string().min(1).max(64),
  cardId: z.string().min(1).max(120),
  nickname: z.string().trim().max(40).optional(),
  attributes: z.partialRecord(userAttributeSchema, z.boolean()).optional(),
  issuedOn: isoDate.optional(),
  statementDay: z.number().int().min(1).max(28).optional(),
  redemptionId: z.string().max(64).optional(),
  paisePerUnitOverride: z.number().positive().max(10_000).optional(),
  ...timestamps,
});
export type StoredUserCard = z.infer<typeof storedUserCardSchema>;

export const storedSpendSchema = z.object({
  id: z.string().min(1).max(64),
  userCardId: z.string().min(1).max(64),
  cardId: z.string().min(1).max(120),
  merchantId: z.string().max(64).optional(),
  category: categorySchema,
  date: isoDate,
  amountPaise: z.number().int().positive().max(1_000_000_000),
  rewardUnits: z.number().nonnegative(),
  valuePaise: z.number().int().nonnegative(),
  waiverPaise: z.number().int().nonnegative().optional(),
  allocations: z
    .array(z.object({ capId: z.string().max(120), units: z.number().nonnegative() }))
    .max(20),
  ...timestamps,
});
export type StoredSpend = z.infer<typeof storedSpendSchema>;

export const settingsSchema = z.object({
  id: z.literal('settings'),
  showOtherCards: z.boolean().default(false),
  updatedAt: z.iso.datetime().optional(),
});
export type Settings = z.infer<typeof settingsSchema>;

/* ------------------------------------------------------------------ sync */

export const SYNC_COLLECTIONS = ['userCards', 'spends', 'settings'] as const;
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

/** Most records one sync request may carry; the client sends the rest next time. */
export const MAX_SYNC_CHANGES = 500;

export const syncRequestSchema = z.object({
  /** Highest server version this device has seen. */
  cursor: z.number().int().nonnegative(),
  changes: z
    .object({
      userCards: z.array(storedUserCardSchema).default([]),
      spends: z.array(storedSpendSchema).default([]),
      settings: z.array(settingsSchema).max(1).default([]),
    })
    .refine((c) => c.userCards.length + c.spends.length + c.settings.length <= MAX_SYNC_CHANGES, {
      message: `At most ${MAX_SYNC_CHANGES} changes per request`,
    }),
});
export type SyncRequest = z.infer<typeof syncRequestSchema>;
export type SyncRequestInput = z.input<typeof syncRequestSchema>;

export interface SyncResponse {
  cursor: number;
  changes: { userCards: StoredUserCard[]; spends: StoredSpend[]; settings: Settings[] };
  /** True when more changes are waiting; the client should sync again. */
  hasMore: boolean;
}

/* --------------------------------------------------------------- catalogue */

export const catalogueResponseSchema = z.object({
  version: z.string(),
  cards: z.array(cardProductSchema),
});
export type CatalogueResponse = z.infer<typeof catalogueResponseSchema>;

/* ----------------------------------------------------------------- reports */

export const reportRequestSchema = z.object({
  cardId: z.string().min(1).max(120),
  merchantId: z.string().max(64).optional(),
  category: categorySchema.optional(),
  message: z.string().trim().min(5, 'Tell us a little more').max(1000),
  /** What the app showed, so an admin can reproduce it. */
  shown: z
    .object({
      ruleLabel: z.string().max(200).optional(),
      effectiveBps: z.number().int().optional(),
    })
    .optional(),
});
export type ReportRequest = z.infer<typeof reportRequestSchema>;

/* ----------------------------------------------------------------- privacy */

/** Bump when the privacy notice changes; users are asked to agree again. */
export const PRIVACY_NOTICE_VERSION = '2026-11-21';

/** Spend logs older than this are deleted from the server. */
export const SPEND_RETENTION_MONTHS = 18;

export interface ApiError {
  error: string;
  details?: unknown;
}
