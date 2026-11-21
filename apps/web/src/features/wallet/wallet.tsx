'use client';

import { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserCards } from '@/hooks/use-local-data';
import { useToday } from '@/hooks/use-today';
import { useCatalogue } from '@/features/catalogue/catalogue-provider';
import { AddCardDialog } from './add-card-dialog';
import { cardFaceTitle, sortByDisplayName, walletLayout } from './card-art';
import { EditCardSheet } from './edit-card-sheet';
import { GhostCard, WalletGrid, WalletStack, type WalletItem } from './wallet-views';

export function Wallet() {
  const { getCard } = useCatalogue();
  const userCards = useUserCards();
  const today = useToday();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const items = useMemo<WalletItem[]>(() => {
    const list = (userCards ?? []).map((userCard) => {
      const card = getCard(userCard.cardId);
      return { userCard, card, title: cardFaceTitle(userCard.nickname, card?.name) };
    });
    return sortByDisplayName(list, (i) => i.title);
  }, [userCards, getCard]);

  if (!userCards || !today)
    return <Skeleton className="aspect-[1.586] w-full max-w-sm rounded-xl" />;

  const layout = walletLayout(items.length);
  const editing = items.find((i) => i.userCard.id === editingId);

  return (
    <div className="space-y-6" data-testid="wallet" data-layout={layout}>
      <AddCardDialog
        ownedCardIds={userCards.map((c) => c.cardId)}
        onAdded={setEditingId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      {layout === 'empty' && <GhostCard onClick={() => setAddOpen(true)} />}
      {layout === 'grid' && <WalletGrid items={items} today={today} onEdit={setEditingId} />}
      {layout === 'stack' && (
        <WalletStack
          items={items}
          today={today}
          onEdit={setEditingId}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      )}
      {editing?.card && (
        <EditCardSheet
          userCard={editing.userCard}
          card={editing.card}
          open
          onOpenChange={(open) => !open && setEditingId(null)}
        />
      )}
    </div>
  );
}
