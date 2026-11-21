'use client';

import type { CardProduct } from '@cardwise/engine';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StoredUserCard } from '@/lib/db';
import { cn } from '@/lib/utils';
import { CardBadges } from './card-badges';
import { CardFace } from './card-face';

export interface WalletItem {
  userCard: StoredUserCard;
  /** Missing when the card has been removed from the catalogue. */
  card: CardProduct | undefined;
  title: string;
}

/** Badges and warnings shown under a card, never on its face. */
function CardStatus({ item, today }: { item: WalletItem; today: string }) {
  const { card, userCard } = item;
  if (!card) return null;
  return (
    <div className="space-y-1">
      <CardBadges card={card} today={today} />
      {!userCard.statementDay && (
        <p className="text-xs text-amber-700 dark:text-amber-400">Add the statement day</p>
      )}
    </div>
  );
}

export function GhostCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:bg-muted hover:text-foreground flex aspect-[1.586] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-[4.5%/7%] border-2 border-dashed text-sm transition-colors"
    >
      <Plus className="size-6" aria-hidden />
      <span className="font-medium">Add your first card</span>
      <span className="text-xs">Credit and debit cards you carry. No card numbers.</span>
    </button>
  );
}

interface ViewProps {
  items: readonly WalletItem[];
  today: string;
  onEdit: (userCardId: string) => void;
}

export function WalletGrid({ items, today, onEdit }: ViewProps) {
  return (
    <ul className="grid max-w-3xl gap-6 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.userCard.id} className="space-y-2">
          <button
            type="button"
            className="focus-visible:ring-ring block w-full rounded-[4.5%/7%] focus-visible:ring-2 focus-visible:outline-none"
            onClick={() => onEdit(item.userCard.id)}
          >
            <CardFace title={item.title} card={item.card} />
          </button>
          <CardStatus item={item} today={today} />
        </li>
      ))}
    </ul>
  );
}

interface StackProps extends ViewProps {
  selectedId: string | null;
  onSelect: (userCardId: string | null) => void;
}

/**
 * Cards overlap, each showing its top strip. The selected card opens up fully: the card after it
 * drops its overlap. Percentage margins resolve against the width, so the overlap scales with it.
 */
export function WalletStack({ items, today, onEdit, selectedId, onSelect }: StackProps) {
  const selectedIndex = items.findIndex((i) => i.userCard.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  return (
    <div className="max-w-sm space-y-4">
      <ul>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const followsSelected = selectedIndex >= 0 && index === selectedIndex + 1;
          return (
            <li
              key={item.userCard.id}
              className={cn(
                'relative transition-[margin] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
                index === 0 ? 'mt-0' : followsSelected ? 'mt-3' : '-mt-[50%]',
              )}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                className="focus-visible:ring-ring block w-full rounded-[4.5%/7%] focus-visible:ring-2 focus-visible:outline-none"
                onClick={() => onSelect(isSelected ? null : item.userCard.id)}
              >
                <CardFace title={item.title} card={item.card} />
              </button>
            </li>
          );
        })}
      </ul>
      {selected && (
        <section aria-label="Selected card" className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">
              {selected.card?.name ?? 'Card no longer listed'}
            </p>
            <CardStatus item={selected} today={today} />
          </div>
          <Button variant="outline" size="sm" onClick={() => onEdit(selected.userCard.id)}>
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
        </section>
      )}
    </div>
  );
}
