import { listReports } from '@cardwise/db';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { getDb } from '@/server/db';
import { requireAdminPage } from '@/server/session';
import { updateReport } from '../actions';

export const instant = false;

export default async function ReportsPage() {
  await requireAdminPage();
  const reports = await listReports(await getDb(), 'open');
  return (
    <>
      <PageHeader title="Reports" description="What users say is wrong." />
      {reports.length === 0 && <p className="text-muted-foreground text-sm">No open reports.</p>}
      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border p-4">
            <p className="text-sm">
              <Link
                href={`/admin/cards/${r.cardId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {r.cardId}
              </Link>
              <span className="text-muted-foreground">
                {' '}
                · {r.merchantId ?? r.category ?? 'any purchase'} ·{' '}
                {r.createdAt.toLocaleDateString('en-IN')}
              </span>
            </p>
            <p className="text-sm whitespace-pre-wrap">{r.message}</p>
            {r.shown != null && (
              <p className="text-muted-foreground text-xs">App showed: {JSON.stringify(r.shown)}</p>
            )}
            <form action={updateReport} className="flex gap-2">
              <input type="hidden" name="id" value={r.id} />
              <Button name="status" value="resolved" size="sm">
                Fixed
              </Button>
              <Button name="status" value="dismissed" size="sm" variant="outline">
                Dismiss
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
