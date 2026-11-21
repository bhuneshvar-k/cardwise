import type { StoredSpend, StoredUserCard } from '@cardwise/contracts';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { Db } from './client';
import { purgeOldSpends, syncUserData } from './sync';
import { createTestDb, createTestUser } from './testing';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const at = (minute: number) => `2026-11-21T10:${String(minute).padStart(2, '0')}:00.000Z`;
const userCard = (id: string, o: Partial<StoredUserCard> = {}): StoredUserCard => ({
  id,
  cardId: 'hsbc-live-plus',
  createdAt: at(0),
  updatedAt: at(0),
  deletedAt: null,
  ...o,
});
const spend = (id: string, date: string): StoredSpend => ({
  id,
  userCardId: 'uc1',
  cardId: 'hsbc-live-plus',
  category: 'dining',
  date,
  amountPaise: 1000,
  rewardUnits: 100,
  valuePaise: 100,
  allocations: [],
  createdAt: at(0),
  updatedAt: at(0),
  deletedAt: null,
});
const push = (cursor: number, changes: Record<string, unknown[]>) =>
  ({ cursor, changes: { userCards: [], spends: [], settings: [], ...changes } }) as never;

describe('syncUserData', () => {
  test('a second device receives what the first one pushed', async () => {
    // Arrange
    const userId = await createTestUser(db);
    // Act: device A pushes a card, device B pulls from scratch
    const a = await syncUserData(
      db,
      userId,
      push(0, { userCards: [userCard('uc1', { nickname: 'Daily' })] }),
    );
    const b = await syncUserData(db, userId, push(0, {}));
    // Assert
    expect(b.changes.userCards).toEqual([
      expect.objectContaining({ id: 'uc1', nickname: 'Daily' }),
    ]);
    expect(b.cursor).toBe(a.cursor);
    expect(b.hasMore).toBe(false);
  });

  test('only returns changes after the cursor', async () => {
    const userId = await createTestUser(db);
    const first = await syncUserData(db, userId, push(0, { userCards: [userCard('uc1')] }));
    await syncUserData(db, userId, push(first.cursor, { userCards: [userCard('uc2')] }));
    const later = await syncUserData(db, userId, push(first.cursor, {}));
    expect(later.changes.userCards.map((c) => c.id)).toEqual(['uc2']);
  });

  test('an older edit never overwrites a newer one', async () => {
    const userId = await createTestUser(db);
    await syncUserData(
      db,
      userId,
      push(0, { userCards: [userCard('uc1', { nickname: 'New', updatedAt: at(5) })] }),
    );
    await syncUserData(
      db,
      userId,
      push(0, { userCards: [userCard('uc1', { nickname: 'Old', updatedAt: at(1) })] }),
    );
    const all = await syncUserData(db, userId, push(0, {}));
    expect(all.changes.userCards[0]?.nickname).toBe('New');
  });

  test('deletions sync as tombstones', async () => {
    const userId = await createTestUser(db);
    await syncUserData(db, userId, push(0, { userCards: [userCard('uc1')] }));
    await syncUserData(
      db,
      userId,
      push(0, { userCards: [userCard('uc1', { deletedAt: at(9), updatedAt: at(9) })] }),
    );
    const all = await syncUserData(db, userId, push(0, {}));
    expect(all.changes.userCards[0]?.deletedAt).toBe(at(9));
  });

  test('users never see each other’s data', async () => {
    const alice = await createTestUser(db);
    const bob = await createTestUser(db);
    await syncUserData(
      db,
      alice,
      push(0, { userCards: [userCard('shared-id', { nickname: 'Alice' })] }),
    );
    await syncUserData(
      db,
      bob,
      push(0, { userCards: [userCard('shared-id', { nickname: 'Bob' })] }),
    );
    const aliceView = await syncUserData(db, alice, push(0, {}));
    expect(aliceView.changes.userCards.map((c) => c.nickname)).toEqual(['Alice']);
  });

  test('pages large pulls and says there is more', async () => {
    const userId = await createTestUser(db);
    const spends = Array.from({ length: 5 }, (_, i) => spend(`s${i}`, '2026-11-01'));
    await syncUserData(db, userId, push(0, { spends }));
    const page = await syncUserData(db, userId, push(0, {}), { pageSize: 3 });
    expect(page.changes.spends).toHaveLength(3);
    expect(page.hasMore).toBe(true);
    const rest = await syncUserData(db, userId, push(page.cursor, {}), { pageSize: 3 });
    expect(rest.changes.spends).toHaveLength(2);
    expect(rest.hasMore).toBe(false);
  });

  test('syncs the settings document', async () => {
    const userId = await createTestUser(db);
    await syncUserData(
      db,
      userId,
      push(0, { settings: [{ id: 'settings', showOtherCards: true, updatedAt: at(3) }] }),
    );
    const all = await syncUserData(db, userId, push(0, {}));
    expect(all.changes.settings).toEqual([
      { id: 'settings', showOtherCards: true, updatedAt: at(3) },
    ]);
  });
});

describe('purgeOldSpends', () => {
  test('deletes spends dated before the cutoff and keeps cards', async () => {
    const userId = await createTestUser(db);
    await syncUserData(
      db,
      userId,
      push(0, {
        userCards: [userCard('uc1')],
        spends: [spend('old', '2024-01-01'), spend('new', '2026-11-01')],
      }),
    );
    const removed = await purgeOldSpends(db, '2025-05-21');
    const all = await syncUserData(db, userId, push(0, {}));
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(all.changes.spends.map((s) => s.id)).toEqual(['new']);
    expect(all.changes.userCards).toHaveLength(1);
  });
});
