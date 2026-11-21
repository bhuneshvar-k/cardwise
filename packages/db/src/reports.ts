import type { ReportRequest } from '@cardwise/contracts';
import { desc, eq } from 'drizzle-orm';
import type { Db } from './client';
import { report } from './schema';

export type ReportStatus = (typeof report.$inferSelect)['status'];
export type ReportRow = typeof report.$inferSelect;

const LIST_LIMIT = 200;

export async function createReport(
  db: Db,
  userId: string | null,
  input: ReportRequest,
): Promise<ReportRow> {
  const [row] = await db
    .insert(report)
    .values({
      userId,
      cardId: input.cardId,
      merchantId: input.merchantId ?? null,
      category: input.category ?? null,
      message: input.message,
      shown: input.shown ?? null,
    })
    .returning();
  return row!;
}

export async function listReports(db: Db, status: ReportStatus): Promise<ReportRow[]> {
  return db
    .select()
    .from(report)
    .where(eq(report.status, status))
    .orderBy(desc(report.createdAt))
    .limit(LIST_LIMIT);
}

export async function setReportStatus(
  db: Db,
  id: number,
  status: ReportStatus,
  adminId: string,
): Promise<void> {
  await db
    .update(report)
    .set({
      status,
      resolvedBy: status === 'open' ? null : adminId,
      resolvedAt: status === 'open' ? null : new Date(),
    })
    .where(eq(report.id, id));
}
