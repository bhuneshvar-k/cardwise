/** Pure helpers for drawing a card face. No issuer artwork is used: faces are drawn from data. */

export interface CardPalette {
  /** Gradient start. */
  from: string;
  /** Gradient end. */
  to: string;
  /** Text and logo colour on the face. */
  ink: string;
}

const LIGHT_INK = '#f8fafc';
const DARK_INK = '#111827';

/** Brand-adjacent colours per issuer, keyed by `issuerKey`. Approximations, not official values. */
const ISSUER_PALETTES: Readonly<Record<string, CardPalette>> = {
  AMEX: { from: '#2e77bb', to: '#0b3d70', ink: LIGHT_INK },
  AU: { from: '#6d2c8f', to: '#2f0f45', ink: LIGHT_INK },
  AXIS: { from: '#97144d', to: '#4a0825', ink: LIGHT_INK },
  BOB: { from: '#f26522', to: '#9a3412', ink: LIGHT_INK },
  FEDERAL: { from: '#1e3a8a', to: '#0f172a', ink: LIGHT_INK },
  HDFC: { from: '#1e4fa3', to: '#0b1f4d', ink: LIGHT_INK },
  HSBC: { from: '#3f3f46', to: '#0a0a0a', ink: LIGHT_INK },
  ICICI: { from: '#b02a30', to: '#5c1014', ink: LIGHT_INK },
  IDFC: { from: '#9c1d26', to: '#3b0a0e', ink: LIGHT_INK },
  INDUSIND: { from: '#8b2331', to: '#2d0a10', ink: LIGHT_INK },
  KOTAK: { from: '#ed1c24', to: '#003874', ink: LIGHT_INK },
  RBL: { from: '#21409a', to: '#0c1838', ink: LIGHT_INK },
  SBI: { from: '#1aa3dc', to: '#22409a', ink: LIGHT_INK },
  SC: { from: '#0473ea', to: '#38d200', ink: LIGHT_INK },
  YES: { from: '#0b4da2', to: '#00204e', ink: LIGHT_INK },
  SLICE: { from: '#e9d5ff', to: '#a78bfa', ink: DARK_INK },
};

const FALLBACK_PALETTE: CardPalette = { from: '#475569', to: '#0f172a', ink: LIGHT_INK };

/** "ICICI Bank" and "ICICI" are the same issuer: compare on the first word, upper-cased. */
export function issuerKey(issuer: string): string {
  return (issuer.trim().split(/\s+/)[0] ?? '').toUpperCase();
}

export function paletteFor(issuer: string): CardPalette {
  return ISSUER_PALETTES[issuerKey(issuer)] ?? FALLBACK_PALETTE;
}

const TRAILING_CARD_WORDS = /\s+(credit\s+card|debit\s+card|card)$/i;

/** The text printed on the face: the nickname, or the product name without "Credit Card". */
export function cardFaceTitle(
  nickname: string | undefined,
  productName: string | undefined,
): string {
  if (nickname) return nickname;
  if (!productName) return 'Card no longer listed';
  return productName.replace(TRAILING_CARD_WORDS, '');
}

export function sortByDisplayName<T>(items: readonly T[], title: (item: T) => string): T[] {
  return [...items].sort((a, b) =>
    title(a).localeCompare(title(b), undefined, { sensitivity: 'base' }),
  );
}

/** From this many cards up, the wallet stacks; fewer show as a grid of full cards. */
export const STACK_THRESHOLD = 3;

export type WalletLayout = 'empty' | 'grid' | 'stack';

export function walletLayout(count: number): WalletLayout {
  if (count === 0) return 'empty';
  return count < STACK_THRESHOLD ? 'grid' : 'stack';
}
