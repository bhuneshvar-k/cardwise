import type { CardProduct } from '@cardwise/engine';
import type { Settings, StoredSpend, StoredUserCard, SyncCollection } from '@cardwise/contracts';
import Dexie, { type EntityTable } from 'dexie';

export {
  settingsSchema,
  storedSpendSchema,
  storedUserCardSchema,
  type Settings,
  type StoredSpend,
  type StoredUserCard,
} from '@cardwise/contracts';

/** A local change waiting to be sent to the server. */
export interface OutboxEntry {
  /** `${collection}:${id}` */
  key: string;
  collection: SyncCollection;
  id: string;
  /** The record's `updatedAt` when queued; a newer edit replaces the entry. */
  updatedAt: string;
}

export interface SyncState {
  id: 'sync';
  /** The account this device's data belongs to; null when signed out. */
  userId: string | null;
  cursor: number;
  lastSyncedAt: string | null;
}

export interface CachedCatalogue {
  id: 'catalogue';
  version: string;
  cards: CardProduct[];
  fetchedAt: string;
}

export class CardwiseDb extends Dexie {
  userCards!: EntityTable<StoredUserCard, 'id'>;
  spends!: EntityTable<StoredSpend, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  outbox!: EntityTable<OutboxEntry, 'key'>;
  syncState!: EntityTable<SyncState, 'id'>;
  catalogue!: EntityTable<CachedCatalogue, 'id'>;

  constructor() {
    super('cardwise');
    this.version(1).stores({
      userCards: 'id, cardId, updatedAt',
      spends: 'id, userCardId, date, updatedAt',
      settings: 'id',
    });
    this.version(2).stores({
      outbox: 'key',
      syncState: 'id',
      catalogue: 'id',
    });
  }
}

export const db = new CardwiseDb();
