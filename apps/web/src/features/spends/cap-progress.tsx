'use client';

import { computeCapUsage, periodFor, resolveCapMax, type CardProduct } from '@cardwise/engine';
import type { StoredSpend, StoredUserCard } from '@/lib/db';

interface CapProgressProps {
  card: CardProduct;
  userCard: StoredUserCard;
  spends: readonly StoredSpend[];
  today: string;
}

/** Shows how much of each periodic cap is used in the current period. */
export function CapProgress({ card, userCard, spends, today }: CapProgressProps) {
  const usage = computeCapUsage(card, userCard, spends, today);
  const caps = card.caps.filter((c) => c.period !== 'transaction');
  if (caps.length === 0) return null;
  return (
    <ul className="space-y-2">
      {caps.map((cap) => {
        const { maxUnits: max, assumed } = resolveCapMax(cap, userCard.issuedOn, today);
        const used = Math.min(usage[cap.id] ?? 0, max);
        const pct = max > 0 ? Math.round((used / max) * 100) : 0;
        const period = periodFor(cap.period, today, userCard.statementDay);
        return (
          <li key={cap.id} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="truncate">{cap.label}</span>
              <span className="text-muted-foreground tabular-nums">{pct}% used</span>
            </div>
            <div
              className="bg-muted mt-1 h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={cap.label}
            >
              <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            {period && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                Resets after {period.end}
                {assumed && ' · add the card issue date for the exact limit'}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
