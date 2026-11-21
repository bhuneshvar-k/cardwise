import { describe, expect, test } from 'vitest';
import { localToday } from './today';

describe('localToday', () => {
  test('formats the local date with zero padding', () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
