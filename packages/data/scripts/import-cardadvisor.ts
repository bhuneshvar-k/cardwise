/**
 * Refresh src/generated/cardadvisor-cards.json from CardAdvisor's open data.
 *   pnpm --filter @cardwise/data import:cardadvisor            # download
 *   pnpm --filter @cardwise/data import:cardadvisor ./cards.json  # local file
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { convertCardAdvisor } from '../src/cardadvisor';

const SOURCE_URL = 'https://cardadvisor.in/data/cards.json';
const OUT = fileURLToPath(new URL('../src/generated/cardadvisor-cards.json', import.meta.url));

async function load(path?: string): Promise<unknown> {
  if (path) return JSON.parse(await readFile(path, 'utf8'));
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'cardwise-importer/0.1 (open data import)' },
  });
  if (!res.ok) throw new Error(`CardAdvisor download failed: HTTP ${res.status}`);
  return res.json();
}

async function main(): Promise<void> {
  const report = convertCardAdvisor(await load(process.argv[2]));
  await writeFile(OUT, `${JSON.stringify(report.cards)}\n`);
  console.warn(
    `Imported ${report.cards.length} cards; skipped ${report.skippedCards.length} cards and ${report.skippedRows.length} rows.`,
  );
  for (const s of report.skippedCards) console.warn(`  card ${s.cardKey}: ${s.reason}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
