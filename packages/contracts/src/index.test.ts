import { describe, expect, test } from 'vitest';
import { MAX_SYNC_CHANGES, reportRequestSchema, syncRequestSchema } from './index';

const T = '2026-11-21T00:00:00.000Z';
const card = (id: string) => ({ id, cardId: 'c', createdAt: T, updatedAt: T, deletedAt: null });

describe('syncRequestSchema', () => {
  test('fills in empty collections', () => {
    expect(syncRequestSchema.parse({ cursor: 0, changes: {} }).changes).toEqual({
      userCards: [],
      spends: [],
      settings: [],
    });
  });

  test(`refuses more than ${MAX_SYNC_CHANGES} changes in one request`, () => {
    const userCards = Array.from({ length: MAX_SYNC_CHANGES + 1 }, (_, i) => card(`c${i}`));
    expect(syncRequestSchema.safeParse({ cursor: 0, changes: { userCards } }).success).toBe(false);
  });

  test('refuses a negative cursor and records without timestamps', () => {
    expect(syncRequestSchema.safeParse({ cursor: -1, changes: {} }).success).toBe(false);
    expect(
      syncRequestSchema.safeParse({ cursor: 0, changes: { userCards: [{ id: 'x', cardId: 'c' }] } })
        .success,
    ).toBe(false);
  });
});

describe('reportRequestSchema', () => {
  test('needs a real message and trims it', () => {
    expect(reportRequestSchema.safeParse({ cardId: 'c', message: '  hi ' }).success).toBe(false);
    expect(reportRequestSchema.parse({ cardId: 'c', message: '  Cap is wrong  ' }).message).toBe(
      'Cap is wrong',
    );
  });
});
