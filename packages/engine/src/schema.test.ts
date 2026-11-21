import { describe, expect, test } from 'vitest';
import { cardProductSchema, capSchema, currencySchema } from './schema';
import { makeCard } from './test-fixtures';

describe('card schema', () => {
  test('rejects a rule that points at a cap that does not exist', () => {
    expect(() =>
      makeCard({
        id: 'bad',
        rules: [
          {
            id: 'r',
            label: 'r',
            match: {},
            earn: { type: 'percent', bps: 100 },
            capIds: ['missing'],
          },
        ],
      }),
    ).toThrow(/unknown cap/);
  });

  test('rejects duplicate rule ids', () => {
    expect(() =>
      makeCard({
        id: 'dupe',
        rules: [{ id: 'base', label: 'x', match: {}, earn: { type: 'percent', bps: 1 } }],
      }),
    ).toThrow(/Duplicate rule ids/);
  });

  test('a cap needs exactly one of maxUnits or byCardAge', () => {
    expect(capSchema.safeParse({ id: 'c', label: 'c', period: 'calendar_month' }).success).toBe(
      false,
    );
    expect(
      capSchema.safeParse({
        id: 'c',
        label: 'c',
        period: 'calendar_month',
        maxUnits: 1,
        byCardAge: [{ maxUnits: 1 }],
      }).success,
    ).toBe(false);
  });

  test('the default redemption must exist', () => {
    const result = currencySchema.safeParse({
      kind: 'points',
      unitLabel: 'pts',
      redemptions: [{ id: 'a', label: 'A', paisePerUnit: 25 }],
      defaultRedemptionId: 'b',
    });
    expect(result.success).toBe(false);
  });

  test('rejects unknown fields so typos in data files fail loudly', () => {
    const card = makeCard({ id: 'ok' });
    expect(cardProductSchema.safeParse({ ...card, rewardz: [] }).success).toBe(false);
  });

  test('requires at least one source', () => {
    expect(() => makeCard({ id: 'nosrc', sources: [] })).toThrow();
  });
});

describe('sources', () => {
  test('only https links are allowed', () => {
    expect(() =>
      makeCard({ id: 'js', sources: [{ url: 'javascript:alert(1)', checkedOn: '2026-11-21' }] }),
    ).toThrow();
    expect(() =>
      makeCard({ id: 'http', sources: [{ url: 'http://bank.example', checkedOn: '2026-11-21' }] }),
    ).toThrow();
  });
});
