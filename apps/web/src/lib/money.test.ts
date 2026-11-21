import { describe, expect, test } from 'vitest';
import { formatBps, formatRupees, formatUnits, parseRupees } from './money';

describe('formatRupees', () => {
  test('uses Indian digit grouping and drops zero paise', () => {
    expect(formatRupees(12_345_600)).toBe('₹1,23,456');
  });
  test('keeps paise when there are any', () => {
    expect(formatRupees(12_345)).toBe('₹123.45');
  });
});

describe('parseRupees', () => {
  test('turns rupee text into paise', () => {
    expect(parseRupees('1,250.50')).toBe(125_050);
    expect(parseRupees('₹ 400')).toBe(40_000);
  });
  test('returns undefined for empty, zero, negative or nonsense input', () => {
    expect(parseRupees('')).toBeUndefined();
    expect(parseRupees('0')).toBeUndefined();
    expect(parseRupees('-5')).toBeUndefined();
    expect(parseRupees('abc')).toBeUndefined();
  });
  test('rejects absurdly large amounts', () => {
    expect(parseRupees('100000000')).toBeUndefined();
  });
});

describe('formatUnits', () => {
  test('cashback units are paise', () => {
    expect(formatUnits(114_000, 'cashback', '₹ cashback')).toBe('₹1,140');
  });
  test('points are counted', () => {
    expect(formatUnits(1500, 'points', 'Fuel Points')).toBe('1,500 Fuel Points');
  });
});

describe('formatBps', () => {
  test('shows a percentage with at most two decimals', () => {
    expect(formatBps(1000)).toBe('10%');
    expect(formatBps(64)).toBe('0.64%');
    expect(formatBps(333)).toBe('3.33%');
  });
});
