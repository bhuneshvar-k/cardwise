const MAX_PAISE = 10_000_000 * 100 - 1; // just under ₹1 crore

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** ₹1,23,456 or ₹123.45 */
export function formatRupees(paise: number): string {
  return `₹${inr.format(paise / 100)}`;
}

/** Rupee text from an input box → paise. Undefined when empty or invalid. */
export function parseRupees(text: string): number | undefined {
  const cleaned = text.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  const paise = Math.round(Number(cleaned) * 100);
  if (paise <= 0 || paise > MAX_PAISE) return undefined;
  return paise;
}

/** Reward units in words: rupees for cashback (units are paise), else a count. */
export function formatUnits(
  units: number,
  kind: 'cashback' | 'points' | 'miles',
  unitLabel: string,
): string {
  if (kind === 'cashback') return formatRupees(units);
  return `${units.toLocaleString('en-IN')} ${unitLabel}`;
}

export function formatBps(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`;
}
