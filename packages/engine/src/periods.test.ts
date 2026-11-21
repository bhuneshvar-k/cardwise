import { describe, expect, test } from 'vitest';
import { cardAgeMonths, periodFor } from './periods';

describe('periodFor', () => {
  test('returns null for per-transaction caps', () => {
    expect(periodFor('transaction', '2026-11-21')).toBeNull();
  });

  test('calendar month covers the whole month', () => {
    expect(periodFor('calendar_month', '2026-02-10')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  test('calendar quarter follows Jan–Mar, Apr–Jun…', () => {
    expect(periodFor('calendar_quarter', '2026-11-21')).toEqual({
      start: '2026-10-01',
      end: '2026-12-31',
    });
  });

  test('calendar year covers the whole year', () => {
    expect(periodFor('calendar_year', '2026-06-01')).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  test('statement cycle ends on the statement day when the date is on or before it', () => {
    expect(periodFor('statement_cycle', '2026-11-15', 15)).toEqual({
      start: '2026-10-16',
      end: '2026-11-15',
    });
  });

  test('statement cycle rolls to next month after the statement day', () => {
    expect(periodFor('statement_cycle', '2026-11-16', 15)).toEqual({
      start: '2026-11-16',
      end: '2026-12-15',
    });
  });

  test('statement cycle crosses the year boundary', () => {
    expect(periodFor('statement_cycle', '2026-12-20', 5)).toEqual({
      start: '2026-12-06',
      end: '2027-01-05',
    });
  });

  test('statement cycle falls back to calendar month without a statement day', () => {
    expect(periodFor('statement_cycle', '2026-11-21')).toEqual({
      start: '2026-11-01',
      end: '2026-11-30',
    });
  });
});

describe('cardAgeMonths', () => {
  test('counts only completed months', () => {
    expect(cardAgeMonths('2026-05-21', '2026-11-20')).toBe(5);
    expect(cardAgeMonths('2026-05-21', '2026-11-21')).toBe(6);
  });

  test('is zero for a card issued this month', () => {
    expect(cardAgeMonths('2026-11-01', '2026-11-21')).toBe(0);
  });
});
