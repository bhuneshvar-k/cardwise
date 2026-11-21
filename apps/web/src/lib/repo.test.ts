import { beforeEach, describe, expect, test } from 'vitest';
import { db } from './db';
import {
  addUserCard,
  deleteSpend,
  exportData,
  importData,
  listSpends,
  listUserCards,
  logSpend,
  removeUserCard,
  updateUserCard,
  wipeAllData,
} from './repo';

beforeEach(async () => {
  await wipeAllData();
});

describe('user cards', () => {
  test('adds a card with timestamps and lists it', async () => {
    // Arrange / Act
    const card = await addUserCard({ cardId: 'hsbc-live-plus', statementDay: 12 });
    // Assert
    const cards = await listUserCards();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: card.id,
      cardId: 'hsbc-live-plus',
      statementDay: 12,
      deletedAt: null,
    });
    expect(cards[0]!.createdAt).toBe(cards[0]!.updatedAt);
  });

  test('updates fields without touching the original object', async () => {
    const card = await addUserCard({ cardId: 'hsbc-live-plus' });
    const updated = await updateUserCard(card.id, { nickname: 'Daily card' });
    expect(updated.nickname).toBe('Daily card');
    expect(card.nickname).toBeUndefined();
  });

  test('rejects an invalid statement day', async () => {
    await expect(addUserCard({ cardId: 'x', statementDay: 31 })).rejects.toThrow();
  });

  test('remove is a soft delete so sync can see it', async () => {
    const card = await addUserCard({ cardId: 'hsbc-live-plus' });
    await removeUserCard(card.id);
    expect(await listUserCards()).toEqual([]);
    expect((await db.userCards.get(card.id))?.deletedAt).toBeTruthy();
  });

  test('updating a missing card fails clearly', async () => {
    await expect(updateUserCard('nope', { nickname: 'x' })).rejects.toThrow(/not found/i);
  });
});

describe('spends', () => {
  test('logs a spend and lists newest first, skipping deleted ones', async () => {
    const card = await addUserCard({ cardId: 'hsbc-live-plus' });
    const base = {
      userCardId: card.id,
      cardId: card.cardId,
      category: 'dining' as const,
      rewardUnits: 100,
      valuePaise: 100,
      allocations: [],
    };
    const older = await logSpend({ ...base, date: '2026-11-01', amountPaise: 1000 });
    await logSpend({ ...base, date: '2026-11-20', amountPaise: 2000 });
    await deleteSpend(older.id);
    const spends = await listSpends();
    expect(spends.map((s) => s.amountPaise)).toEqual([2000]);
  });

  test('rejects a spend with no amount', async () => {
    await expect(
      logSpend({
        userCardId: 'u',
        cardId: 'c',
        category: 'other',
        date: '2026-11-01',
        amountPaise: 0,
        rewardUnits: 0,
        valuePaise: 0,
        allocations: [],
      }),
    ).rejects.toThrow();
  });
});

describe('export and import', () => {
  test('round-trips all data, including deletions', async () => {
    const card = await addUserCard({ cardId: 'hsbc-live-plus', nickname: 'Live' });
    await logSpend({
      userCardId: card.id,
      cardId: card.cardId,
      category: 'dining',
      date: '2026-11-20',
      amountPaise: 5000,
      rewardUnits: 500,
      valuePaise: 500,
      allocations: [],
    });
    const backup = await exportData();
    await wipeAllData();
    await importData(backup);
    expect((await listUserCards())[0]?.nickname).toBe('Live');
    expect(await listSpends()).toHaveLength(1);
  });

  test('refuses a file that is not a Cardwise backup', async () => {
    await expect(importData({ hello: 'world' })).rejects.toThrow();
  });
});
