import { cardProductSchema, type CardProduct } from '@cardwise/engine';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { diffCards } from './card-diff';
import type { Db } from './client';
import { card, cardRevision, importRun, pendingChange } from './schema';

export { diffCards } from './card-diff';

type CardRow = typeof card.$inferSelect;
type RevisionSource = (typeof cardRevision.$inferInsert)['source'];
type PendingReason = (typeof pendingChange.$inferInsert)['reason'];

/** Key-order-independent JSON, since jsonb does not keep the order keys were written in. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .toSorted(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);

async function findCard(db: Db, id: string): Promise<CardRow | undefined> {
  return (await db.select().from(card).where(eq(card.id, id)).limit(1))[0];
}

async function insertCard(
  db: Db,
  data: CardProduct,
  source: RevisionSource,
  retired: boolean,
): Promise<void> {
  await db.insert(card).values({
    id: data.id,
    origin: data.origin,
    cardAdvisorKey: data.cardAdvisorKey ?? null,
    data,
    retired,
  });
  await db.insert(cardRevision).values({ cardId: data.id, revision: 1, data, source });
}

/** Someone else changed the card between our read and our write. */
export class ConcurrentEditError extends Error {
  constructor(cardId: string) {
    super(`The card ${cardId} has changed since it was loaded. Reload and try again.`);
    this.name = 'ConcurrentEditError';
  }
}

async function writeRevision(
  db: Db,
  row: CardRow,
  data: CardProduct,
  source: RevisionSource,
  meta: { note?: string; by?: string; adminEdited?: boolean } = {},
): Promise<void> {
  const revision = row.revision + 1;
  // Only if nobody else wrote a revision since `row` was read (optimistic locking).
  const updated = await db
    .update(card)
    .set({
      data,
      revision,
      updatedAt: new Date(),
      adminEdited: meta.adminEdited ?? row.adminEdited,
    })
    .where(and(eq(card.id, row.id), eq(card.revision, row.revision)))
    .returning({ id: card.id });
  if (updated.length === 0) throw new ConcurrentEditError(row.id);
  await db
    .insert(cardRevision)
    .values({ cardId: row.id, revision, data, source, note: meta.note, createdBy: meta.by });
}

/** Load the code-defined cards. Safe to run on every deploy; admin edits are never touched. */
export async function seedCatalogue(
  db: Db,
  curated: readonly CardProduct[],
  imported: readonly CardProduct[],
): Promise<void> {
  const curatedKeys = new Set(curated.map((c) => c.cardAdvisorKey).filter(Boolean));
  for (const data of curated) {
    const row = await findCard(db, data.id);
    if (!row) await insertCard(db, data, 'seed', false);
    else if (!row.adminEdited && !same(row.data, data))
      await writeRevision(db, row, data, 'seed', { note: 'Code update' });
  }
  // Imported cards are only ever added here (imports update them), so insert the missing
  // ones in one batch instead of hundreds of round trips.
  const existing = new Set((await db.select({ id: card.id }).from(card)).map((r) => r.id));
  const missing = imported.filter((c) => !existing.has(c.id));
  if (missing.length === 0) return;
  await db.transaction(async (raw) => {
    const tx = raw as unknown as Db;
    await tx.insert(card).values(
      missing.map((data) => ({
        id: data.id,
        origin: data.origin,
        cardAdvisorKey: data.cardAdvisorKey ?? null,
        data,
        retired: curatedKeys.has(data.cardAdvisorKey),
      })),
    );
    await tx
      .insert(cardRevision)
      .values(
        missing.map((data) => ({ cardId: data.id, revision: 1, data, source: 'seed' as const })),
      );
  });
}

export interface Catalogue {
  version: string;
  cards: CardProduct[];
}

/** Cards users see. `version` changes whenever any visible card does. */
export async function getCatalogue(db: Db): Promise<Catalogue> {
  const rows = await db.select().from(card).where(eq(card.retired, false)).orderBy(asc(card.id));
  const version = createHash('sha256')
    .update(rows.map((r) => `${r.id}:${r.revision}`).join('|'))
    .digest('hex')
    .slice(0, 16);
  return {
    version,
    cards: rows.map((r) => r.data).toSorted((a, b) => a.name.localeCompare(b.name)),
  };
}

async function lastImportedData(db: Db, cardId: string): Promise<CardProduct | undefined> {
  const rows = await db
    .select({ data: cardRevision.data })
    .from(cardRevision)
    .where(and(eq(cardRevision.cardId, cardId), inArray(cardRevision.source, ['import', 'seed'])))
    .orderBy(desc(cardRevision.revision))
    .limit(1);
  return rows[0]?.data;
}

async function queuePending(
  db: Db,
  target: CardRow,
  proposed: CardProduct,
  reason: PendingReason,
  summary: string,
  importRunId: number,
): Promise<boolean> {
  const open = await db
    .select({ proposed: pendingChange.proposed })
    .from(pendingChange)
    .where(and(eq(pendingChange.cardId, target.id), eq(pendingChange.status, 'pending')));
  if (open.some((p) => same(p.proposed, proposed))) return false;
  await db.insert(pendingChange).values({
    cardId: target.id,
    proposed,
    baseRevision: target.revision,
    reason,
    summary,
    importRunId,
  });
  return true;
}

export interface ImportStats {
  inserted: number;
  updated: number;
  pending: number;
  unchanged: number;
  [key: string]: number;
}

type Outcome = 'inserted' | 'updated' | 'pending' | 'unchanged';

async function importOne(
  db: Db,
  data: CardProduct,
  curatedByKey: Map<string, CardRow>,
  runId: number,
): Promise<Outcome> {
  const curated = data.cardAdvisorKey ? curatedByKey.get(data.cardAdvisorKey) : undefined;
  const row = await findCard(db, data.id);
  if (!row) {
    await insertCard(db, data, 'import', Boolean(curated));
    return 'inserted';
  }
  if (curated) {
    // The import only shadows a curated card: keep it current and tell an admin it moved.
    const diff = diffCards(row.data, data);
    if (diff.changes.length === 0) return 'unchanged';
    await writeRevision(db, row, data, 'import');
    const summary = `CardAdvisor changed: ${diff.changes.join('; ')}`;
    return (await queuePending(db, curated, data, 'curated_source_changed', summary, runId))
      ? 'pending'
      : 'unchanged';
  }
  if (row.adminEdited) {
    const previous = await lastImportedData(db, row.id);
    if (previous && same(previous, data)) return 'unchanged';
    const summary = diffCards(row.data, data).changes.join('; ') || 'New import';
    return (await queuePending(db, row, data, 'admin_edited', summary, runId))
      ? 'pending'
      : 'unchanged';
  }
  const diff = diffCards(row.data, data);
  if (diff.changes.length === 0) return 'unchanged';
  if (!diff.large) {
    await writeRevision(db, row, data, 'import');
    return 'updated';
  }
  return (await queuePending(db, row, data, 'large_change', diff.changes.join('; '), runId))
    ? 'pending'
    : 'unchanged';
}

/**
 * Apply a CardAdvisor import: new cards go live, small changes apply, and anything large,
 * touching an admin edit, or shadowing a curated card waits in the review queue.
 */
export async function applyImport(
  db: Db,
  imported: readonly CardProduct[],
  sourceVersion: string,
): Promise<ImportStats> {
  const [run] = await db
    .insert(importRun)
    .values({ sourceVersion })
    .returning({ id: importRun.id });
  const runId = run!.id;
  const stats: ImportStats = { inserted: 0, updated: 0, pending: 0, unchanged: 0 };
  try {
    const curatedRows = await db.select().from(card).where(eq(card.origin, 'curated'));
    const curatedByKey = new Map(
      curatedRows.filter((r) => r.cardAdvisorKey).map((r) => [r.cardAdvisorKey!, r]),
    );
    for (const data of imported) {
      try {
        stats[await importOne(db, data, curatedByKey, runId)] += 1;
      } catch (error) {
        // An admin saved this card mid-import; leave it for the next run.
        if (!(error instanceof ConcurrentEditError)) throw error;
        stats.conflicts = (stats.conflicts ?? 0) + 1;
      }
    }
    await db
      .update(importRun)
      .set({ status: 'succeeded', stats, finishedAt: new Date() })
      .where(eq(importRun.id, runId));
    return stats;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(importRun)
      .set({ status: 'failed', error: message, stats, finishedAt: new Date() })
      .where(eq(importRun.id, runId));
    throw error;
  }
}

export async function listPendingChanges(db: Db) {
  return db
    .select()
    .from(pendingChange)
    .where(eq(pendingChange.status, 'pending'))
    .orderBy(asc(pendingChange.createdAt), asc(pendingChange.id));
}

export async function decidePendingChange(
  db: Db,
  id: number,
  adminId: string,
  decision: 'approve' | 'reject',
): Promise<void> {
  await db.transaction(async (raw) => {
    const tx = raw as unknown as Db;
    // Claim the decision first, so two admins can't both apply the same change.
    const [pending] = await tx
      .update(pendingChange)
      .set({
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedBy: adminId,
        decidedAt: new Date(),
      })
      .where(and(eq(pendingChange.id, id), eq(pendingChange.status, 'pending')))
      .returning();
    if (!pending) throw new Error('This change was already decided');
    // Approving a curated-source notice only acknowledges it; the admin edits the curated card.
    if (decision !== 'approve' || pending.reason === 'curated_source_changed') return;
    const row = await findCard(tx, pending.cardId);
    if (!row) throw new Error('Card not found');
    if (row.revision !== pending.baseRevision)
      throw new Error('The card has changed since this proposal');
    await writeRevision(tx, row, pending.proposed, 'admin', {
      note: `Approved import change #${id}`,
      by: adminId,
    });
  });
}

export async function saveCardAsAdmin(
  db: Db,
  id: string,
  input: unknown,
  adminId: string,
  note: string,
): Promise<CardProduct> {
  const data = cardProductSchema.parse(input);
  if (data.id !== id) throw new Error('The card id cannot change');
  const row = await findCard(db, id);
  if (!row) throw new Error('Card not found');
  await writeRevision(db, row, data, 'admin', { note, by: adminId, adminEdited: true });
  return data;
}

export async function markCardReviewed(
  db: Db,
  id: string,
  adminId: string,
  adminName: string,
  today: string,
): Promise<void> {
  const row = await findCard(db, id);
  if (!row) throw new Error('Card not found');
  const data = { ...row.data, review: { reviewedOn: today, reviewedBy: adminName } };
  await writeRevision(db, row, data, 'admin', {
    note: 'Marked reviewed',
    by: adminId,
    adminEdited: true,
  });
}

export async function listCardsForAdmin(db: Db) {
  const rows = await db
    .select({
      id: card.id,
      origin: card.origin,
      revision: card.revision,
      adminEdited: card.adminEdited,
      retired: card.retired,
      updatedAt: card.updatedAt,
      data: card.data,
    })
    .from(card)
    .orderBy(asc(card.id));
  return rows.map(({ data, ...r }) => ({
    ...r,
    name: data.name,
    issuer: data.issuer,
    review: data.review ?? null,
  }));
}

export async function getCardForAdmin(db: Db, id: string) {
  const row = await findCard(db, id);
  if (!row) return undefined;
  const history = await db
    .select({
      revision: cardRevision.revision,
      source: cardRevision.source,
      note: cardRevision.note,
      createdAt: cardRevision.createdAt,
    })
    .from(cardRevision)
    .where(eq(cardRevision.cardId, id))
    .orderBy(desc(cardRevision.revision));
  return { ...row, history };
}
