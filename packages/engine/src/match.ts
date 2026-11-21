import type { Match } from './schema';
import type { Purchase } from './types';

export interface MatchResult {
  matches: boolean;
  /** True when the match only held because the amount was unknown. */
  amountUnknown: boolean;
}

function inMccRanges(mcc: number, ranges: NonNullable<Match['mccs']>): boolean {
  return ranges.some((r) => (typeof r === 'number' ? r === mcc : mcc >= r[0] && mcc <= r[1]));
}

function structuralMatch(match: Match, p: Purchase): boolean {
  if (match.merchants && !(p.merchantId && match.merchants.includes(p.merchantId))) return false;
  if (match.notMerchants && p.merchantId && match.notMerchants.includes(p.merchantId)) return false;
  if (match.merchantTags && !match.merchantTags.some((t) => p.merchantTags?.includes(t)))
    return false;
  if (match.categories && !match.categories.includes(p.category)) return false;
  if (match.mccs && !(p.mcc !== undefined && inMccRanges(p.mcc, match.mccs))) return false;
  if (match.paymentMethods && !match.paymentMethods.includes(p.paymentMethod)) return false;
  if (match.emi !== undefined && match.emi !== (p.emi ?? false)) return false;
  return true;
}

/** All listed conditions must hold. Amount bounds are skipped when the amount is unknown. */
export function matchPurchase(match: Match, p: Purchase): MatchResult {
  if (!structuralMatch(match, p)) return { matches: false, amountUnknown: false };
  const hasAmountBound = match.minAmountPaise !== undefined || match.maxAmountPaise !== undefined;
  if (!hasAmountBound) return { matches: true, amountUnknown: false };
  if (p.amountPaise === undefined) return { matches: true, amountUnknown: true };
  const aboveMin = match.minAmountPaise === undefined || p.amountPaise >= match.minAmountPaise;
  const belowMax = match.maxAmountPaise === undefined || p.amountPaise <= match.maxAmountPaise;
  return { matches: aboveMin && belowMax, amountUnknown: false };
}
