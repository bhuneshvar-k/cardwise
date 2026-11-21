import { isVerified } from '@cardwise/data';
import { listCardsForAdmin } from '@cardwise/db';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getDb } from '@/server/db';
import { requireAdminPage } from '@/server/session';

const PAGE_LIMIT = 100;

export const instant = false;

export default async function CardsAdminPage({ searchParams }: PageProps<'/admin/cards'>) {
  await requireAdminPage();
  const q = String((await searchParams).q ?? '')
    .toLowerCase()
    .trim();
  const today = new Date().toISOString().slice(0, 10);
  const all = await listCardsForAdmin(await getDb());
  const matches = all
    .filter((c) => !q || `${c.name} ${c.issuer} ${c.id}`.toLowerCase().includes(q))
    .toSorted(
      (a, b) =>
        Number(b.origin === 'curated') - Number(a.origin === 'curated') ||
        a.name.localeCompare(b.name),
    );

  return (
    <>
      <PageHeader title="Cards" description={`${all.length} cards, including hidden imports.`} />
      <form className="mb-4">
        <Input name="q" defaultValue={q} placeholder="Search cards" aria-label="Search cards" />
      </form>
      <ul className="divide-y rounded-xl border">
        {matches.slice(0, PAGE_LIMIT).map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/cards/${c.id}`}
              className="hover:bg-muted flex items-center gap-2 px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {c.retired && <Badge variant="ghost">hidden</Badge>}
              {c.adminEdited && <Badge variant="secondary">edited</Badge>}
              <Badge variant="outline">
                {isVerified({ review: c.review ?? undefined }, today) ? 'verified' : c.origin}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
