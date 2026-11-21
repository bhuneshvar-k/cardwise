import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { migrate as migrateNode } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { schema } from './schema';

export type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;

export interface DbHandle {
  db: Db;
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

// A plain path, not `new URL(…, import.meta.url)`, which bundlers treat as an asset import.
const MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
const POOL_SIZE = 10;

/**
 * `postgres://…` uses a connection pool. `pglite:memory` or `pglite:./path` runs an
 * embedded Postgres, for tests and for local development without Docker.
 */
export function createDb(url: string): DbHandle {
  if (url.startsWith('pglite:')) {
    const target = url.slice('pglite:'.length);
    if (target !== 'memory') mkdirSync(target, { recursive: true });
    const client = target === 'memory' ? new PGlite() : new PGlite(target);
    const db = drizzlePglite(client, { schema });
    return {
      db: db as unknown as Db,
      migrate: () => migratePglite(db, { migrationsFolder: MIGRATIONS }),
      close: () => client.close(),
    };
  }
  const pool = new pg.Pool({ connectionString: url, max: POOL_SIZE });
  const db = drizzleNode(pool, { schema });
  return {
    db: db as unknown as Db,
    migrate: () => migrateNode(db, { migrationsFolder: MIGRATIONS }),
    close: () => pool.end(),
  };
}
