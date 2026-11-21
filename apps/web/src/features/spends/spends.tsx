'use client';

import { getMerchant } from '@cardwise/data';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpends, useUserCards } from '@/hooks/use-local-data';
import { CATEGORY_LABELS } from '@/lib/labels';
import { formatRupees } from '@/lib/money';
import { deleteSpend } from '@/lib/repo';
import { useToday } from '@/hooks/use-today';
import { useCatalogue } from '@/features/catalogue/catalogue-provider';
import { AddSpendDialog } from './add-spend-dialog';
import { CapProgress } from './cap-progress';

const RECENT_LIMIT = 50;

async function removeSpend(id: string) {
  await deleteSpend(id);
  toast.success('Spend removed');
}

export function Spends() {
  const { getCard } = useCatalogue();
  const userCards = useUserCards();
  const spends = useSpends();
  const today = useToday();
  if (!userCards || !spends || !today) return <Skeleton className="h-40 w-full rounded-xl" />;

  const names = new Map(
    userCards.map((c) => [c.id, c.nickname ?? getCard(c.cardId)?.name ?? 'Removed card']),
  );
  return (
    <div className="space-y-6">
      <AddSpendDialog userCards={userCards} spends={spends} today={today} />

      <section aria-label="Caps this period" className="space-y-3">
        {userCards.map((uc) => {
          const card = getCard(uc.cardId);
          if (!card || card.caps.length === 0) return null;
          return (
            <Card key={uc.id}>
              <CardHeader>
                <CardTitle className="text-base">{names.get(uc.id)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CapProgress card={card} userCard={uc} spends={spends} today={today} />
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-label="Recent spends">
        <h2 className="mb-2 text-sm font-medium">Recent spends</h2>
        {spends.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing logged yet. Tap “Paid with this” on a recommendation.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {spends.slice(0, RECENT_LIMIT).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {s.merchantId
                      ? (getMerchant(s.merchantId)?.name ?? s.merchantId)
                      : CATEGORY_LABELS[s.category]}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {s.date} · {names.get(s.userCardId) ?? 'Removed card'}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p>{formatRupees(s.amountPaise)}</p>
                  <p className="text-primary text-xs">
                    +{formatRupees(s.valuePaise + (s.waiverPaise ?? 0))}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSpend(s.id)}
                  aria-label="Remove spend"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
