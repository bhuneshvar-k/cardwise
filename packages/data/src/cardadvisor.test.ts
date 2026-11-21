import { describe, expect, test } from 'vitest';
import { evaluate } from '@cardwise/engine';
import { convertCardAdvisor } from './cardadvisor';

const row = (o: Record<string, unknown>) => ({
  rewardType: 'CASHBACK',
  monthlyCapRs: null,
  pointValuePaisa: 100,
  merchants: null,
  ...o,
});
const file = (cards: unknown[]) => ({
  license: 'CC BY 4.0',
  version: 'v1',
  asOf: '2026-11-13',
  cards,
});
const card = (o: Record<string, unknown>) => ({
  cardKey: 'test-card',
  name: 'Test Card',
  issuer: 'TEST',
  network: 'VISA',
  url: 'https://cardadvisor.in/cards/test-card',
  lastVerified: '2026-11-13',
  rewards: [row({ category: 'DEFAULT', ratePct: 1 })],
  ...o,
});

describe('convertCardAdvisor', () => {
  test('converts cashback rows, caps and merchant scope', () => {
    // Arrange
    const input = file([
      card({
        rewards: [
          row({ category: 'DEFAULT', ratePct: 1 }),
          row({ category: 'DINING', ratePct: 5, monthlyCapRs: 500 }),
          row({ category: 'ONLINE_SHOPPING', ratePct: 5, merchants: 'Amazon' }),
          row({ category: 'FUEL', ratePct: 0 }),
        ],
      }),
    ]);
    // Act
    const {
      cards: [c],
    } = convertCardAdvisor(input);
    // Assert
    expect(c).toBeDefined();
    const uc = { id: 'u', cardId: c!.id };
    const p = { paymentMethod: 'online' as const, amountPaise: 2_000_000, date: '2026-11-21' };
    expect(evaluate(c!, uc, { ...p, category: 'dining' }, {}).totalValuePaise).toBe(50_000);
    expect(
      evaluate(c!, uc, { ...p, category: 'online_shopping', merchantId: 'amazon' }, {})
        .effectiveBps,
    ).toBe(500);
    expect(
      evaluate(c!, uc, { ...p, category: 'online_shopping', merchantId: 'flipkart' }, {})
        .effectiveBps,
    ).toBe(100);
    expect(evaluate(c!, uc, { ...p, category: 'fuel' }, {}).excludedBy).toBe('fuel');
  });

  test('a merchant row applies to that merchant even when we file it under another category', () => {
    const input = file([
      card({
        rewards: [
          row({ category: 'DEFAULT', ratePct: 1 }),
          row({ category: 'ONLINE_SHOPPING', ratePct: 10, merchants: 'Swiggy' }),
        ],
      }),
    ]);
    const {
      cards: [c],
    } = convertCardAdvisor(input);
    const r = evaluate(
      c!,
      { id: 'u', cardId: c!.id },
      {
        category: 'food_delivery',
        merchantId: 'swiggy',
        paymentMethod: 'online',
        amountPaise: 10_000,
        date: '2026-11-21',
      },
      {},
    );
    expect(r.effectiveBps).toBe(1000);
  });

  test('turns effective rates on points cards back into points', () => {
    const input = file([
      card({
        rewards: [
          row({
            category: 'DEFAULT',
            ratePct: 0.64,
            rewardType: 'REWARD_POINTS',
            pointValuePaisa: 96,
          }),
          row({
            category: 'FUEL',
            ratePct: 4.8,
            rewardType: 'REWARD_POINTS',
            pointValuePaisa: 96,
            monthlyCapRs: 144,
          }),
        ],
      }),
    ]);
    const {
      cards: [c],
    } = convertCardAdvisor(input);
    const r = evaluate(
      c!,
      { id: 'u', cardId: c!.id },
      { category: 'fuel', paymentMethod: 'in_store', amountPaise: 100_000, date: '2026-11-21' },
      {},
    );
    expect(r.rewardUnits).toBe(50);
    expect(c!.caps[0]?.maxUnits).toBe(150);
  });

  test('maps EMI rows to an EMI condition', () => {
    const {
      cards: [c],
    } = convertCardAdvisor(
      file([
        card({
          rewards: [row({ category: 'DEFAULT', ratePct: 1 }), row({ category: 'EMI', ratePct: 0 })],
        }),
      ]),
    );
    expect(c!.exclusions[0]?.match).toEqual({ emi: true });
  });

  test('skips rows it cannot read and says why', () => {
    const report = convertCardAdvisor(
      file([
        card({
          rewards: [
            row({ category: 'DEFAULT', ratePct: 1 }),
            row({ category: 'SPACE_TRAVEL', ratePct: 3 }),
            row({
              category: 'ONLINE_SHOPPING',
              ratePct: 10,
              merchants: 'Apparel stores — excludes Amazon',
            }),
          ],
        }),
      ]),
    );
    expect(report.cards).toHaveLength(1);
    expect(report.skippedRows.map((r) => r.reason)).toEqual([
      'unknown category',
      expect.stringContaining('unmapped'),
    ]);
  });

  test('skips cards with no base rate, an unknown network or a bad shape', () => {
    const report = convertCardAdvisor(
      file([
        card({ cardKey: 'a', rewards: [] }),
        card({ cardKey: 'b', network: 'DISCOVER' }),
        { cardKey: 'c' },
      ]),
    );
    expect(report.cards).toHaveLength(0);
    expect(report.skippedCards.map((s) => s.cardKey)).toEqual(['a', 'b', 'c']);
  });
});
