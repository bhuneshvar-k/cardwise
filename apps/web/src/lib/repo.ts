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

const META_KEYS = ['id', 'createdAt', 'updatedAt', 'deletedAt'] as const;
type Meta = (typeof META_KEYS)[number];
export type UserCardInput = Omit<StoredUserCard, Meta>;
export type SpendInput = Omit<StoredSpend, Meta>;

function stamp<T extends object>(input: T) {
  const time = now();
  return { ...input, id: newId(), createdAt: time, updatedAt: time, deletedAt: null };
}

/**
 * Re-adding a card the user removed brings back the old record, so spends already
 * logged this cycle still count towards its caps.
 */
export async function addUserCard(input: UserCardInput): Promise<StoredUserCard> {
  const removed = (await db.userCards.where('cardId').equals(input.cardId).toArray()).find(
    (c) => c.deletedAt,
  );
  if (removed) {
    const restored = storedUserCardSchema.parse({
      ...removed,
      ...input,
      deletedAt: null,
      updatedAt: now(),
    });
    await db.userCards.put(restored);
    return restored;
  }
  const card = storedUserCardSchema.parse(stamp(input));
  await db.userCards.add(card);
  return card;
}

export async function updateUserCard(
  id: string,
  patch: Partial<UserCardInput>,
): Promise<StoredUserCard> {
  const existing = await db.userCards.get(id);
  if (!existing || existing.deletedAt) throw new Error('Card not found');
  const updated = storedUserCardSchema.parse({ ...existing, ...patch, id, updatedAt: now() });
  await db.userCards.put(updated);
  return updated;
}

export async function removeUserCard(id: string): Promise<void> {
  const time = now();
  await db.userCards.update(id, { deletedAt: time, updatedAt: time });
}

export async function listUserCards(): Promise<StoredUserCard[]> {
  const all = await db.userCards.orderBy('updatedAt').toArray();
  return all.filter((c) => !c.deletedAt).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function logSpend(input: SpendInput): Promise<StoredSpend> {
  const spend = storedSpendSchema.parse(stamp(input));
  await db.spends.add(spend);
  return spend;
}

export async function deleteSpend(id: string): Promise<void> {
  const time = now();
  await db.spends.update(id, { deletedAt: time, updatedAt: time });
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

export async function saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const next = settingsSchema.parse({ ...(await getSettings()), ...patch });
  await db.settings.put(next);
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

/** Replaces local data with a backup file's contents after validating it. */
export async function importData(file: unknown): Promise<void> {
  const backup = backupSchema.parse(file);
  await db.transaction('rw', db.userCards, db.spends, db.settings, async () => {
    await Promise.all([db.userCards.clear(), db.spends.clear(), db.settings.clear()]);
    await db.userCards.bulkAdd(backup.userCards);
    await db.spends.bulkAdd(backup.spends);
    if (backup.settings) await db.settings.put(backup.settings);
  });
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', db.userCards, db.spends, db.settings, async () => {
    await Promise.all([db.userCards.clear(), db.spends.clear(), db.settings.clear()]);
  });
}
