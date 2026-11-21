import { z } from 'zod';
import {
  cardProductSchema,
  type CardProduct,
  type Category,
  type EarnRule,
  type Exclusion,
} from '@cardwise/engine';

/** Credit line required by CardAdvisor's CC BY 4.0 licence. */
export const CARDADVISOR_ATTRIBUTION = {
  text: 'Card data for unreviewed cards from CardAdvisor (CC BY 4.0)',
  url: 'https://cardadvisor.in/data',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

const rowSchema = z.object({
  category: z.string(),
  rewardType: z.string(),
  ratePct: z.number(),
  monthlyCapRs: z.number().nullable(),
  pointValuePaisa: z.number().nullable(),
  merchants: z.string().nullable(),
});

const cardSchema = z.object({
  cardKey: z.string(),
  name: z.string(),
  issuer: z.string(),
  network: z.string(),
  url: z.url(),
  lastVerified: z.string().nullable(),
  rewards: z.array(rowSchema),
});

export const cardAdvisorFileSchema = z.object({
  license: z.string(),
  version: z.string(),
  asOf: z.string(),
  cards: z.array(z.unknown()),
});

type Row = z.infer<typeof rowSchema>;
type SourceCard = z.infer<typeof cardSchema>;

const CATEGORY_MAP: Record<string, Category | 'emi' | undefined> = {
  TRAVEL: 'travel',
  ONLINE_SHOPPING: 'online_shopping',
  UTILITY_BILLS: 'utilities',
  GROCERY: 'grocery',
  DINING: 'dining',
  INSURANCE: 'insurance',
  INTERNATIONAL: 'international',
  GOVERNMENT: 'government',
  EDUCATION: 'education',
  FUEL: 'fuel',
  RENT: 'rent',
  TOLLS: 'transport',
  OTT_SUBSCRIPTIONS: 'ott',
  WALLET: 'wallet_load',
  GIFT_CARDS: 'gift_cards',
  EMI: 'emi',
};

/** Keywords in CardAdvisor's free-text merchant scope → our merchant ids. */
const MERCHANT_KEYWORDS: [RegExp, string][] = [
  [/amazon/i, 'amazon'],
  [/flipkart/i, 'flipkart'],
  [/myntra/i, 'myntra'],
  [/swiggy/i, 'swiggy'],
  [/zomato/i, 'zomato'],
  [/indian ?oil|iocl/i, 'indianoil'],
  [/bharat petroleum|bpcl/i, 'bpcl'],
  [/hindustan petroleum|hpcl/i, 'hpcl'],
  [/makemytrip/i, 'makemytrip'],
  [/irctc/i, 'irctc'],
  [/bigbasket/i, 'bigbasket'],
  [/uber/i, 'uber'],
];

const NETWORKS = new Set(['visa', 'mastercard', 'rupay', 'amex', 'diners']);

export interface ConvertReport {
  cards: CardProduct[];
  skippedRows: { cardKey: string; category: string; reason: string }[];
  skippedCards: { cardKey: string; reason: string }[];
}

function merchantIds(scope: string): string[] | undefined {
  if (/exclud|except|other/i.test(scope)) return undefined;
  const ids = MERCHANT_KEYWORDS.filter(([re]) => re.test(scope)).map(([, id]) => id);
  return ids.length > 0 ? ids : undefined;
}

function pointValue(rows: Row[]): { kind: 'cashback' | 'points'; ppu: number } {
  const cashback = rows.every((r) => r.rewardType === 'CASHBACK');
  if (cashback) return { kind: 'cashback', ppu: 1 };
  const ppu = rows.find((r) => r.pointValuePaisa)?.pointValuePaisa ?? 25;
  return { kind: 'points', ppu };
}

/** CardAdvisor rates are effective cash return; express them in the card's own units. */
function earnFor(ratePct: number, kind: 'cashback' | 'points', ppu: number): EarnRule['earn'] {
  if (kind === 'cashback') return { type: 'percent', bps: Math.round(ratePct * 100) };
  return {
    type: 'per_spend',
    units: (ratePct * 100) / ppu,
    perPaise: 10_000,
    mode: 'proportional',
  };
}

interface Built {
  rules: EarnRule[];
  caps: CardProduct['caps'];
  exclusions: Exclusion[];
}

function buildRows(
  src: SourceCard,
  kind: 'cashback' | 'points',
  ppu: number,
  report: ConvertReport,
): Built {
  const built: Built = { rules: [], caps: [], exclusions: [] };
  src.rewards.forEach((row, i) => {
    if (row.category === 'DEFAULT') return;
    const mapped = CATEGORY_MAP[row.category];
    const skip = (reason: string) =>
      report.skippedRows.push({ cardKey: src.cardKey, category: row.category, reason });
    if (!mapped) return skip('unknown category');
    const merchants = row.merchants ? merchantIds(row.merchants) : undefined;
    if (row.merchants && !merchants) return skip(`unmapped merchant scope: ${row.merchants}`);
    const match =
      mapped === 'emi'
        ? { emi: true }
        : { categories: [mapped], ...(merchants ? { merchants } : {}) };
    const id = `${row.category.toLowerCase()}-${i}`;
    if (row.ratePct === 0) {
      built.exclusions.push({ id, label: row.category.replaceAll('_', ' ').toLowerCase(), match });
      return;
    }
    const capIds = row.monthlyCapRs ? [`cap-${id}`] : undefined;
    if (row.monthlyCapRs) {
      built.caps.push({
        id: `cap-${id}`,
        label: `${row.category} cap (₹${row.monthlyCapRs}/month)`,
        period: 'calendar_month',
        maxUnits: Math.round((row.monthlyCapRs * 100) / ppu),
      });
    }
    built.rules.push({
      id,
      label: `${row.ratePct}% on ${'categories' in match ? match.categories[0] : 'EMI'}${merchants ? ` (${merchants.join(', ')})` : ''}`,
      match,
      earn: earnFor(row.ratePct, kind, ppu),
      ...(capIds ? { capIds } : {}),
    });
  });
  // Merchant-scoped rows are more specific; put them first so they win ties.
  built.rules.sort(
    (a, b) => Number(Boolean(b.match.merchants)) - Number(Boolean(a.match.merchants)),
  );
  return built;
}

function convertCard(
  raw: unknown,
  checkedOn: string,
  report: ConvertReport,
): CardProduct | undefined {
  const parsed = cardSchema.safeParse(raw);
  if (!parsed.success) {
    report.skippedCards.push({
      cardKey: String((raw as { cardKey?: unknown })?.cardKey),
      reason: 'unexpected shape',
    });
    return undefined;
  }
  const src = parsed.data;
  const network = src.network.toLowerCase();
  const base = src.rewards.find((r) => r.category === 'DEFAULT');
  if (!NETWORKS.has(network) || !base) {
    report.skippedCards.push({
      cardKey: src.cardKey,
      reason: !base ? 'no base rate' : `network ${src.network}`,
    });
    return undefined;
  }
  const { kind, ppu } = pointValue(src.rewards);
  const built = buildRows(src, kind, ppu, report);
  const result = cardProductSchema.safeParse({
    id: `ca-${src.cardKey}`,
    cardAdvisorKey: src.cardKey,
    name: src.name,
    issuer: src.issuer,
    network,
    kind: 'credit',
    currency: {
      kind,
      unitLabel: kind === 'cashback' ? '₹ cashback' : 'points',
      redemptions: [{ id: 'cardadvisor', label: 'CardAdvisor typical value', paisePerUnit: ppu }],
      defaultRedemptionId: 'cardadvisor',
    },
    baseRule: {
      id: 'base',
      label: `${base.ratePct}% on other spends`,
      match: {},
      earn: earnFor(base.ratePct, kind, ppu),
    },
    ...built,
    origin: 'cardadvisor',
    sources: [{ url: src.url, checkedOn, note: 'Imported from CardAdvisor; not reviewed' }],
    notes: [
      'Imported automatically. Caps are treated as per calendar month and exclusions may be missing.',
    ],
  });
  if (!result.success) {
    report.skippedCards.push({ cardKey: src.cardKey, reason: result.error.message });
    return undefined;
  }
  return result.data;
}

/** Convert a CardAdvisor `cards.json` file into our card format, reporting what was dropped. */
export function convertCardAdvisor(file: unknown): ConvertReport {
  const data = cardAdvisorFileSchema.parse(file);
  const report: ConvertReport = { cards: [], skippedRows: [], skippedCards: [] };
  for (const raw of data.cards) {
    const card = convertCard(raw, data.asOf, report);
    if (card) report.cards.push(card);
  }
  return report;
}
