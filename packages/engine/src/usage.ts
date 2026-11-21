import { isWithin, periodFor } from './periods';
import type { CardProduct } from './schema';
import type { CapUsage, IsoDate, SpendLog, UserCard } from './types';

/** Usage key that tracks surcharge waiver paise used in the current statement cycle. */
export const WAIVER_USAGE_KEY = '__surcharge_waiver__';

/** How much of each cap the user has already used in the period that contains `date`. */
export function computeCapUsage(
  card: CardProduct,
  userCard: UserCard,
  logs: readonly SpendLog[],
  date: IsoDate,
): CapUsage {
  const ownLogs = logs.filter((l) => l.userCardId === userCard.id && !l.deletedAt);
  const usage: Record<string, number> = {};

  for (const cap of card.caps) {
    const period = periodFor(cap.period, date, userCard.statementDay);
    if (!period) continue;
    usage[cap.id] = ownLogs
      .filter((l) => isWithin(l.date, period))
      .flatMap((l) => l.allocations)
      .filter((a) => a.capId === cap.id)
      .reduce((sum, a) => sum + a.units, 0);
  }

  const cycle = periodFor('statement_cycle', date, userCard.statementDay);
  usage[WAIVER_USAGE_KEY] = ownLogs
    .filter((l) => cycle && isWithin(l.date, cycle))
    .reduce((sum, l) => sum + (l.waiverPaise ?? 0), 0);

  return usage;
}
