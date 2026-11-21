import {
  MAX_SYNC_CHANGES,
  type Settings,
  type StoredSpend,
  type StoredUserCard,
  type SyncCollection,
  type SyncRequestInput,
  type SyncResponse,
} from '@cardwise/contracts';
import type { Table } from 'dexie';
import { db, type OutboxEntry, type SyncState } from './db';
import { queueEverything } from './repo';

export type SyncResult =
  | { status: 'synced'; pushed: number; pulled: number }
  | { status: 'signed_out' }
  | { status: 'consent_required' }
  | { status: 'error'; message: string };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/** Stop after this many request rounds; the next sync picks up the rest. */
const MAX_ROUNDS = 10;
type AnyRecord = { id: string; updatedAt?: string };

function table(collection: SyncCollection): Table<AnyRecord, string> {
  const tables = { userCards: db.userCards, spends: db.spends, settings: db.settings };
  return tables[collection] as unknown as Table<AnyRecord, string>;
}

async function loadState(userId: string): Promise<SyncState> {
  const state = await db.syncState.get('sync');
  if (state?.userId === userId) return state;
  const fresh: SyncState = { id: 'sync', userId, cursor: 0, lastSyncedAt: null };
  const tables = [db.userCards, db.spends, db.settings, db.outbox, db.syncState];
  await db.transaction('rw', tables, async () => {
    if (state?.userId) {
      // Another account's data is still here (its session ended without signing out).
      // Never upload it into this account: start clean and pull this account's data.
      await Promise.all(tables.map((t) => t.clear()));
    } else {
      // Signed out until now: what was saved on this device joins the account.
      await queueEverything();
    }
    await db.syncState.put(fresh);
  });
  return fresh;
}

async function buildChanges(batch: readonly OutboxEntry[]): Promise<SyncRequestInput['changes']> {
  const changes = {
    userCards: [] as StoredUserCard[],
    spends: [] as StoredSpend[],
    settings: [] as Settings[],
  };
  for (const entry of batch) {
    const record = await table(entry.collection).get(entry.id);
    if (record) (changes[entry.collection] as AnyRecord[]).push(record);
  }
  return changes;
}

/** Store pulled records unless this device holds a newer, unsent edit. */
async function applyPulled(response: SyncResponse): Promise<number> {
  let applied = 0;
  for (const collection of ['userCards', 'spends', 'settings'] as const) {
    for (const incoming of response.changes[collection] as AnyRecord[]) {
      const pending = await db.outbox.get(`${collection}:${incoming.id}`);
      if (pending && pending.updatedAt > (incoming.updatedAt ?? '')) continue;
      const local = await table(collection).get(incoming.id);
      if (local?.updatedAt && incoming.updatedAt && local.updatedAt > incoming.updatedAt) continue;
      await table(collection).put(incoming);
      applied += 1;
    }
  }
  return applied;
}

/** Remove sent entries, unless the record was edited again while the request was in flight. */
async function clearSent(batch: readonly OutboxEntry[]): Promise<void> {
  for (const sent of batch) {
    const current = await db.outbox.get(sent.key);
    if (current?.updatedAt === sent.updatedAt) await db.outbox.delete(sent.key);
  }
}

async function round(
  state: SyncState,
  fetchImpl: Fetch,
): Promise<SyncResult & { more?: boolean; cursor?: number }> {
  const batch = await db.outbox.limit(MAX_SYNC_CHANGES).toArray();
  const body: SyncRequestInput = { cursor: state.cursor, changes: await buildChanges(batch) };
  const res = await fetchImpl('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (res.status === 401) return { status: 'signed_out' };
  if (res.status === 409) return { status: 'consent_required' };
  if (!res.ok) return { status: 'error', message: `Sync failed (${res.status})` };

  const response = (await res.json()) as SyncResponse;
  let pulled = 0;
  await db.transaction(
    'rw',
    [db.userCards, db.spends, db.settings, db.outbox, db.syncState],
    async () => {
      pulled = await applyPulled(response);
      await clearSent(batch);
      await db.syncState.put({
        ...state,
        cursor: response.cursor,
        lastSyncedAt: new Date().toISOString(),
      });
    },
  );
  const more = response.hasMore || batch.length === MAX_SYNC_CHANGES;
  return { status: 'synced', pushed: batch.length, pulled, more, cursor: response.cursor };
}

/** Push local changes and pull everyone else's, for the signed-in user. */
export async function syncNow(userId: string, fetchImpl: Fetch = fetch): Promise<SyncResult> {
  try {
    let state = await loadState(userId);
    let pushed = 0;
    let pulled = 0;
    for (let i = 0; i < MAX_ROUNDS; i += 1) {
      const result = await round(state, fetchImpl);
      if (result.status !== 'synced') return result;
      pushed += result.pushed;
      pulled += result.pulled;
      state = { ...state, cursor: result.cursor ?? state.cursor };
      if (!result.more) break;
    }
    return { status: 'synced', pushed, pulled };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Sync failed' };
  }
}

/** Signing out removes account data from this device; it stays in the account. */
/** Caches that may hold responses fetched while signed in; app code and fonts are kept. */
const ACCOUNT_CACHE =
  /^(apis|others|pages|pages-rsc|pages-rsc-prefetch|rsc-payloads|cross-origin)$/;

export async function forgetAccountOnDevice(): Promise<void> {
  const tables = [db.userCards, db.spends, db.settings, db.outbox, db.syncState];
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()));
  });
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => ACCOUNT_CACHE.test(n)).map((n) => caches.delete(n)));
}

export async function pendingChangeCount(): Promise<number> {
  return db.outbox.count();
}
