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
import { and, asc, eq, gt, isNull, lt, sql } from 'drizzle-orm';
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

/** How long tombstones stay so every device can learn about a deletion. */
export const TOMBSTONE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function toChanges(rows: (typeof syncRecord.$inferSelect)[]): SyncResponse['changes'] {
  const changes = emptyChanges();
  for (const row of rows) {
    if (row.collection === 'userCards')
      changes.userCards.push(storedUserCardSchema.parse(row.data) as StoredUserCard);
    if (row.collection === 'spends')
      changes.spends.push(storedSpendSchema.parse(row.data) as StoredSpend);
    if (row.collection === 'settings')
      changes.settings.push(settingsSchema.parse(row.data) as Settings);
  }
  return changes;
}

/**
 * Apply a device's changes, then return everything that changed after its cursor.
 * One transaction holds a per-user lock across the writes and the read, so a version can
 * never become visible after a later one was already returned (which would skip it forever).
 */
export async function syncUserData(
  db: Db,
  userId: string,
  request: SyncRequest,
  { pageSize = DEFAULT_SYNC_PAGE_SIZE }: { pageSize?: number } = {},
): Promise<SyncResponse> {
  const rows = await db.transaction(async (raw) => {
    const tx = raw as unknown as Db;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    for (const row of toRows(request.changes)) await upsert(tx, userId, row);
    return tx
      .select()
      .from(syncRecord)
      .where(and(eq(syncRecord.userId, userId), gt(syncRecord.version, request.cursor)))
      .orderBy(asc(syncRecord.version))
      .limit(pageSize + 1);
  });

  const page = rows.slice(0, pageSize);
  return {
    cursor: page.at(-1)?.version ?? request.cursor,
    changes: toChanges(page),
    hasMore: rows.length > pageSize,
  };
}

/**
 * Retention. Spends dated before `cutoff` (YYYY-MM-DD) become tombstones, so devices delete
 * them too instead of uploading them again; tombstones older than TOMBSTONE_DAYS are removed.
 */
export async function purgeOldSpends(
  db: Db,
  cutoff: string,
  now: Date = new Date(),
): Promise<{ expired: number; removed: number }> {
  const stamp = now.toISOString();
  const expired = await db
    .update(syncRecord)
    .set({
      deletedAt: now,
      updatedAt: now,
      data: sql`jsonb_set(jsonb_set(${syncRecord.data}, '{deletedAt}', to_jsonb(${stamp}::text)), '{updatedAt}', to_jsonb(${stamp}::text))`,
      version: sql`nextval('sync_version_seq')`,
    })
    .where(
      and(
        eq(syncRecord.collection, 'spends'),
        lt(syncRecord.recordDate, cutoff),
        isNull(syncRecord.deletedAt),
      ),
    )
    .returning({ id: syncRecord.id });
  const removed = await db
    .delete(syncRecord)
    .where(lt(syncRecord.deletedAt, new Date(now.getTime() - TOMBSTONE_DAYS * DAY_MS)))
    .returning({ id: syncRecord.id });
  return { expired: expired.length, removed: removed.length };
}
