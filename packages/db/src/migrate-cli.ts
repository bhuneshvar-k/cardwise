/** Apply pending migrations: DATABASE_URL=… pnpm --filter @cardwise/db db:migrate */
import { createDb } from './client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const handle = createDb(url);
await handle.migrate();
await handle.close();
console.warn('Migrations applied');
