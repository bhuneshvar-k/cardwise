import {
  settingsSchema,
  storedSpendSchema,
  storedUserCardSchema,
  type Settings,
  type StoredSpend,
  type StoredUserCard,
  type SyncCollection,
  type SyncRequest,
  type SyncResponse,
} from '@cardwise/contracts';
import { and, asc, eq, gt, lt, sql } from 'drizzle-orm';
import type { Db } from './client';
import { syncRecord } from './schema';

export const DEFAULT_SYNC_PAGE_SIZE = 500;
const EPOCH = '1970-01-01T00:00:00.000Z';

interface Row {
  collection: SyncCollection;
  id: string;
  data: unknown;
  updatedAt: string;
  deletedAt: string | null;
  recordDate: string | null;
}

function toRows(changes: SyncRequest['changes']): Row[] {
  return [
    ...changes.userCards.map((c) => ({
      collection: 'userCards' as const,
      id: c.id,
      data: c,
      updatedAt: c.updatedAt,
      deletedAt: c.deletedAt,
      recordDate: null,
    })),
    ...changes.spends.map((s) => ({
      collection: 'spends' as const,
      id: s.id,
      data: s,
      updatedAt: s.updatedAt,
      deletedAt: s.deletedAt,
      recordDate: s.date,
    })),
    ...changes.settings.map((s) => ({
      collection: 'settings' as const,
      id: s.id,
      data: s,
      updatedAt: s.updatedAt ?? EPOCH,
      deletedAt: null,
      recordDate: null,
    })),
  ];
}

/** Insert or update, but never let an older edit replace a newer one. */
async function upsert(db: Db, userId: string, row: Row): Promise<void> {
  await db
    .insert(syncRecord)
    .values({
      userId,
      collection: row.collection,
      id: row.id,
      data: row.data,
      updatedAt: new Date(row.updatedAt),
      deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
      recordDate: row.recordDate,
    })
    .onConflictDoUpdate({
      target: [syncRecord.userId, syncRecord.collection, syncRecord.id],
      set: {
        data: sql`excluded.data`,
        updatedAt: sql`excluded.updated_at`,
        deletedAt: sql`excluded.deleted_at`,
        recordDate: sql`excluded.record_date`,
        version: sql`nextval('sync_version_seq')`,
      },
      setWhere: sql`${syncRecord.updatedAt} <= excluded.updated_at`,
    });
}

function emptyChanges(): SyncResponse['changes'] {
  return { userCards: [], spends: [], settings: [] };
}

/**
 * Apply a device's changes, then return everything that changed after its cursor.
 * Versions come from one Postgres sequence, so the cursor works across devices.
 */
export async function syncUserData(
  db: Db,
  userId: string,
  request: SyncRequest,
  { pageSize = DEFAULT_SYNC_PAGE_SIZE }: { pageSize?: number } = {},
): Promise<SyncResponse> {
  await db.transaction(async (tx) => {
    for (const row of toRows(request.changes)) await upsert(tx as unknown as Db, userId, row);
  });

  const rows = await db
    .select()
    .from(syncRecord)
    .where(and(eq(syncRecord.userId, userId), gt(syncRecord.version, request.cursor)))
    .orderBy(asc(syncRecord.version))
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const changes = emptyChanges();
  for (const row of page) {
    if (row.collection === 'userCards')
      changes.userCards.push(storedUserCardSchema.parse(row.data) as StoredUserCard);
    if (row.collection === 'spends')
      changes.spends.push(storedSpendSchema.parse(row.data) as StoredSpend);
    if (row.collection === 'settings')
      changes.settings.push(settingsSchema.parse(row.data) as Settings);
  }
  return {
    cursor: page.at(-1)?.version ?? request.cursor,
    changes,
    hasMore: rows.length > pageSize,
  };
}

/** Retention: delete spends dated before `cutoff` (YYYY-MM-DD). Returns how many went. */
export async function purgeOldSpends(db: Db, cutoff: string): Promise<number> {
  const deleted = await db
    .delete(syncRecord)
    .where(and(eq(syncRecord.collection, 'spends'), lt(syncRecord.recordDate, cutoff)))
    .returning({ id: syncRecord.id });
  return deleted.length;
}
