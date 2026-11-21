'use client';

import type { Evaluation, Purchase } from '@cardwise/engine';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBps, formatRupees, formatUnits } from '@/lib/money';
import { toSpendInput } from '@/lib/recommend';
import { logSpend } from '@/lib/repo';
import { cn } from '@/lib/utils';
import { useServerStatus } from '@/features/account/use-server-status';
import { ReportDialog } from './report-dialog';

interface ResultCardProps {
  evaluation: Evaluation;
  purchase: Purchase;
  rank: number;
  /** Cards the user doesn't own can't be logged. */
  owned: boolean;
}

function purchaseKey(p: Purchase): string {
  return [p.merchantId, p.category, p.paymentMethod, p.amountPaise, p.emi, p.date].join('|');
}

function PaidButton({ evaluation, purchase }: { evaluation: Evaluation; purchase: Purchase }) {
  const mutation = useMutation({
    mutationFn: () => logSpend(toSpendInput(evaluation, purchase)),
    onSuccess: () =>
      toast.success(`Logged ${formatRupees(evaluation.amountPaise)} on ${evaluation.cardName}`),
    onError: () => toast.error('Could not save this spend. Please try again.'),
  });
  if (evaluation.amountAssumed) {
    return <p className="text-muted-foreground text-xs">Enter the amount to log this spend.</p>;
  }
  return (
    <Button
      size="lg"
      variant={mutation.isSuccess ? 'secondary' : 'default'}
      disabled={mutation.isPending || mutation.isSuccess}
      onClick={() => mutation.mutate()}
    >
      <Check data-icon="inline-start" />
      {mutation.isSuccess ? 'Logged' : 'Paid with this'}
    </Button>
  );
}

export function ResultCard({ evaluation: e, purchase, rank, owned }: ResultCardProps) {
  const status = useServerStatus();
  const best = rank === 0 && e.eligible && e.totalValuePaise > 0;
  return (
    <Card
      className={cn(best && 'ring-primary ring-2', !e.eligible && 'opacity-60')}
      data-testid="result-card"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          {best && <Badge className="mb-1.5">Best choice</Badge>}
          <CardTitle className="truncate text-base">{e.cardName}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {e.eligible
              ? e.excludedBy
                ? `No rewards on ${e.excludedBy.toLowerCase()}${e.waiverPaise > 0 ? ' · surcharge waiver only' : ''}`
                : e.ruleLabel
              : e.ineligibleReason}
          </p>
        </div>
        {e.eligible && (
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums">{formatRupees(e.totalValuePaise)}</p>
            <p className="text-muted-foreground text-xs tabular-nums">
              {formatBps(e.effectiveBps)} back{e.amountAssumed ? ' · on ₹1,000' : ''}
            </p>
          </div>
        )}
      </CardHeader>

      {e.eligible && (
        <CardContent className="space-y-3">
          {e.caps.map((cap) => (
            <p key={cap.capId} className="text-sm">
              <span className="text-muted-foreground">{cap.label}: </span>
              {cap.remainingAfter > 0
                ? `${formatUnits(cap.remainingAfter, e.currencyKind, e.unitLabel)} left after this`
                : 'used up after this'}
            </p>
          ))}
          {e.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
              {e.warnings.map((w) => (
                <li key={w} className="flex gap-1.5">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          )}
          <details className="group text-sm">
            <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-1">
              How this is worked out{' '}
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5">
              {e.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {e.rewardUnits > 0 && (
                <li>
                  {formatUnits(e.rewardUnits, e.currencyKind, e.unitLabel)} ≈{' '}
                  {formatRupees(e.rewardValuePaise)}
                </li>
              )}
            </ul>
          </details>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {owned && (
              // A new purchase gets a fresh button, so "Logged" never carries over.
              <PaidButton key={purchaseKey(purchase)} evaluation={e} purchase={purchase} />
            )}
            {status.data?.reports && <ReportDialog evaluation={e} purchase={purchase} />}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
