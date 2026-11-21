import { matchPurchase } from './match';
import { cardAgeMonths } from './periods';
import type { Cap, CardProduct, Earn, EarnRule, UserAttribute } from './schema';
import type { Allocation, CapStatus, CapUsage, Evaluation, Purchase, UserCard } from './types';
import { WAIVER_USAGE_KEY } from './usage';

/** Amount used to compare cards when the user didn't enter one (₹1,000). */
export const REFERENCE_AMOUNT_PAISE = 100_000;

const ATTRIBUTE_LABELS: Record<UserAttribute, string> = { amazonPrime: 'Amazon Prime' };

interface Ctx {
  card: CardProduct;
  userCard: UserCard;
  purchase: Purchase;
  usage: CapUsage;
  amount: number;
  warnings: string[];
}

interface RuleOutcome {
  rule: EarnRule;
  units: number;
  allocations: Allocation[];
  caps: CapStatus[];
  explanation: string[];
}

export function earnUnits(earn: Earn, amountPaise: number): number {
  if (earn.type === 'percent') return Math.floor((amountPaise * earn.bps) / 10_000);
  if (earn.mode === 'blocks') return Math.floor(amountPaise / earn.perPaise) * earn.units;
  return Math.floor((amountPaise * earn.units) / earn.perPaise);
}

function capMaxUnits(cap: Cap, ctx: Ctx): number {
  if (cap.maxUnits !== undefined) return cap.maxUnits;
  const schedule = cap.byCardAge ?? [];
  if (!ctx.userCard.issuedOn) {
    ctx.warnings.push(
      `Add the card's issue date: "${cap.label}" depends on card age, so the lowest cap is used.`,
    );
    return Math.min(...schedule.map((s) => s.maxUnits));
  }
  const age = cardAgeMonths(ctx.userCard.issuedOn, ctx.purchase.date);
  const entry =
    schedule.find((s) => s.untilMonth === undefined || age < s.untilMonth) ?? schedule.at(-1);
  return entry?.maxUnits ?? 0;
}

function capStatuses(rule: EarnRule, ctx: Ctx): CapStatus[] {
  return ctx.card.caps
    .filter((cap) => rule.capIds?.includes(cap.id))
    .map((cap) => {
      if (cap.period === 'statement_cycle' && !ctx.userCard.statementDay) {
        ctx.warnings.push(
          `Add the statement day for accurate "${cap.label}" tracking; using calendar months.`,
        );
      }
      const maxUnits = capMaxUnits(cap, ctx);
      const used = cap.period === 'transaction' ? 0 : (ctx.usage[cap.id] ?? 0);
      const remaining = Math.max(0, maxUnits - used);
      return {
        capId: cap.id,
        label: cap.label,
        maxUnits,
        remainingBefore: remaining,
        remainingAfter: remaining,
      };
    });
}

function applyRule(rule: EarnRule, amount: number, ctx: Ctx): RuleOutcome {
  const raw = earnUnits(rule.earn, amount);
  const caps = capStatuses(rule, ctx);
  const allowed = Math.min(raw, ...caps.map((c) => c.remainingBefore));
  const capped = caps.map((c) => ({ ...c, remainingAfter: c.remainingBefore - allowed }));
  const periodic = new Set(
    ctx.card.caps.filter((c) => c.period !== 'transaction').map((c) => c.id),
  );
  const allocations =
    allowed > 0
      ? capped.filter((c) => periodic.has(c.capId)).map((c) => ({ capId: c.capId, units: allowed }))
      : [];
  const explanation = [`${rule.label}`];
  for (const c of capped)
    explanation.push(`${c.label}: ${c.remainingBefore} of ${c.maxUnits} left before this spend`);

  if (allowed >= raw) return { rule, units: raw, allocations, caps: capped, explanation };

  explanation.push(
    rule.afterCap === 'base'
      ? 'Cap reached — the rest earns the base rate'
      : 'Cap reached — the rest earns nothing',
  );
  if (rule.afterCap !== 'base' || rule.id === ctx.card.baseRule.id) {
    return { rule, units: allowed, allocations, caps: capped, explanation };
  }
  const overflow = Math.floor((amount * (raw - allowed)) / raw);
  const base = applyRule(ctx.card.baseRule, overflow, ctx);
  return {
    rule,
    units: allowed + base.units,
    allocations: [...allocations, ...base.allocations],
    caps: [...capped, ...base.caps],
    explanation: [...explanation, ...base.explanation.map((e) => `Above cap: ${e}`)],
  };
}

function requirementsMet(rule: EarnRule, userCard: UserCard): boolean {
  return Object.entries(rule.requires ?? {}).every(
    ([attr, wanted]) => (userCard.attributes?.[attr as UserAttribute] ?? false) === wanted,
  );
}

function candidateRules(ctx: Ctx): EarnRule[] {
  const matching = ctx.card.rules.filter((rule) => {
    const m = matchPurchase(rule.match, ctx.purchase);
    if (!m.matches) return false;
    if (!requirementsMet(rule, ctx.userCard)) {
      const needs = Object.keys(rule.requires ?? {}).map(
        (a) => ATTRIBUTE_LABELS[a as UserAttribute],
      );
      ctx.warnings.push(
        `${rule.label} needs ${needs.join(', ')} — update the card if that applies to you.`,
      );
      return false;
    }
    if (m.amountUnknown) ctx.warnings.push(`${rule.label} depends on the amount.`);
    return true;
  });
  return matching.length > 0 ? matching : [ctx.card.baseRule];
}

function paisePerUnit(ctx: Ctx): number {
  const { currency } = ctx.card;
  if (ctx.userCard.paisePerUnitOverride) return ctx.userCard.paisePerUnitOverride;
  const chosen = currency.redemptions.find((r) => r.id === ctx.userCard.redemptionId);
  if (ctx.userCard.redemptionId && !chosen) {
    ctx.warnings.push('Your chosen redemption is no longer offered; using the default value.');
  }
  const fallback = currency.redemptions.find((r) => r.id === currency.defaultRedemptionId);
  return (chosen ?? fallback)?.paisePerUnit ?? 0;
}

function waiverPaise(ctx: Ctx): number {
  const waiver = ctx.card.surchargeWaivers.find(
    (w) => matchPurchase(w.match, ctx.purchase).matches,
  );
  if (!waiver || ctx.purchase.amountPaise === undefined) return 0;
  const amount = ctx.purchase.amountPaise;
  if (waiver.minAmountPaise !== undefined && amount < waiver.minAmountPaise) return 0;
  if (waiver.maxAmountPaise !== undefined && amount > waiver.maxAmountPaise) return 0;
  const raw = Math.floor((amount * waiver.bps) / 10_000);
  if (waiver.cycleCapPaise === undefined) return raw;
  return Math.max(0, Math.min(raw, waiver.cycleCapPaise - (ctx.usage[WAIVER_USAGE_KEY] ?? 0)));
}

function ineligibility(card: CardProduct, p: Purchase): string | undefined {
  if (p.paymentMethod !== 'upi') return undefined;
  if (card.kind === 'debit') return 'UPI payments come from your bank account, not this debit card';
  if (card.network !== 'rupay') return 'Only RuPay credit cards can be used on UPI';
  return undefined;
}

function emptyEvaluation(
  card: CardProduct,
  userCard: UserCard,
  amount: number,
  amountAssumed: boolean,
): Evaluation {
  return {
    userCardId: userCard.id,
    cardId: card.id,
    cardName: userCard.nickname ?? card.name,
    eligible: true,
    rewardUnits: 0,
    unitLabel: card.currency.unitLabel,
    rewardValuePaise: 0,
    waiverPaise: 0,
    totalValuePaise: 0,
    effectiveBps: 0,
    amountPaise: amount,
    amountAssumed,
    caps: [],
    allocations: [],
    explanation: [],
    warnings: [],
  };
}

export function evaluate(
  card: CardProduct,
  userCard: UserCard,
  purchase: Purchase,
  usage: CapUsage,
): Evaluation {
  const amountAssumed = purchase.amountPaise === undefined;
  const amount = purchase.amountPaise ?? REFERENCE_AMOUNT_PAISE;
  const result = emptyEvaluation(card, userCard, amount, amountAssumed);
  const ctx: Ctx = { card, userCard, purchase, usage, amount, warnings: result.warnings };
  if (amountAssumed) ctx.warnings.push('No amount entered — compared using ₹1,000.');

  const reason = ineligibility(card, purchase);
  if (reason) return { ...result, eligible: false, ineligibleReason: reason };

  const ppu = paisePerUnit(ctx);
  const waiver = waiverPaise(ctx);
  const exclusion = card.exclusions.find((e) => matchPurchase(e.match, purchase).matches);

  let reward = { units: 0, value: 0, outcome: undefined as RuleOutcome | undefined };
  if (!exclusion) {
    const outcomes = candidateRules(ctx).map((rule) => applyRule(rule, amount, ctx));
    const best = outcomes.reduce((a, b) => (b.units * ppu > a.units * ppu ? b : a));
    reward = { units: best.units, value: Math.floor(best.units * ppu), outcome: best };
  }

  const total = reward.value + waiver;
  const explanation = exclusion
    ? [`No rewards: ${exclusion.label} is excluded`]
    : (reward.outcome?.explanation ?? []);
  if (waiver > 0) explanation.push(`Fuel surcharge waiver: ₹${(waiver / 100).toFixed(2)}`);

  return {
    ...result,
    ruleId: reward.outcome?.rule.id,
    ruleLabel: reward.outcome?.rule.label,
    excludedBy: exclusion?.label,
    rewardUnits: reward.units,
    rewardValuePaise: reward.value,
    waiverPaise: waiver,
    totalValuePaise: total,
    effectiveBps: Math.round((total * 10_000) / amount),
    caps: reward.outcome?.caps ?? [],
    allocations: reward.outcome?.allocations ?? [],
    explanation,
    warnings: [...new Set(ctx.warnings)],
  };
}

export interface RankEntry {
  card: CardProduct;
  userCard: UserCard;
  usage: CapUsage;
}

/** Best card first. Ineligible cards go last; ties break by name. */
export function rankCards(entries: readonly RankEntry[], purchase: Purchase): Evaluation[] {
  return entries
    .map((e) => evaluate(e.card, e.userCard, purchase, e.usage))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.totalValuePaise - a.totalValuePaise ||
        a.cardName.localeCompare(b.cardName),
    );
}
