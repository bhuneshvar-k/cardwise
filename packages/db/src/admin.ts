import { count, desc, eq } from 'drizzle-orm';
import type { Db } from './client';
import { card, importRun, pendingChange, report } from './schema';

/** Numbers for the admin home page. */
export async function adminOverview(db: Db) {
  const [pending] = await db
    .select({ n: count() })
    .from(pendingChange)
    .where(eq(pendingChange.status, 'pending'));
  const [reports] = await db.select({ n: count() }).from(report).where(eq(report.status, 'open'));
  const [cards] = await db.select({ n: count() }).from(card).where(eq(card.retired, false));
  const [lastImport] = await db
    .select()
    .from(importRun)
    .orderBy(desc(importRun.startedAt))
    .limit(1);
  return {
    pendingChanges: pending?.n ?? 0,
    openReports: reports?.n ?? 0,
    cards: cards?.n ?? 0,
    lastImport: lastImport ?? null,
  };
}
