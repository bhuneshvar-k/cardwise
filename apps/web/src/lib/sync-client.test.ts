// @vitest-environment node
import { syncRequestSchema } from '@cardwise/contracts';
import { syncUserData, type Db } from '@cardwise/db';
import { createTestDb, createTestUser } from '@cardwise/db/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { db } from './db';
import { addUserCard, listUserCards, logSpend, updateUserCard, wipeAllData } from './repo';
import { forgetAccountOnDevice, pendingChangeCount, syncNow } from './sync-client';

let server: Db;
let close: () => Promise<void>;
beforeAll(async () => ({ db: server, close } = await createTestDb()), 30_000);
afterAll(() => close());
beforeEach(async () => {
  await wipeAllData();
});

/** A fetch that runs the real server sync code against an in-memory Postgres. */
function serverFetch(userId: string, status?: number) {
  return async (_url: string, init: RequestInit) => {
    if (status) return new Response('{}', { status });
    const request = syncRequestSchema.parse(JSON.parse(String(init.body)));
    return Response.json(await syncUserData(server, userId, request));
  };
}

describe('syncNow', () => {
  test('first sign-in uploads cards made while signed out', async () => {
    // Arrange
    const userId = await createTestUser(server);
    await addUserCard({ cardId: 'hsbc-live-plus', nickname: 'Live' });
    // Act
    const result = await syncNow(userId, serverFetch(userId));
    // Assert
    expect(result).toMatchObject({ status: 'synced', pushed: 1 });
    expect(await pendingChangeCount()).toBe(0);
    const onServer = await syncUserData(server, userId, {
      cursor: 0,
      changes: { userCards: [], spends: [], settings: [] },
    });
    expect(onServer.changes.userCards[0]?.nickname).toBe('Live');
  });

  test('a second device gets the first device’s cards and spends', async () => {
    const userId = await createTestUser(server);
    const card = await addUserCard({ cardId: 'hsbc-live-plus' });
    await logSpend({
      userCardId: card.id,
      cardId: card.cardId,
      category: 'dining',
      date: '2026-11-21',
      amountPaise: 5000,
      rewardUnits: 500,
      valuePaise: 500,
      allocations: [],
    });
    await syncNow(userId, serverFetch(userId));
    // "Device B": empty local storage, same account
    await forgetAccountOnDevice();
    const result = await syncNow(userId, serverFetch(userId));
    expect(result).toMatchObject({ status: 'synced', pulled: 2 });
    expect(await listUserCards()).toHaveLength(1);
    expect(await db.spends.count()).toBe(1);
  });

  test('later edits sync both ways without re-sending unchanged data', async () => {
    const userId = await createTestUser(server);
    const card = await addUserCard({ cardId: 'hsbc-live-plus' });
    await syncNow(userId, serverFetch(userId));
    await updateUserCard(card.id, { nickname: 'Renamed' });
    const second = await syncNow(userId, serverFetch(userId));
    expect(second).toMatchObject({ status: 'synced', pushed: 1 });
    const third = await syncNow(userId, serverFetch(userId));
    expect(third).toMatchObject({ status: 'synced', pushed: 0 });
  });

  test('keeps a newer local edit over an older server copy', async () => {
    const userId = await createTestUser(server);
    const card = await addUserCard({ cardId: 'hsbc-live-plus', nickname: 'Server' });
    await syncNow(userId, serverFetch(userId));
    await db.syncState.update('sync', { cursor: 0 }); // force a full pull
    await updateUserCard(card.id, { nickname: 'Local' });
    await syncNow(userId, serverFetch(userId));
    expect((await listUserCards())[0]?.nickname).toBe('Local');
  });

  test('reports consent, sign-out and server errors without losing queued changes', async () => {
    const userId = await createTestUser(server);
    await addUserCard({ cardId: 'hsbc-live-plus' });
    expect(await syncNow(userId, serverFetch(userId, 409))).toEqual({ status: 'consent_required' });
    expect(await syncNow(userId, serverFetch(userId, 401))).toEqual({ status: 'signed_out' });
    expect(await syncNow(userId, serverFetch(userId, 500))).toMatchObject({ status: 'error' });
    expect(await pendingChangeCount()).toBe(1);
  });

  test('network failures come back as errors', async () => {
    const userId = await createTestUser(server);
    const failing = () => Promise.reject(new Error('offline'));
    expect(await syncNow(userId, failing)).toEqual({ status: 'error', message: 'offline' });
  });
});
