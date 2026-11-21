import type { SyncCollection } from '@cardwise/contracts';
import { z } from 'zod';
import {
  db,
  settingsSchema,
  storedSpendSchema,
  storedUserCardSchema,
  type Settings,
  type StoredSpend,
  type StoredUserCard,
} from './db';

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

type Meta = 'id' | 'createdAt' | 'updatedAt' | 'deletedAt';
export type UserCardInput = Omit<StoredUserCard, Meta>;
export type SpendInput = Omit<StoredSpend, Meta>;

function stamp<T extends object>(input: T) {
  const time = now();
  return { ...input, id: newId(), createdAt: time, updatedAt: time, deletedAt: null };
}

/** Queue a record for the next sync. Harmless when signed out: it waits until sign-in. */
async function markDirty(collection: SyncCollection, id: string, updatedAt: string): Promise<void> {
  await db.outbox.put({ key: `${collection}:${id}`, collection, id, updatedAt });
}

/**
 * Re-adding a card the user removed brings back the old record, so spends already
 * logged this cycle still count towards its caps.
 */
export async function addUserCard(input: UserCardInput): Promise<StoredUserCard> {
  const removed = (await db.userCards.where('cardId').equals(input.cardId).toArray()).find(
    (c) => c.deletedAt,
  );
  const card = removed
    ? storedUserCardSchema.parse({ ...removed, ...input, deletedAt: null, updatedAt: now() })
    : storedUserCardSchema.parse(stamp(input));
  await db.transaction('rw', db.userCards, db.outbox, async () => {
    await db.userCards.put(card);
    await markDirty('userCards', card.id, card.updatedAt);
  });
  return card;
}

export async function updateUserCard(
  id: string,
  patch: Partial<UserCardInput>,
): Promise<StoredUserCard> {
  const existing = await db.userCards.get(id);
  if (!existing || existing.deletedAt) throw new Error('Card not found');
  const updated = storedUserCardSchema.parse({ ...existing, ...patch, id, updatedAt: now() });
  await db.transaction('rw', db.userCards, db.outbox, async () => {
    await db.userCards.put(updated);
    await markDirty('userCards', id, updated.updatedAt);
  });
  return updated;
}

export async function removeUserCard(id: string): Promise<void> {
  const time = now();
  await db.transaction('rw', db.userCards, db.outbox, async () => {
    await db.userCards.update(id, { deletedAt: time, updatedAt: time });
    await markDirty('userCards', id, time);
  });
}

export async function listUserCards(): Promise<StoredUserCard[]> {
  const all = await db.userCards.orderBy('updatedAt').toArray();
  return all.filter((c) => !c.deletedAt).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function logSpend(input: SpendInput): Promise<StoredSpend> {
  const spend = storedSpendSchema.parse(stamp(input));
  await db.transaction('rw', db.spends, db.outbox, async () => {
    await db.spends.add(spend);
    await markDirty('spends', spend.id, spend.updatedAt);
  });
  return spend;
}

export async function deleteSpend(id: string): Promise<void> {
  const time = now();
  await db.transaction('rw', db.spends, db.outbox, async () => {
    await db.spends.update(id, { deletedAt: time, updatedAt: time });
    await markDirty('spends', id, time);
  });
}

/** Newest first. Includes every live spend; callers filter by period. */
export async function listSpends(): Promise<StoredSpend[]> {
  // Dexie collection reverse (query order), not Array#reverse.
  // oxlint-disable-next-line unicorn/no-array-reverse
  const all = await db.spends.orderBy('date').reverse().toArray();
  return all.filter((s) => !s.deletedAt);
}

export async function getSettings(): Promise<Settings> {
  return settingsSchema.parse((await db.settings.get('settings')) ?? { id: 'settings' });
}

export async function saveSettings(
  patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>,
): Promise<Settings> {
  const updatedAt = now();
  const next = settingsSchema.parse({ ...(await getSettings()), ...patch, updatedAt });
  await db.transaction('rw', db.settings, db.outbox, async () => {
    await db.settings.put(next);
    await markDirty('settings', 'settings', updatedAt);
  });
  return next;
}

const backupSchema = z.object({
  app: z.literal('cardwise'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  userCards: z.array(storedUserCardSchema),
  spends: z.array(storedSpendSchema),
  settings: settingsSchema.optional(),
});
export type Backup = z.infer<typeof backupSchema>;

export async function exportData(): Promise<Backup> {
  return {
    app: 'cardwise',
    version: 1,
    exportedAt: now(),
    userCards: await db.userCards.toArray(),
    spends: await db.spends.toArray(),
    settings: await getSettings(),
  };
}

/** Put every local record in the outbox, e.g. when an account is first linked. */
export async function queueEverything(): Promise<void> {
  const cards = await db.userCards.toArray();
  const spends = await db.spends.toArray();
  const settings = await db.settings.get('settings');
  await db.outbox.bulkPut([
    ...cards.map((c) => ({
      key: `userCards:${c.id}`,
      collection: 'userCards' as const,
      id: c.id,
      updatedAt: c.updatedAt,
    })),
    ...spends.map((s) => ({
      key: `spends:${s.id}`,
      collection: 'spends' as const,
      id: s.id,
      updatedAt: s.updatedAt,
    })),
    ...(settings
      ? [
          {
            key: 'settings:settings',
            collection: 'settings' as const,
            id: 'settings',
            updatedAt: settings.updatedAt ?? now(),
          },
        ]
      : []),
  ]);
}

/** Replaces local data with a backup file's contents after validating it; all of it syncs. */
export async function importData(file: unknown): Promise<void> {
  const backup = backupSchema.parse(file);
  await db.transaction('rw', [db.userCards, db.spends, db.settings, db.outbox], async () => {
    await Promise.all([db.userCards.clear(), db.spends.clear(), db.settings.clear()]);
    await db.userCards.bulkAdd(backup.userCards);
    await db.spends.bulkAdd(backup.spends);
    if (backup.settings) await db.settings.put(backup.settings);
    await queueEverything();
  });
}

export async function wipeAllData(): Promise<void> {
  const tables = [db.userCards, db.spends, db.settings, db.outbox, db.syncState];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
  });
}
