'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, listSpends, listUserCards } from '@/lib/repo';
import type { Settings, StoredSpend, StoredUserCard } from '@/lib/db';

/** `undefined` while IndexedDB is loading, so screens can show a skeleton. */
export function useUserCards(): StoredUserCard[] | undefined {
  return useLiveQuery(listUserCards, []);
}

export function useSpends(): StoredSpend[] | undefined {
  return useLiveQuery(listSpends, []);
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, []);
}
