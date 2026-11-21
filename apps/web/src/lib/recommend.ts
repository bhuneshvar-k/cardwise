import {
  computeCapUsage,
  rankCards,
  type CardProduct,
  type Category,
  type Evaluation,
  type PaymentMethod,
  type Purchase,
  type RankEntry,
} from '@cardwise/engine';
import { getCard, getMerchant } from '@cardwise/data';
import type { StoredSpend, StoredUserCard } from './db';
import type { SpendInput } from './repo';

export interface PurchaseChoice {
  merchantId?: string;
  variantId?: string;
  category?: Category;
  paymentMethod: PaymentMethod;
  amountPaise?: number;
  emi?: boolean;
}

/** Turn what the user picked into an engine purchase; null if nothing is picked yet. */
export function buildPurchase(choice: PurchaseChoice, today: string): Purchase | null {
  const base = {
    paymentMethod: choice.paymentMethod,
    amountPaise: choice.amountPaise,
    emi: choice.emi,
    date: today,
  };
  if (choice.merchantId) {
    const merchant = getMerchant(choice.merchantId);
    if (!merchant) return null;
    const variant = merchant.variants.find((v) => v.id === choice.variantId);
    return {
      ...base,
      merchantId: merchant.id,
      merchantTags: merchant.tags,
      category: variant?.category ?? merchant.category,
      mcc: merchant.mccs[0],
    };
  }
  if (choice.category) return { ...base, category: choice.category };
  return null;
}

/** Rank the user's own cards, with cap usage worked out from their spend log. */
export function recommend(
  userCards: readonly StoredUserCard[],
  spends: readonly StoredSpend[],
  purchase: Purchase,
): Evaluation[] {
  const entries: RankEntry[] = userCards.flatMap((userCard) => {
    const card = getCard(userCard.cardId);
    if (!card) return [];
    return [{ card, userCard, usage: computeCapUsage(card, userCard, spends, purchase.date) }];
  });
  return rankCards(entries, purchase);
}

/** Best cards the user doesn't hold, valued at each card's default redemption. */
export function recommendOtherCards(
  catalogue: readonly CardProduct[],
  ownedCardIds: readonly string[],
  purchase: Purchase,
  limit: number,
): Evaluation[] {
  const owned = new Set(ownedCardIds);
  const entries = catalogue
    .filter((card) => !owned.has(card.id))
    .map((card) => ({ card, userCard: { id: `other-${card.id}`, cardId: card.id }, usage: {} }));
  return rankCards(entries, purchase)
    .filter((e) => e.eligible && e.totalValuePaise > 0)
    .slice(0, limit);
}

export function toSpendInput(evaluation: Evaluation, purchase: Purchase): SpendInput {
  return {
    userCardId: evaluation.userCardId,
    cardId: evaluation.cardId,
    merchantId: purchase.merchantId,
    category: purchase.category,
    date: purchase.date,
    amountPaise: evaluation.amountPaise,
    rewardUnits: evaluation.rewardUnits,
    valuePaise: evaluation.rewardValuePaise,
    waiverPaise: evaluation.waiverPaise || undefined,
    allocations: evaluation.allocations,
  };
}
