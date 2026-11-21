import { cards, curatedCards, importedCards } from '@cardwise/data';
import {
  getCatalogue,
  listPendingChanges,
  seedCatalogue,
  syncUserData,
  type Db,
} from '@cardwise/db';
import { createTestDb, createTestUser } from '@cardwise/db/testing';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { importCardAdvisor, monthsBefore, runRetention } from './jobs';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalogue(db, curatedCards, importedCards);
}, 60_000);
afterAll(() => close());

/** Minimal CardAdvisor file built from one imported card's facts. */
function cardAdvisorFile(baseRatePct: number) {
  return {
    license: 'CC BY 4.0',
    version: 'v-test',
    asOf: '2026-11-21',
    cards: [
      {
        cardKey: 'test-new-card',
        name: 'Test New Card',
        issuer: 'TEST',
        network: 'VISA',
        url: 'https://cardadvisor.in/cards/test-new-card',
        lastVerified: '2026-11-21',
        rewards: [
          {
            category: 'DEFAULT',
            rewardType: 'CASHBACK',
            ratePct: baseRatePct,
            monthlyCapRs: null,
            pointValuePaisa: 100,
            merchants: null,
          },
        ],
      },
    ],
  };
}

describe('importCardAdvisor', () => {
  test('adds new cards and holds a later large change for review', async () => {
    const fake = (rate: number) => async () => Response.json(cardAdvisorFile(rate));
    const first = await importCardAdvisor(db, fake(1));
    expect(first.inserted).toBe(1);
    expect((await getCatalogue(db)).cards.some((c) => c.id === 'ca-test-new-card')).toBe(true);
    const second = await importCardAdvisor(db, fake(5));
    expect(second.pending).toBe(1);
    expect((await listPendingChanges(db)).map((p) => p.cardId)).toContain('ca-test-new-card');
  });

  test('fails loudly when the download fails', async () => {
    await expect(
      importCardAdvisor(db, async () => new Response('', { status: 503 })),
    ).rejects.toThrow(/503/);
  });
});

describe('runRetention', () => {
  test('deletes spends older than the retention period', async () => {
    const userId = await createTestUser(db);
    const T = '2026-11-21T00:00:00.000Z';
    const spend = (id: string, date: string) => ({
      id,
      userCardId: 'u',
      cardId: 'c',
      category: 'dining' as const,
      date,
      amountPaise: 100,
      rewardUnits: 1,
      valuePaise: 1,
      allocations: [],
      createdAt: T,
      updatedAt: T,
      deletedAt: null,
    });
    await syncUserData(db, userId, {
      cursor: 0,
      changes: {
        userCards: [],
        spends: [spend('old', '2025-01-01'), spend('new', '2026-11-01')],
        settings: [],
      },
    });
    const result = await runRetention(db, new Date('2026-11-21T00:00:00Z'));
    expect(result.spends.expired).toBe(1);
  });

  test('monthsBefore counts back calendar months', () => {
    expect(monthsBefore(new Date('2026-11-21T00:00:00Z'), 18)).toBe('2025-05-21');
  });
});

test('the bundled catalogue and import file agree on size', async () => {
  // Sanity check that the generated data the worker seeds from is present.
  const raw = JSON.parse(
    await readFile(
      new URL('../../../packages/data/src/generated/cardadvisor-cards.json', import.meta.url),
      'utf8',
    ),
  ) as unknown[];
  expect(raw.length).toBe(importedCards.length);
  expect(cards.length).toBeGreaterThan(200);
});
