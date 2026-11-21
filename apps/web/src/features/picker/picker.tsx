'use client';

import { getMerchant } from '@cardwise/data';
import Link from 'next/link';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings, useSpends, useUserCards } from '@/hooks/use-local-data';
import { buildPurchase, recommend, recommendOtherCards } from '@/lib/recommend';
import { useToday } from '@/hooks/use-today';
import { useCatalogue } from '@/features/catalogue/catalogue-provider';
import { MerchantPicker } from './merchant-picker';
import { PurchaseOptions } from './purchase-options';
import { ResultCard } from './result-card';
import { usePickerState } from './use-picker-state';

const OTHER_CARDS_LIMIT = 3;

function Results() {
  const { choice } = usePickerState();
  const userCards = useUserCards();
  const spends = useSpends();
  const settings = useSettings();
  const today = useToday();
  const catalogue = useCatalogue();
  const purchase = useMemo(() => (today ? buildPurchase(choice, today) : null), [choice, today]);

  if (!today) return null;
  if (!purchase) return null;
  if (!userCards || !spends) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (userCards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-medium">Add your cards first</p>
        <p className="text-muted-foreground mb-3 text-sm">
          Cardwise ranks only the cards you hold.
        </p>
        <Button asChild>
          <Link href="/cards">Add cards</Link>
        </Button>
      </div>
    );
  }

  const ranked = recommend(userCards, spends, purchase, catalogue.getCard);
  const best = ranked[0]?.totalValuePaise ?? 0;
  const others = settings?.showOtherCards
    ? recommendOtherCards(
        catalogue.cards,
        userCards.map((c) => c.cardId),
        purchase,
        OTHER_CARDS_LIMIT,
      ).filter((o) => o.totalValuePaise > best)
    : [];

  return (
    <section aria-label="Recommended cards" className="space-y-3">
      {ranked.map((e, i) => (
        <ResultCard key={e.userCardId} evaluation={e} purchase={purchase} rank={i} owned />
      ))}
      {others.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-sm font-medium">Cards you don&apos;t have that would earn more</h2>
          {others.map((e) => (
            <ResultCard key={e.cardId} evaluation={e} purchase={purchase} rank={-1} owned={false} />
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Estimates from published card terms, not financial advice. Banks change terms — check your
        card&apos;s current T&amp;C.
      </p>
    </section>
  );
}

export function Picker() {
  const { state, setState } = usePickerState();
  const merchant = state.m ? getMerchant(state.m) : undefined;
  const hasTarget = Boolean(merchant || state.c);

  return (
    <div className="space-y-5">
      <MerchantPicker
        merchantId={state.m ?? undefined}
        category={state.c ?? undefined}
        onMerchant={(m) =>
          setState({ m: m.id, c: null, v: null, p: m.online ? 'online' : 'in_store' })
        }
        onCategory={(c) => setState({ c, m: null, v: null })}
        onClear={() => setState({ m: null, c: null, v: null })}
      />
      {hasTarget && (
        <PurchaseOptions
          merchant={merchant}
          variantId={state.v ?? undefined}
          amount={state.a}
          paymentMethod={state.p}
          emi={state.emi}
          onChange={(patch) => setState(patch)}
        />
      )}
      <Results />
    </div>
  );
}
