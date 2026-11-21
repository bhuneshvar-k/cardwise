import { adminOverview } from '@cardwise/db';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDb } from '@/server/db';
import { requireAdminPage } from '@/server/session';

export const instant = false;

export default async function AdminHome() {
  await requireAdminPage();
  const o = await adminOverview(await getDb());
  const stats = [
    { label: 'Changes to review', value: o.pendingChanges, href: '/admin/review' },
    { label: 'Open reports', value: o.openReports, href: '/admin/reports' },
    { label: 'Cards live', value: o.cards, href: '/admin/cards' },
  ];
  return (
    <>
      <PageHeader title="Admin" />
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl tabular-nums">{s.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-xs">{s.label}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <p className="text-muted-foreground mt-4 text-sm">
        Last CardAdvisor import:{' '}
        {o.lastImport
          ? `${o.lastImport.status} on ${o.lastImport.startedAt.toLocaleString('en-IN')} (${JSON.stringify(o.lastImport.stats ?? {})})`
          : 'never'}
        {o.lastImport?.error && ` — ${o.lastImport.error}`}
      </p>
    </>
  );
}
