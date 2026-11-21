import type { CardProduct } from '@cardwise/engine';
import { isVerified } from '@cardwise/data';
import { Badge } from '@/components/ui/badge';

export function CardBadges({ card, today }: { card: CardProduct; today: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      {isVerified(card, today) ? (
        <Badge variant="secondary">Verified</Badge>
      ) : card.origin === 'curated' ? (
        <Badge variant="outline">Rules written, review pending</Badge>
      ) : (
        <Badge variant="outline">Imported, not reviewed</Badge>
      )}
      <Badge variant="ghost" className="capitalize">
        {card.kind} · {card.network}
      </Badge>
    </span>
  );
}
