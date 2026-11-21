'use client';

import { catalogueResponseSchema } from '@cardwise/contracts';
import { cards as bundledCards } from '@cardwise/data';
import type { CardProduct } from '@cardwise/engine';
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { db } from '@/lib/db';

export interface Catalogue {
  cards: readonly CardProduct[];
  getCard: (id: string) => CardProduct | undefined;
  /** Where the cards came from: the server, this device's cache, or the app bundle. */
  source: 'server' | 'cache' | 'bundled';
}

const REFRESH_MS = 60 * 60 * 1000;

function makeCatalogue(cards: readonly CardProduct[], source: Catalogue['source']): Catalogue {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return { cards, getCard: (id) => byId.get(id), source };
}

const bundled = makeCatalogue(bundledCards, 'bundled');
const CatalogueContext = createContext<Catalogue>(bundled);

/** Fetch the live catalogue and keep a copy on the device for offline use. */
async function refreshCatalogue(): Promise<string | null> {
  const res = await fetch('/api/catalogue');
  if (!res.ok) return null; // 503: this deployment has no catalogue service; keep what we have
  const parsed = catalogueResponseSchema.parse(await res.json());
  const current = await db.catalogue.get('catalogue');
  if (current?.version !== parsed.version) {
    await db.catalogue.put({ id: 'catalogue', ...parsed, fetchedAt: new Date().toISOString() });
  }
  return parsed.version;
}

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const cached = useLiveQuery(() => db.catalogue.get('catalogue'), []);
  const refresh = useQuery({
    queryKey: ['catalogue'],
    queryFn: refreshCatalogue,
    staleTime: REFRESH_MS,
    retry: 1,
  });

  const value = useMemo(() => {
    if (!cached) return bundled;
    return makeCatalogue(cached.cards, refresh.data === cached.version ? 'server' : 'cache');
  }, [cached, refresh.data]);

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): Catalogue {
  return useContext(CatalogueContext);
}
