import { createDb, type Db } from './client';
import { user } from './schema';

/** A fresh, migrated in-memory Postgres for one test file. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const handle = createDb('pglite:memory');
  await handle.migrate();
  return { db: handle.db, close: handle.close };
}

let counter = 0;

export async function createTestUser(
  db: Db,
  overrides: Partial<typeof user.$inferInsert> = {},
): Promise<string> {
  counter += 1;
  const id = overrides.id ?? `user-${counter}`;
  await db
    .insert(user)
    .values({ id, name: `User ${counter}`, email: `${id}@example.test`, ...overrides });
  return id;
}
