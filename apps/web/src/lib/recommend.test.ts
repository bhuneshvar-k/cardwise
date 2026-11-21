import { describe, expect, test } from 'vitest';
import { cards, getCard } from '@cardwise/data';
import type { StoredSpend, StoredUserCard } from './db';
import { buildPurchase, recommend, recommendOtherCards, toSpendInput } from './recommend';

const T = '2026-11-21T00:00:00.000Z';
const userCard = (cardId: string, o: Partial<StoredUserCard> = {}): StoredUserCard => ({
  id: `u-${cardId}`,
  cardId,
  statementDay: 10,
  createdAt: T,
  updatedAt: T,
  deletedAt: null,
  ...o,
});
const today = '2026-11-21';

describe('buildPurchase', () => {
  test('uses the merchant category, tags and first MCC', () => {
    const p = buildPurchase(
      { merchantId: 'swiggy', paymentMethod: 'amazon_pay', amountPaise: 50_000 },
      today,
    );
    expect(p).toMatchObject({
      merchantId: 'swiggy',
      category: 'food_delivery',
      merchantTags: ['amazon_pay_partner'],
      mcc: 5814,
    });
  });

  test('a variant overrides the merchant category', () => {
    const p = buildPurchase(
      { merchantId: 'amazon', variantId: 'gift-card', paymentMethod: 'online' },
      today,
    );
    expect(p?.category).toBe('gift_cards');
  });

  test('falls back to a chosen category with no merchant', () => {
    expect(buildPurchase({ category: 'fuel', paymentMethod: 'in_store' }, today)?.category).toBe(
      'fuel',
    );
  });

  test('returns null when there is nothing to recommend for', () => {
    expect(buildPurchase({ paymentMethod: 'online' }, today)).toBeNull();
    expect(
      buildPurchase({ merchantId: 'unknown-shop', paymentMethod: 'online' }, today),
    ).toBeNull();
  });
});

describe('recommend', () => {
  const wallet = [
    userCard('icici-amazon-pay', { attributes: { amazonPrime: true } }),
    userCard('hsbc-live-plus'),
    userCard('hdfc-indianoil'),
  ];

  test('Amazon → Amazon Pay ICICI, dining → Live+, IndianOil → HDFC IndianOil', () => {
    const best = (merchantId: string, paymentMethod: 'online' | 'in_store') =>
      recommend(
        wallet,
        [],
        buildPurchase({ merchantId, paymentMethod, amountPaise: 200_000 }, today)!,
      )[0]?.cardId;
    expect(best('amazon', 'online')).toBe('icici-amazon-pay');
    expect(best('restaurant', 'in_store')).toBe('hsbc-live-plus');
    expect(best('indianoil', 'in_store')).toBe('hdfc-indianoil');
  });

  test('switches card once the Live+ cap is used up this cycle', () => {
    const capped: StoredSpend = {
      id: 's1',
      userCardId: 'u-hsbc-live-plus',
      cardId: 'hsbc-live-plus',
      category: 'grocery',
      date: '2026-11-15',
      amountPaise: 1_200_000,
      rewardUnits: 120_000,
      valuePaise: 120_000,
      allocations: [{ capId: 'live-plus-10', units: 120_000 }],
      createdAt: T,
      updatedAt: T,
      deletedAt: null,
    };
    const ranked = recommend(
      wallet,
      [capped],
      buildPurchase(
        { merchantId: 'restaurant', paymentMethod: 'in_store', amountPaise: 200_000 },
        today,
      )!,
    );
    expect(ranked[0]?.cardId).not.toBe('hsbc-live-plus');
  });

  test('skips wallet entries whose card is no longer in the catalogue', () => {
    const ranked = recommend(
      [userCard('retired-card')],
      [],
      buildPurchase({ category: 'other', paymentMethod: 'online' }, today)!,
    );
    expect(ranked).toEqual([]);
  });
});

describe('recommendOtherCards', () => {
  test('suggests better cards the user does not hold', () => {
    const p = buildPurchase(
      { merchantId: 'restaurant', paymentMethod: 'in_store', amountPaise: 200_000 },
      today,
    )!;
    const others = recommendOtherCards(cards, ['hsbc-live-plus'], p, 3);
    expect(others).toHaveLength(3);
    expect(others.map((o) => o.cardId)).not.toContain('hsbc-live-plus');
  });
});

describe('toSpendInput', () => {
  test('copies what cap tracking needs from the evaluation', () => {
    const p = buildPurchase(
      { merchantId: 'restaurant', paymentMethod: 'in_store', amountPaise: 200_000 },
      today,
    )!;
    const [top] = recommend([userCard('hsbc-live-plus')], [], p);
    const input = toSpendInput(top!, p);
    expect(input).toMatchObject({
      userCardId: 'u-hsbc-live-plus',
      amountPaise: 200_000,
      valuePaise: 20_000,
      allocations: [{ capId: 'live-plus-10', units: 20_000 }],
    });
    expect(getCard(input.cardId)).toBeDefined();
  });
});
