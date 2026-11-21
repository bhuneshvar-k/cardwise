import type { CapPeriod } from './schema';
import type { IsoDate } from './types';

export interface Period {
  start: IsoDate;
  end: IsoDate;
}

interface Ymd {
  y: number;
  m: number; // 1–12
  d: number;
}

function parse(date: IsoDate): Ymd {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) throw new Error(`Invalid ISO date: ${date}`);
  return { y, m, d };
}

function format({ y, m, d }: Ymd): IsoDate {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Month arithmetic that keeps the day, clamped to the month's length. */
function addMonths({ y, m }: Ymd, months: number, day: number): Ymd {
  const index = y * 12 + (m - 1) + months;
  const ny = Math.floor(index / 12);
  const nm = (index % 12) + 1;
  return { y: ny, m: nm, d: Math.min(day, daysInMonth(ny, nm)) };
}

function nextDay(date: Ymd): Ymd {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + 1));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function calendarMonth(date: Ymd): Period {
  return {
    start: format({ y: date.y, m: date.m, d: 1 }),
    end: format({ y: date.y, m: date.m, d: daysInMonth(date.y, date.m) }),
  };
}

function statementCycle(date: Ymd, statementDay: number): Period {
  const thisStatement = addMonths(date, 0, statementDay);
  const end = date.d <= thisStatement.d ? thisStatement : addMonths(date, 1, statementDay);
  const previous = addMonths(end, -1, statementDay);
  return { start: format(nextDay(previous)), end: format(end) };
}

/** The period that contains `date`, or null for per-transaction caps. */
export function periodFor(period: CapPeriod, date: IsoDate, statementDay?: number): Period | null {
  const ymd = parse(date);
  switch (period) {
    case 'transaction':
      return null;
    case 'calendar_month':
      return calendarMonth(ymd);
    case 'statement_cycle':
      return statementDay ? statementCycle(ymd, statementDay) : calendarMonth(ymd);
    case 'calendar_quarter': {
      const startMonth = Math.floor((ymd.m - 1) / 3) * 3 + 1;
      const endMonth = startMonth + 2;
      return {
        start: format({ y: ymd.y, m: startMonth, d: 1 }),
        end: format({ y: ymd.y, m: endMonth, d: daysInMonth(ymd.y, endMonth) }),
      };
    }
    case 'calendar_year':
      return { start: `${ymd.y}-01-01`, end: `${ymd.y}-12-31` };
  }
}

export function isWithin(date: IsoDate, period: Period): boolean {
  return date >= period.start && date <= period.end;
}

/** Completed months between issue date and `date`. */
export function cardAgeMonths(issuedOn: IsoDate, date: IsoDate): number {
  const from = parse(issuedOn);
  const to = parse(date);
  const months = (to.y - from.y) * 12 + (to.m - from.m);
  return to.d >= from.d ? months : months - 1;
}
