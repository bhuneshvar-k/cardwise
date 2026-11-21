/**
 * Background jobs: migrate + seed on start, then a nightly CardAdvisor import and a
 * nightly retention sweep. Runs as its own container next to the web app.
 */
import { curatedCards, importedCards } from '@cardwise/data';
import { createDb, seedCatalogue } from '@cardwise/db';
import { PgBoss } from 'pg-boss';
import { importCardAdvisor, runRetention } from './jobs';

const TZ = 'Asia/Kolkata';
const JOBS = {
  import: { name: 'import-cardadvisor', cron: '30 2 * * *' },
  retention: { name: 'retention', cron: '30 3 * * *' },
} as const;

const url = process.env.DATABASE_URL;
if (!url?.startsWith('postgres')) throw new Error('DATABASE_URL must be a postgres:// URL');

const handle = createDb(url);
await handle.migrate();
await seedCatalogue(handle.db, curatedCards, importedCards);

const boss = new PgBoss(url);
boss.on('error', (error) => console.error('pg-boss error', error));
await boss.start();

for (const job of Object.values(JOBS)) {
  await boss.createQueue(job.name);
  await boss.schedule(job.name, job.cron, null, { tz: TZ });
}

await boss.work(JOBS.import.name, async () => {
  const stats = await importCardAdvisor(handle.db);
  console.warn('CardAdvisor import finished', stats);
  return stats;
});

await boss.work(JOBS.retention.name, async () => {
  const removed = await runRetention(handle.db);
  console.warn('Retention sweep finished', removed);
  return removed;
});

if (process.argv.includes('--import-now')) await boss.send(JOBS.import.name);

const shutdown = async () => {
  await boss.stop();
  await handle.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
console.warn('Worker running');
