import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { adminOverview } from './admin';
import { applyImport, seedCatalogue } from './catalogue';
import type { Db } from './client';
import { createReport } from './reports';
import { createTestDb } from './testing';
import { curatedCards, importedCards } from '@cardwise/data';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

describe('adminOverview', () => {
  test('counts visible cards, open reports and shows the last import', async () => {
    await seedCatalogue(db, curatedCards, importedCards);
    await createReport(db, null, { cardId: 'hsbc-live-plus', message: 'Cap is wrong' });
    await applyImport(db, importedCards.slice(0, 5), 'v-test');
    const overview = await adminOverview(db);
    expect(overview.cards).toBeGreaterThan(250);
    expect(overview.openReports).toBe(1);
    expect(overview.lastImport).toMatchObject({ status: 'succeeded', sourceVersion: 'v-test' });
  });
});
