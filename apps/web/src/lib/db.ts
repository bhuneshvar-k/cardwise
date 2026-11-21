import Dexie, { type EntityTable } from 'dexie';
import { categorySchema, userAttributeSchema } from '@cardwise/engine';
import { z } from 'zod';

const isoDate = z.iso.date();
const timestamps = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Soft delete so a later sync can pass deletions on. */
  deletedAt: z.iso.datetime().nullable(),
};

/** The user's copy of a card. Product id and preferences only — never card numbers. */
export const storedUserCardSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  nickname: z.string().trim().max(40).optional(),
  attributes: z.partialRecord(userAttributeSchema, z.boolean()).optional(),
  issuedOn: isoDate.optional(),
  statementDay: z.number().int().min(1).max(28).optional(),
  redemptionId: z.string().optional(),
  paisePerUnitOverride: z.number().positive().max(10_000).optional(),
  ...timestamps,
});
export type StoredUserCard = z.infer<typeof storedUserCardSchema>;

export const storedSpendSchema = z.object({
  id: z.string().min(1),
  userCardId: z.string().min(1),
  cardId: z.string().min(1),
  merchantId: z.string().optional(),
  category: categorySchema,
  date: isoDate,
  amountPaise: z.number().int().positive(),
  rewardUnits: z.number().nonnegative(),
  valuePaise: z.number().int().nonnegative(),
  waiverPaise: z.number().int().nonnegative().optional(),
  allocations: z.array(z.object({ capId: z.string(), units: z.number().nonnegative() })),
  ...timestamps,
});
export type StoredSpend = z.infer<typeof storedSpendSchema>;

export const settingsSchema = z.object({
  id: z.literal('settings'),
  showOtherCards: z.boolean().default(false),
});
export type Settings = z.infer<typeof settingsSchema>;

export class CardwiseDb extends Dexie {
  userCards!: EntityTable<StoredUserCard, 'id'>;
  spends!: EntityTable<StoredSpend, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('cardwise');
    this.version(1).stores({
      userCards: 'id, cardId, updatedAt',
      spends: 'id, userCardId, date, updatedAt',
      settings: 'id',
    });
  }
}

export const db = new CardwiseDb();
