import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { deleteUserAccount, exportUserData, recordConsent } from './account';
import type { Db } from './client';
import { createReport, listReports, setReportStatus } from './reports';
import { syncUserData } from './sync';
import { createTestDb, createTestUser } from './testing';

let db: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db, close } = await createTestDb()));
afterAll(() => close());

const T = '2026-11-21T10:00:00.000Z';
const cardChange = {
  id: 'uc1',
  cardId: 'hsbc-live-plus',
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
};

describe('reports', () => {
  test('creates, lists open reports and resolves them', async () => {
    // Arrange
    const userId = await createTestUser(db);
    const adminId = await createTestUser(db, { role: 'admin' });
    // Act
    const report = await createReport(db, userId, {
      cardId: 'hsbc-live-plus',
      message: 'Swiggy is 5% not 10%',
      merchantId: 'swiggy',
    });
    // Assert
    expect((await listReports(db, 'open')).map((r) => r.id)).toContain(report.id);
    await setReportStatus(db, report.id, 'resolved', adminId);
    expect((await listReports(db, 'open')).map((r) => r.id)).not.toContain(report.id);
    expect((await listReports(db, 'resolved'))[0]).toMatchObject({
      id: report.id,
      resolvedBy: adminId,
    });
  });

  test('anonymous reports are allowed', async () => {
    const report = await createReport(db, null, { cardId: 'x', message: 'Wrong cap amount' });
    expect(report.userId).toBeNull();
  });
});

describe('account', () => {
  test('records consent with the notice version', async () => {
    const userId = await createTestUser(db);
    await recordConsent(db, userId, '2026-11-21');
    const data = await exportUserData(db, userId);
    expect(data.profile).toMatchObject({ consentVersion: '2026-11-21' });
    expect(data.profile.consentedAt).toBeTruthy();
  });

  test('export includes synced records and the user’s reports', async () => {
    const userId = await createTestUser(db);
    await syncUserData(db, userId, {
      cursor: 0,
      changes: { userCards: [cardChange], spends: [], settings: [] },
    });
    await createReport(db, userId, { cardId: 'hsbc-live-plus', message: 'Cap looks wrong' });
    const data = await exportUserData(db, userId);
    expect(data.records.userCards).toHaveLength(1);
    expect(data.reports).toHaveLength(1);
  });

  test('deleting an account removes its data and detaches its reports', async () => {
    const userId = await createTestUser(db);
    await syncUserData(db, userId, {
      cursor: 0,
      changes: { userCards: [cardChange], spends: [], settings: [] },
    });
    const report = await createReport(db, userId, {
      cardId: 'hsbc-live-plus',
      message: 'Cap looks wrong',
    });
    await deleteUserAccount(db, userId);
    await expect(exportUserData(db, userId)).rejects.toThrow(/not found/i);
    const kept = (await listReports(db, 'open')).find((r) => r.id === report.id);
    expect(kept?.userId).toBeNull();
  });
});
