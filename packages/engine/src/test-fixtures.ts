import { cardProductSchema, type CardProduct, type CardProductInput } from './schema';
import type { Purchase, UserCard } from './types';

const SOURCE = [{ url: 'https://example.com/terms', checkedOn: '2026-11-21' }];
const CASHBACK = {
  kind: 'cashback' as const,
  unitLabel: '₹ cashback',
  redemptions: [{ id: 'statement', label: 'Statement credit', paisePerUnit: 1 }],
  defaultRedemptionId: 'statement',
};

export function makeCard(
  overrides: Partial<CardProductInput> & Pick<CardProductInput, 'id'>,
): CardProduct {
  return cardProductSchema.parse({
    name: overrides.id,
    issuer: 'Test Bank',
    network: 'visa',
    kind: 'credit',
    currency: CASHBACK,
    baseRule: { id: 'base', label: 'Base 1%', match: {}, earn: { type: 'percent', bps: 100 } },
    rules: [],
    caps: [],
    exclusions: [],
    origin: 'curated',
    sources: SOURCE,
    ...overrides,
  });
}

export function makeUserCard(card: CardProduct, overrides: Partial<UserCard> = {}): UserCard {
  return { id: `u-${card.id}`, cardId: card.id, statementDay: 15, ...overrides };
}

export function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    category: 'other',
    paymentMethod: 'online',
    amountPaise: 100_000,
    date: '2026-11-21',
    ...overrides,
  };
}

export const POINTS_CURRENCY = {
  kind: 'points' as const,
  unitLabel: 'points',
  redemptions: [
    { id: 'fuel', label: 'Fuel at IndianOil', paisePerUnit: 96 },
    { id: 'cash', label: 'Statement credit', paisePerUnit: 20 },
  ],
  defaultRedemptionId: 'fuel',
};
