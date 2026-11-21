import { getCardForAdmin } from '@cardwise/db';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { getDb } from '@/server/db';
import { requireAdminPage } from '@/server/session';
import { markReviewed } from '../../actions';
import { CardEditor } from './card-editor';

export const instant = false;

export default async function CardAdminPage({ params }: PageProps<'/admin/cards/[id]'>) {
  await requireAdminPage();
  const { id } = await params;
  const row = await getCardForAdmin(await getDb(), decodeURIComponent(id));
  if (!row) notFound();
  const { data } = row;

  return (
    <>
      <PageHeader
        title={data.name}
        description={`${row.origin} · revision ${row.revision}${row.adminEdited ? ' · edited by admin' : ''}`}
      />
      <div className="space-y-6">
        <section className="space-y-2 text-sm">
          <h2 className="font-medium">Sources</h2>
          <ul className="list-disc pl-5">
            {data.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                  {new URL(s.url).hostname}
                </a>{' '}
                <span className="text-muted-foreground">
                  checked {s.checkedOn}
                  {s.note ? ` — ${s.note}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {data.notes.length > 0 && (
            <ul className="text-muted-foreground list-disc pl-5">
              {data.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
          <form action={markReviewed} className="flex items-center gap-3 pt-1">
            <input type="hidden" name="id" value={row.id} />
            <Button size="sm" variant="secondary">
              Mark reviewed against bank terms
            </Button>
            <span className="text-muted-foreground text-xs">
              {data.review
                ? `Last reviewed ${data.review.reviewedOn} by ${data.review.reviewedBy}`
                : 'Never reviewed'}
            </span>
          </form>
        </section>
        <CardEditor id={row.id} initialJson={JSON.stringify(data, null, 2)} />
        <section className="space-y-2 text-sm">
          <h2 className="font-medium">History</h2>
          <ul className="text-muted-foreground space-y-1">
            {row.history.map((h) => (
              <li key={h.revision}>
                #{h.revision} · {h.source} · {h.createdAt.toLocaleString('en-IN')}
                {h.note ? ` — ${h.note}` : ''}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
