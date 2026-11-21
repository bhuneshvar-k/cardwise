import 'server-only';
import { createDb, seedCatalogue, type Db, type DbHandle } from '@cardwise/db';
import { curatedCards, importedCards } from '@cardwise/data';
import { serverEnv } from './env';

const globalForDb = globalThis as unknown as { cardwiseDb?: Promise<DbHandle> };

/**
 * One database handle per process. An embedded PGlite database is migrated and seeded on
 * first use so local development needs no setup; Postgres is migrated by the deploy step.
 */
async function open(url: string): Promise<DbHandle> {
  const handle = createDb(url);
  if (url.startsWith('pglite:')) {
    await handle.migrate();
    await seedCatalogue(handle.db, curatedCards, importedCards);
  }
  return handle;
}

export async function getDb(): Promise<Db> {
  const url = serverEnv().DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  globalForDb.cardwiseDb ??= open(url).catch((error: unknown) => {
    globalForDb.cardwiseDb = undefined; // let the next request try again
    throw error;
  });
  return (await globalForDb.cardwiseDb).db;
}
