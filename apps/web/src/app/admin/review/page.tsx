import { listCardsForAdmin, listPendingChanges } from '@cardwise/db';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getDb } from '@/server/db';
import { requireAdminPage } from '@/server/session';
import { decideChange } from '../actions';

const REASONS = {
  large_change: 'Large change',
  admin_edited: 'Overwrites an admin edit',
  curated_source_changed: 'CardAdvisor changed a hand-written card',
} as const;

export const instant = false;

export default async function ReviewPage() {
  await requireAdminPage();
  const db = await getDb();
  const [pending, cards] = await Promise.all([listPendingChanges(db), listCardsForAdmin(db)]);
  const names = new Map(cards.map((c) => [c.id, c.name]));
  return (
    <>
      <PageHeader
        title="Review queue"
        description="Imported changes that need a decision before they go live."
      />
      {pending.length === 0 && <p className="text-muted-foreground text-sm">Nothing to review.</p>}
      <ul className="space-y-3">
        {pending.map((p) => (
          <li key={p.id} className="space-y-2 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/cards/${p.cardId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {names.get(p.cardId) ?? p.cardId}
              </Link>
              <Badge variant="outline">{REASONS[p.reason]}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">{p.summary}</p>
            <form action={decideChange} className="flex gap-2">
              <input type="hidden" name="id" value={p.id} />
              <Button name="decision" value="approve" size="sm">
                {p.reason === 'curated_source_changed' ? 'Acknowledge' : 'Approve'}
              </Button>
              <Button name="decision" value="reject" size="sm" variant="outline">
                Reject
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
