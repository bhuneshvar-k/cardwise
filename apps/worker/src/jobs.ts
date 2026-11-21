import { SPEND_RETENTION_MONTHS } from '@cardwise/contracts';
import { convertCardAdvisor } from '@cardwise/data';
import {
  applyImport,
  purgeExpiredAuthRecords,
  purgeOldSpends,
  type Db,
  type ImportStats,
} from '@cardwise/db';

export const CARDADVISOR_URL = 'https://cardadvisor.in/data/cards.json';
const USER_AGENT = 'cardwise-importer/0.1 (open data import)';

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Download CardAdvisor's open data and run it through the review rules. */
export async function importCardAdvisor(
  db: Db,
  fetchImpl: Fetch = fetch,
): Promise<ImportStats & { skippedCards: number }> {
  const res = await fetchImpl(CARDADVISOR_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`CardAdvisor download failed: HTTP ${res.status}`);
  const file = (await res.json()) as { version?: string };
  const report = convertCardAdvisor(file);
  const stats = await applyImport(db, report.cards, file.version ?? 'unknown');
  return { ...stats, skippedCards: report.skippedCards.length };
}

/** YYYY-MM-DD, `months` before `today`. */
export function monthsBefore(today: Date, months: number): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months, today.getUTCDate()),
  );
  return d.toISOString().slice(0, 10);
}

/** Apply retention: old spends and expired sign-in records. */
export async function runRetention(
  db: Db,
  today: Date = new Date(),
): Promise<{ spends: number; auth: number }> {
  const spends = await purgeOldSpends(db, monthsBefore(today, SPEND_RETENTION_MONTHS));
  const auth = await purgeExpiredAuthRecords(db, today);
  return { spends, auth };
}
