import { cardProductSchema, type CardProduct, type CardProductInput } from '@cardwise/engine';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
  applyImport,
  decidePendingChange,
  diffCards,
  getCardForAdmin,
  listCardsForAdmin,
  getCatalogue,
  listPendingChanges,
  markCardReviewed,
  saveCardAsAdmin,
  seedCatalogue,
} from './catalogue';
import type { Db } from './client';
import { card, cardRevision, pendingChange } from './schema';
import { createTestDb, createTestUser } from './testing';

let db: Db;
let close: () => Promise<void>;
let adminId: string;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  adminId = await createTestUser(db, { role: 'admin' });
});
afterAll(() => close());
beforeEach(async () => {
  await db.delete(pendingChange);
  await db.delete(cardRevision);
  await db.delete(card);
});

const make = (o: Partial<CardProductInput> & { id: string }): CardProduct =>
  cardProductSchema.parse({
    name: o.id,
    issuer: 'Bank',
    network: 'visa',
    kind: 'credit',
    currency: {
      kind: 'cashback',
      unitLabel: '₹',
      redemptions: [{ id: 's', label: 's', paisePerUnit: 1 }],
      defaultRedemptionId: 's',
    },
    baseRule: { id: 'base', label: '1%', match: {}, earn: { type: 'percent', bps: 100 } },
    rules: [],
    caps: [],
    exclusions: [],
    origin: 'cardadvisor',
    sources: [{ url: 'https://example.com', checkedOn: '2026-11-01' }],
    ...o,
  });
const imported = (key: string, bps = 100, extra: Partial<CardProductInput> = {}) =>
  make({
    id: `ca-${key}`,
    cardAdvisorKey: key,
    baseRule: { id: 'base', label: `${bps}`, match: {}, earn: { type: 'percent', bps } },
    ...extra,
  });
const curated = (key: string) =>
  make({ id: key, cardAdvisorKey: key, origin: 'curated', name: `Curated ${key}` });

describe('diffCards', () => {
  test('a small rate change is not large', () => {
    expect(diffCards(imported('a', 100), imported('a', 150)).large).toBe(false);
  });
  test('a 2-point rate change, a new rule or a halved cap is large', () => {
    expect(diffCards(imported('a', 100), imported('a', 300)).large).toBe(true);
    const withRule = imported('a', 100, {
      rules: [
        {
          id: 'x',
          label: 'x',
          match: { categories: ['dining'] },
          earn: { type: 'percent', bps: 500 },
        },
      ],
    });
    expect(diffCards(imported('a'), withRule).large).toBe(true);
    const cap = (max: number) =>
      imported('a', 100, {
        caps: [{ id: 'c', label: 'c', period: 'calendar_month', maxUnits: max }],
        rules: [
          { id: 'x', label: 'x', match: {}, earn: { type: 'percent', bps: 100 }, capIds: ['c'] },
        ],
      });
    expect(diffCards(cap(1000), cap(400)).large).toBe(true);
  });
  test('identical cards have no changes', () => {
    expect(diffCards(imported('a'), imported('a')).changes).toEqual([]);
  });
});

describe('seed and catalogue', () => {
  test('seeding inserts curated and imported cards once, and hides imports a curated card replaces', async () => {
    await seedCatalogue(db, [curated('live')], [imported('live'), imported('other')]);
    await seedCatalogue(db, [curated('live')], [imported('live'), imported('other')]);
    const { cards, version } = await getCatalogue(db);
    expect(cards.map((c) => c.id).toSorted()).toEqual(['ca-other', 'live']);
    expect(version).toMatch(/\w+/);
  });

  test('the catalogue version changes when a card changes', async () => {
    await seedCatalogue(db, [], [imported('a')]);
    const before = (await getCatalogue(db)).version;
    await saveCardAsAdmin(db, 'ca-a', imported('a', 120), adminId, 'fix');
    expect((await getCatalogue(db)).version).not.toBe(before);
  });
});

describe('applyImport', () => {
  test('adds new cards, applies small changes and holds large ones for review', async () => {
    // Arrange
    await seedCatalogue(db, [], [imported('small', 100), imported('large', 100)]);
    // Act
    const stats = await applyImport(
      db,
      [imported('small', 120), imported('large', 500), imported('fresh')],
      'v2',
    );
    // Assert
    expect(stats).toMatchObject({ inserted: 1, updated: 1, pending: 1 });
    const { cards } = await getCatalogue(db);
    const rate = (id: string) => cards.find((c) => c.id === id)?.baseRule.earn;
    expect(rate('ca-small')).toEqual({ type: 'percent', bps: 120 });
    expect(rate('ca-large')).toEqual({ type: 'percent', bps: 100 });
    const pending = await listPendingChanges(db);
    expect(pending).toEqual([
      expect.objectContaining({ cardId: 'ca-large', reason: 'large_change' }),
    ]);
  });

  test('never overwrites a card an admin edited', async () => {
    await seedCatalogue(db, [], [imported('a', 100)]);
    await saveCardAsAdmin(db, 'ca-a', imported('a', 110), adminId, 'checked with bank');
    const stats = await applyImport(db, [imported('a', 105)], 'v2');
    expect(stats.pending).toBe(1);
    expect((await getCatalogue(db)).cards[0]?.baseRule.earn).toEqual({ type: 'percent', bps: 110 });
    expect((await listPendingChanges(db))[0]?.reason).toBe('admin_edited');
  });

  test('flags curated cards when their CardAdvisor source changes', async () => {
    await seedCatalogue(db, [curated('live')], [imported('live', 100)]);
    await applyImport(db, [imported('live', 100)], 'v2');
    expect(await listPendingChanges(db)).toEqual([]);
    await applyImport(db, [imported('live', 150)], 'v3');
    expect(await listPendingChanges(db)).toEqual([
      expect.objectContaining({ cardId: 'live', reason: 'curated_source_changed' }),
    ]);
  });

  test('does not queue the same proposal twice', async () => {
    await seedCatalogue(db, [], [imported('large', 100)]);
    await applyImport(db, [imported('large', 500)], 'v2');
    await applyImport(db, [imported('large', 500)], 'v3');
    expect(await listPendingChanges(db)).toHaveLength(1);
  });
});

describe('review decisions', () => {
  test('approving applies the proposal; rejecting keeps the card', async () => {
    await seedCatalogue(db, [], [imported('a', 100), imported('b', 100)]);
    await applyImport(db, [imported('a', 500), imported('b', 500)], 'v2');
    const [first, second] = await listPendingChanges(db);
    await decidePendingChange(db, first!.id, adminId, 'approve');
    await decidePendingChange(db, second!.id, adminId, 'reject');
    const { cards } = await getCatalogue(db);
    const bps = (id: string) => {
      const earn = cards.find((c) => c.id === id)!.baseRule.earn;
      return earn.type === 'percent' ? earn.bps : NaN;
    };
    expect(bps(first!.cardId)).toBe(500);
    expect(bps(second!.cardId)).toBe(100);
    expect(await listPendingChanges(db)).toEqual([]);
  });

  test('approving a stale proposal fails instead of overwriting newer edits', async () => {
    await seedCatalogue(db, [], [imported('a', 100)]);
    await applyImport(db, [imported('a', 500)], 'v2');
    await saveCardAsAdmin(db, 'ca-a', imported('a', 130), adminId, 'manual');
    const [p] = await listPendingChanges(db);
    await expect(decidePendingChange(db, p!.id, adminId, 'approve')).rejects.toThrow(
      /changed since/,
    );
  });

  test('marking reviewed stamps the card and keeps a revision', async () => {
    await seedCatalogue(db, [curated('live')], []);
    await markCardReviewed(db, 'live', adminId, 'Admin', '2026-11-21');
    const { cards } = await getCatalogue(db);
    expect(cards[0]?.review).toEqual({ reviewedOn: '2026-11-21', reviewedBy: 'Admin' });
  });

  test('admin lists show every card, and each card history', async () => {
    await seedCatalogue(db, [curated('live')], [imported('live'), imported('other')]);
    await saveCardAsAdmin(db, 'ca-other', imported('other', 150), adminId, 'checked');
    const list = await listCardsForAdmin(db);
    expect(list.map((c) => c.id).toSorted()).toEqual(['ca-live', 'ca-other', 'live']);
    expect(list.find((c) => c.id === 'ca-live')?.retired).toBe(true);
    const detail = await getCardForAdmin(db, 'ca-other');
    expect(detail?.history.map((h) => [h.revision, h.source])).toEqual([
      [2, 'admin'],
      [1, 'seed'],
    ]);
    expect(await getCardForAdmin(db, 'nope')).toBeUndefined();
  });

  test('a decided change cannot be decided again', async () => {
    await seedCatalogue(db, [], [imported('a', 100)]);
    await applyImport(db, [imported('a', 500)], 'v2');
    const [p] = await listPendingChanges(db);
    await decidePendingChange(db, p!.id, adminId, 'reject');
    await expect(decidePendingChange(db, p!.id, adminId, 'approve')).rejects.toThrow(
      /already decided/,
    );
  });

  test('admin saves are validated', async () => {
    await seedCatalogue(db, [], [imported('a')]);
    await expect(
      saveCardAsAdmin(db, 'ca-a', { ...imported('a'), id: 'other-id' }, adminId, 'x'),
    ).rejects.toThrow(/id/);
    await expect(
      saveCardAsAdmin(db, 'ca-missing', imported('missing'), adminId, 'x'),
    ).rejects.toThrow(/not found/i);
  });
});
