import { describe, expect, test } from 'vitest';
import { computeCapUsage, WAIVER_USAGE_KEY } from './usage';
import { makeCard, makeUserCard } from './test-fixtures';
import type { SpendLog } from './types';

const card = makeCard({
  id: 'usage',
  caps: [
    { id: 'cycle', label: 'Cycle', period: 'statement_cycle', maxUnits: 1000 },
    { id: 'month', label: 'Month', period: 'calendar_month', maxUnits: 1000 },
    { id: 'txn', label: 'Txn', period: 'transaction', maxUnits: 10 },
  ],
});
const userCard = makeUserCard(card, { statementDay: 15 });

let nextId = 0;
function log(overrides: Partial<SpendLog>): SpendLog {
  nextId += 1;
  return {
    id: `log-${nextId}`,
    userCardId: userCard.id,
    date: '2026-11-20',
    amountPaise: 1000,
    allocations: [],
    ...overrides,
  };
}

describe('computeCapUsage', () => {
  test('sums allocations inside each cap period only', () => {
    // Arrange
    const logs = [
      log({
        date: '2026-11-16',
        allocations: [
          { capId: 'cycle', units: 100 },
          { capId: 'month', units: 100 },
        ],
      }),
      log({
        date: '2026-11-10',
        allocations: [
          { capId: 'cycle', units: 50 },
          { capId: 'month', units: 50 },
        ],
      }),
      log({ date: '2026-10-31', allocations: [{ capId: 'month', units: 7 }] }),
    ];
    // Act
    const usage = computeCapUsage(card, userCard, logs, '2026-11-21');
    // Assert
    expect(usage).toEqual({ cycle: 100, month: 150, [WAIVER_USAGE_KEY]: 0 });
  });

  test('ignores deleted logs and logs for other cards', () => {
    const logs = [
      log({ allocations: [{ capId: 'month', units: 5 }], deletedAt: '2026-11-21T00:00:00Z' }),
      log({ userCardId: 'someone-else', allocations: [{ capId: 'month', units: 5 }] }),
    ];
    expect(computeCapUsage(card, userCard, logs, '2026-11-21').month).toBe(0);
  });

  test('adds up surcharge waivers within the statement cycle', () => {
    const logs = [log({ waiverPaise: 1500 }), log({ date: '2026-11-01', waiverPaise: 900 })];
    expect(computeCapUsage(card, userCard, logs, '2026-11-21')[WAIVER_USAGE_KEY]).toBe(1500);
  });

  test('ignores allocations to caps the card no longer has', () => {
    const logs = [log({ allocations: [{ capId: 'old-cap', units: 5 }] })];
    expect(computeCapUsage(card, userCard, logs, '2026-11-21')).not.toHaveProperty('old-cap');
  });
});
