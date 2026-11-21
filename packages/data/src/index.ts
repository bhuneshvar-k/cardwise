import { cardProductSchema, type CardProduct } from '@cardwise/engine';
import { z } from 'zod';
import imported from './generated/cardadvisor-cards.json';
import { amazonPayIcici } from './cards/amazon-pay-icici';
import { hdfcIndianOil } from './cards/hdfc-indianoil';
import { hsbcLivePlus } from './cards/hsbc-live-plus';

export { merchants, getMerchant, searchMerchants } from './merchants';
export { CARDADVISOR_ATTRIBUTION, convertCardAdvisor, type ConvertReport } from './cardadvisor';

export const curatedCards: readonly CardProduct[] = [amazonPayIcici, hsbcLivePlus, hdfcIndianOil];

/** Curated cards replace the imported version of the same CardAdvisor card. */
export function buildCatalogue(
  curated: readonly CardProduct[],
  importedCards: readonly CardProduct[],
): CardProduct[] {
  const replaced = new Set(curated.map((c) => c.cardAdvisorKey).filter(Boolean));
  const rest = importedCards.filter((c) => !replaced.has(c.cardAdvisorKey));
  return [...curated, ...rest].sort((a, b) => a.name.localeCompare(b.name));
}

export const cards: readonly CardProduct[] = buildCatalogue(
  curatedCards,
  z.array(cardProductSchema).parse(imported),
);

const byId = new Map(cards.map((c) => [c.id, c]));
export const getCard = (id: string): CardProduct | undefined => byId.get(id);

/** A card is "verified" when an admin reviewed it in the last 90 days. */
export function isVerified(card: CardProduct, today: string): boolean {
  if (!card.review) return false;
  const ageMs = Date.parse(today) - Date.parse(card.review.reviewedOn);
  return ageMs <= 90 * 24 * 60 * 60 * 1000;
}
