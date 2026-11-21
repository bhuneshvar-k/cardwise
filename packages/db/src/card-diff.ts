import { earnUnits, type CardProduct } from '@cardwise/engine';

/** A rate move of two percentage points or more needs a human. */
const LARGE_RATE_CHANGE_BPS = 200;
/** A cap that moves by half or more needs a human. */
const LARGE_CAP_CHANGE_RATIO = 0.5;
const SAMPLE_PAISE = 1_000_000; // ₹10,000

type Entry = {
  kind: 'rule' | 'match' | 'cap' | 'exclusion' | 'info';
  value: number | string;
  label: string;
};

function defaultPaisePerUnit(card: CardProduct): number {
  const { redemptions, defaultRedemptionId } = card.currency;
  return redemptions.find((r) => r.id === defaultRedemptionId)?.paisePerUnit ?? 0;
}

/** A flat view of what matters about a card, keyed so two versions can be compared. */
function describe(card: CardProduct): Map<string, Entry> {
  const ppu = defaultPaisePerUnit(card);
  const out = new Map<string, Entry>();
  for (const rule of [card.baseRule, ...card.rules]) {
    const bps = Math.round((earnUnits(rule.earn, SAMPLE_PAISE) * ppu * 10_000) / SAMPLE_PAISE);
    out.set(`rule:${rule.id}`, { kind: 'rule', value: bps, label: rule.label });
    out.set(`match:${rule.id}`, {
      kind: 'match',
      value: JSON.stringify([rule.match, rule.requires, rule.capIds]),
      label: rule.label,
    });
  }
  for (const cap of card.caps) {
    out.set(`cap:${cap.id}`, {
      kind: 'cap',
      value: cap.maxUnits ?? JSON.stringify(cap.byCardAge),
      label: cap.label,
    });
  }
  for (const ex of card.exclusions) {
    out.set(`exclusion:${ex.id}`, {
      kind: 'exclusion',
      value: JSON.stringify(ex.match),
      label: ex.label,
    });
  }
  out.set('info', {
    kind: 'info',
    value: JSON.stringify([card.name, card.issuer, card.network, card.currency.kind]),
    label: 'name, network or currency',
  });
  return out;
}

function isLarge(before: Entry | undefined, after: Entry | undefined): boolean {
  if (!before || !after) return before?.kind !== 'info' && after?.kind !== 'info';
  if (
    before.kind === 'rule' &&
    typeof before.value === 'number' &&
    typeof after.value === 'number'
  ) {
    return Math.abs(after.value - before.value) >= LARGE_RATE_CHANGE_BPS;
  }
  if (
    before.kind === 'cap' &&
    typeof before.value === 'number' &&
    typeof after.value === 'number'
  ) {
    const base = Math.max(before.value, 1);
    return Math.abs(after.value - before.value) / base >= LARGE_CAP_CHANGE_RATIO;
  }
  return before.kind !== 'info';
}

function describeChange(key: string, before: Entry | undefined, after: Entry | undefined): string {
  if (!before) return `Added ${after?.kind}: ${after?.label}`;
  if (!after) return `Removed ${before.kind}: ${before.label}`;
  if (before.kind === 'rule')
    return `${after.label}: ${Number(before.value) / 100}% → ${Number(after.value) / 100}%`;
  if (before.kind === 'cap') return `${after.label}: ${before.value} → ${after.value}`;
  return `Changed ${key.split(':')[0]}: ${after.label}`;
}

export interface CardDiff {
  changes: string[];
  large: boolean;
}

/** What changed between two versions of a card, and whether it is big enough to review. */
export function diffCards(before: CardProduct, after: CardProduct): CardDiff {
  const a = describe(before);
  const b = describe(after);
  const keys = new Set([...a.keys(), ...b.keys()]);
  const changes: string[] = [];
  let large = false;
  for (const key of keys) {
    const x = a.get(key);
    const y = b.get(key);
    if (x && y && x.value === y.value) continue;
    changes.push(describeChange(key, x, y));
    large ||= isLarge(x, y);
  }
  return { changes, large };
}
