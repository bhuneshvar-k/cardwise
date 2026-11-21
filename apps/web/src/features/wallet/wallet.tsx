'use client';

import { getCard } from '@cardwise/data';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserCards } from '@/hooks/use-local-data';
import { useToday } from '@/hooks/use-today';
import { AddCardDialog } from './add-card-dialog';
import { CardBadges } from './card-badges';
import { EditCardSheet } from './edit-card-sheet';

export function Wallet() {
  const userCards = useUserCards();
  const [editingId, setEditingId] = useState<string | null>(null);
  const today = useToday();

  if (!userCards || !today) return <Skeleton className="h-40 w-full rounded-xl" />;

  const editing = userCards.find((c) => c.id === editingId);
  const editingCard = editing ? getCard(editing.cardId) : undefined;

  return (
    <div className="space-y-4">
      <AddCardDialog ownedCardIds={userCards.map((c) => c.cardId)} onAdded={setEditingId} />
      {userCards.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No cards yet. Add the credit and debit cards you carry.
        </p>
      )}
      <ul className="divide-y rounded-xl border">
        {userCards.map((uc) => {
          const card = getCard(uc.cardId);
          return (
            <li key={uc.id}>
              <button
                type="button"
                className="hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => setEditingId(uc.id)}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium">
                    {uc.nickname ?? card?.name ?? 'Card no longer listed'}
                  </p>
                  {uc.nickname && card && (
                    <p className="text-muted-foreground truncate text-sm">{card.name}</p>
                  )}
                  {card && <CardBadges card={card} today={today} />}
                  {card && !uc.statementDay && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Add the statement day
                    </p>
                  )}
                </div>
                <ChevronRight className="text-muted-foreground size-4" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      {editing && editingCard && (
        <EditCardSheet
          userCard={editing}
          card={editingCard}
          open
          onOpenChange={(open) => !open && setEditingId(null)}
        />
      )}
    </div>
  );
}
