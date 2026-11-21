/** Load code-defined cards into the database. Safe to re-run; admin edits are kept. */
import { curatedCards, importedCards } from '@cardwise/data';
import { seedCatalogue } from './catalogue';
import { createDb } from './client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const handle = createDb(url);
await seedCatalogue(handle.db, curatedCards, importedCards);
await handle.close();
console.warn('Catalogue seeded');
