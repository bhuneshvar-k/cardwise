import { describe, expect, test } from 'vitest';
import { evaluate, rankCards, REFERENCE_AMOUNT_PAISE, resolveCapMax } from './evaluate';
import { WAIVER_USAGE_KEY } from './usage';
import { makeCard, makeUserCard, POINTS_CURRENCY, purchase } from './test-fixtures';

describe('evaluate: earning', () => {
  test('applies the base percent when no rule matches', () => {
    // Arrange
    const card = makeCard({ id: 'plain' });
    // Act
    const result = evaluate(card, makeUserCard(card), purchase({ amountPaise: 123_456 }), {});
    // Assert
    expect(result.ruleId).toBe('base');
    expect(result.rewardUnits).toBe(1234);
    expect(result.totalValuePaise).toBe(1234);
    expect(result.effectiveBps).toBe(100);
  });

  test('picks a category rule over the base rule', () => {
    const card = makeCard({
      id: 'dining',
      rules: [
        {
          id: 'dine',
          label: '10% dining',
          match: { categories: ['dining'] },
          earn: { type: 'percent', bps: 1000 },
        },
      ],
    });
    const result = evaluate(card, makeUserCard(card), purchase({ category: 'dining' }), {});
    expect(result.ruleId).toBe('dine');
    expect(result.totalValuePaise).toBe(10_000);
  });

  test('floors whole blocks for "points per ₹150" rules', () => {
    const card = makeCard({
      id: 'blocks',
      currency: POINTS_CURRENCY,
      baseRule: {
        id: 'base',
        label: '1 pt / ₹150',
        match: {},
        earn: { type: 'per_spend', units: 1, perPaise: 15_000, mode: 'blocks' },
      },
    });
    const result = evaluate(card, makeUserCard(card), purchase({ amountPaise: 44_900 }), {});
    expect(result.rewardUnits).toBe(2);
    expect(result.rewardValuePaise).toBe(192);
  });

  test('earns proportionally for "5% as points" rules', () => {
    const card = makeCard({
      id: 'prop',
      currency: POINTS_CURRENCY,
      baseRule: {
        id: 'base',
        label: '5%',
        match: {},
        earn: { type: 'per_spend', units: 5, perPaise: 10_000, mode: 'proportional' },
      },
    });
    const result = evaluate(card, makeUserCard(card), purchase({ amountPaise: 15_000 }), {});
    expect(result.rewardUnits).toBe(7);
  });

  test('uses the chosen redemption and then the user override for point value', () => {
    const card = makeCard({
      id: 'redeem',
      currency: POINTS_CURRENCY,
      baseRule: {
        id: 'base',
        label: '1 pt / ₹100',
        match: {},
        earn: { type: 'per_spend', units: 1, perPaise: 10_000, mode: 'blocks' },
      },
    });
    const p = purchase({ amountPaise: 100_000 });
    expect(evaluate(card, makeUserCard(card), p, {}).rewardValuePaise).toBe(960);
    expect(
      evaluate(card, makeUserCard(card, { redemptionId: 'cash' }), p, {}).rewardValuePaise,
    ).toBe(200);
    expect(
      evaluate(card, makeUserCard(card, { paisePerUnitOverride: 50 }), p, {}).rewardValuePaise,
    ).toBe(500);
  });

  test('falls back to the default redemption when the chosen one no longer exists', () => {
    const card = makeCard({ id: 'gone', currency: POINTS_CURRENCY });
    const result = evaluate(card, makeUserCard(card, { redemptionId: 'removed' }), purchase(), {});
    expect(result.warnings.join(' ')).toMatch(/redemption/i);
  });
});

describe('evaluate: conditions', () => {
  const amazonCard = makeCard({
    id: 'amazon',
    attributes: ['amazonPrime'],
    rules: [
      {
        id: 'amazon-prime',
        label: '5% Amazon (Prime)',
        match: { merchants: ['amazon'] },
        requires: { amazonPrime: true },
        earn: { type: 'percent', bps: 500 },
      },
      {
        id: 'amazon',
        label: '3% Amazon',
        match: { merchants: ['amazon'] },
        earn: { type: 'percent', bps: 300 },
      },
      {
        id: 'partner',
        label: '2% Amazon Pay partners',
        match: { merchantTags: ['amazon_pay_partner'], paymentMethods: ['amazon_pay'] },
        earn: { type: 'percent', bps: 200 },
      },
    ],
    exclusions: [
      { id: 'emi', label: 'EMI', match: { emi: true } },
      {
        id: 'gold',
        label: 'Gold on Amazon',
        match: { merchants: ['amazon'], categories: ['jewellery'] },
      },
    ],
  });

  test('gives Prime members the Prime rate', () => {
    const result = evaluate(
      amazonCard,
      makeUserCard(amazonCard, { attributes: { amazonPrime: true } }),
      purchase({ merchantId: 'amazon', category: 'online_shopping' }),
      {},
    );
    expect(result.ruleId).toBe('amazon-prime');
  });

  test('gives non-Prime members the lower rate and warns that Prime matters', () => {
    const result = evaluate(
      amazonCard,
      makeUserCard(amazonCard),
      purchase({ merchantId: 'amazon', category: 'online_shopping' }),
      {},
    );
    expect(result.ruleId).toBe('amazon');
    expect(result.effectiveBps).toBe(300);
    expect(result.warnings.join(' ')).toMatch(/Amazon Prime/);
  });

  test('partner rate needs both the tag and paying through Amazon Pay', () => {
    const base = {
      merchantId: 'swiggy',
      merchantTags: ['amazon_pay_partner'],
      category: 'food_delivery' as const,
    };
    expect(
      evaluate(
        amazonCard,
        makeUserCard(amazonCard),
        purchase({ ...base, paymentMethod: 'amazon_pay' }),
        {},
      ).ruleId,
    ).toBe('partner');
    expect(
      evaluate(
        amazonCard,
        makeUserCard(amazonCard),
        purchase({ ...base, paymentMethod: 'online' }),
        {},
      ).ruleId,
    ).toBe('base');
  });

  test('exclusions zero the reward and say why', () => {
    const result = evaluate(
      amazonCard,
      makeUserCard(amazonCard),
      purchase({ merchantId: 'amazon', emi: true }),
      {},
    );
    expect(result.excludedBy).toBe('EMI');
    expect(result.totalValuePaise).toBe(0);
    expect(result.eligible).toBe(true);
  });

  test('an exclusion needs every condition to match', () => {
    const result = evaluate(
      amazonCard,
      makeUserCard(amazonCard),
      purchase({ merchantId: 'flipkart', category: 'jewellery' }),
      {},
    );
    expect(result.excludedBy).toBeUndefined();
  });

  test('notMerchants and MCC ranges narrow a rule', () => {
    const card = makeCard({
      id: 'mcc',
      rules: [
        {
          id: 'shop',
          label: '10% shopping',
          match: { categories: ['online_shopping'], notMerchants: ['amazon'] },
          earn: { type: 'percent', bps: 1000 },
        },
        {
          id: 'apparel',
          label: '5% apparel MCC',
          match: { mccs: [[5611, 5699]] },
          earn: { type: 'percent', bps: 500 },
        },
        {
          id: 'one-mcc',
          label: '4% one MCC',
          match: { mccs: [5732] },
          earn: { type: 'percent', bps: 400 },
        },
      ],
    });
    const uc = makeUserCard(card);
    expect(
      evaluate(card, uc, purchase({ merchantId: 'amazon', category: 'online_shopping' }), {})
        .ruleId,
    ).toBe('base');
    expect(
      evaluate(card, uc, purchase({ merchantId: 'myntra', category: 'online_shopping' }), {})
        .ruleId,
    ).toBe('shop');
    expect(evaluate(card, uc, purchase({ mcc: 5651 }), {}).ruleId).toBe('apparel');
    expect(evaluate(card, uc, purchase({ mcc: 5732 }), {}).ruleId).toBe('one-mcc');
    expect(evaluate(card, uc, purchase({}), {}).ruleId).toBe('base');
  });

  test('amount bounds apply, and are skipped with a warning when the amount is unknown', () => {
    const card = makeCard({
      id: 'minamt',
      rules: [
        {
          id: 'big',
          label: '5% over ₹500',
          match: { minAmountPaise: 50_000, maxAmountPaise: 500_000 },
          earn: { type: 'percent', bps: 500 },
        },
      ],
    });
    const uc = makeUserCard(card);
    expect(evaluate(card, uc, purchase({ amountPaise: 40_000 }), {}).ruleId).toBe('base');
    expect(evaluate(card, uc, purchase({ amountPaise: 600_000 }), {}).ruleId).toBe('base');
    const unknown = evaluate(card, uc, purchase({ amountPaise: undefined }), {});
    expect(unknown.amountAssumed).toBe(true);
    expect(unknown.amountPaise).toBe(REFERENCE_AMOUNT_PAISE);
    expect(unknown.warnings.join(' ')).toMatch(/amount/i);
  });
});

describe('evaluate: caps', () => {
  const liveCard = makeCard({
    id: 'live',
    caps: [{ id: 'ten', label: '10% cap', period: 'calendar_month', maxUnits: 120_000 }],
    baseRule: { id: 'base', label: '1.5%', match: {}, earn: { type: 'percent', bps: 150 } },
    rules: [
      {
        id: 'dine',
        label: '10% dining',
        match: { categories: ['dining'] },
        earn: { type: 'percent', bps: 1000 },
        capIds: ['ten'],
      },
      {
        id: 'groc',
        label: '10% grocery',
        match: { categories: ['grocery'] },
        earn: { type: 'percent', bps: 1000 },
        capIds: ['ten'],
        afterCap: 'base',
      },
    ],
  });

  test('limits a reward to what is left on the cap', () => {
    const result = evaluate(
      liveCard,
      makeUserCard(liveCard),
      purchase({ category: 'dining', amountPaise: 500_000 }),
      { ten: 100_000 },
    );
    expect(result.rewardUnits).toBe(20_000);
    expect(result.caps[0]).toMatchObject({ remainingBefore: 20_000, remainingAfter: 0 });
    expect(result.allocations).toEqual([{ capId: 'ten', units: 20_000 }]);
  });

  test('shared cap: dining spend reduces what grocery can earn', () => {
    const result = evaluate(
      liveCard,
      makeUserCard(liveCard),
      purchase({ category: 'grocery', amountPaise: 100_000 }),
      { ten: 120_000 },
    );
    // cap used up; groceries fall back to the base 1.5%
    expect(result.rewardUnits).toBe(1500);
    expect(result.explanation.join(' ')).toMatch(/cap/i);
  });

  test('earns nothing above the cap by default', () => {
    const result = evaluate(liveCard, makeUserCard(liveCard), purchase({ category: 'dining' }), {
      ten: 120_000,
    });
    expect(result.ruleId).toBe('dine');
    expect(result.rewardUnits).toBe(0);
    expect(result.explanation.join(' ')).toMatch(/earns nothing/);
  });

  test('cap by card age: higher cap in the first months', () => {
    const card = makeCard({
      id: 'age',
      currency: POINTS_CURRENCY,
      caps: [
        {
          id: 'fuel',
          label: 'Fuel points',
          period: 'calendar_month',
          byCardAge: [{ untilMonth: 6, maxUnits: 250 }, { maxUnits: 150 }],
        },
      ],
      rules: [
        {
          id: 'fuel',
          label: '5% fuel',
          match: { categories: ['fuel'] },
          earn: { type: 'per_spend', units: 5, perPaise: 10_000, mode: 'proportional' },
          capIds: ['fuel'],
        },
      ],
    });
    const p = purchase({ category: 'fuel', amountPaise: 1_000_000, date: '2026-11-21' });
    expect(evaluate(card, makeUserCard(card, { issuedOn: '2026-09-01' }), p, {}).rewardUnits).toBe(
      250,
    );
    expect(evaluate(card, makeUserCard(card, { issuedOn: '2025-01-01' }), p, {}).rewardUnits).toBe(
      150,
    );
    const unknown = evaluate(card, makeUserCard(card), p, {});
    expect(unknown.rewardUnits).toBe(150);
    expect(unknown.warnings.join(' ')).toMatch(/issue date/i);
  });

  test('per-transaction caps ignore earlier usage', () => {
    const card = makeCard({
      id: 'txn',
      caps: [{ id: 't', label: 'Per transaction', period: 'transaction', maxUnits: 5000 }],
      rules: [
        { id: 'r', label: '10%', match: {}, earn: { type: 'percent', bps: 1000 }, capIds: ['t'] },
      ],
    });
    const result = evaluate(card, makeUserCard(card), purchase({ amountPaise: 1_000_000 }), {
      t: 999_999,
    });
    expect(result.rewardUnits).toBe(5000);
    expect(result.allocations).toEqual([]);
  });

  test('warns when a statement-cycle cap has no statement day', () => {
    const card = makeCard({
      id: 'cycle',
      caps: [{ id: 'c', label: 'Cycle cap', period: 'statement_cycle', maxUnits: 100 }],
      rules: [
        { id: 'r', label: '10%', match: {}, earn: { type: 'percent', bps: 1000 }, capIds: ['c'] },
      ],
    });
    const result = evaluate(card, makeUserCard(card, { statementDay: undefined }), purchase(), {});
    expect(result.warnings.join(' ')).toMatch(/statement day/i);
  });
});

describe('evaluate: eligibility and waivers', () => {
  test('only RuPay credit cards can earn on UPI', () => {
    const visa = makeCard({ id: 'visa' });
    const rupay = makeCard({ id: 'rupay', network: 'rupay' });
    const rupayDebit = makeCard({ id: 'rupay-debit', network: 'rupay', kind: 'debit' });
    const p = purchase({ paymentMethod: 'upi' });
    expect(evaluate(visa, makeUserCard(visa), p, {}).eligible).toBe(false);
    expect(evaluate(rupay, makeUserCard(rupay), p, {}).eligible).toBe(true);
    expect(evaluate(rupayDebit, makeUserCard(rupayDebit), p, {}).eligible).toBe(false);
  });

  test('fuel surcharge waiver applies inside the amount range and respects the cycle cap', () => {
    const card = makeCard({
      id: 'fuelwaiver',
      surchargeWaivers: [
        {
          match: { categories: ['fuel'] },
          bps: 100,
          minAmountPaise: 40_000,
          maxAmountPaise: 500_000,
          cycleCapPaise: 25_000,
        },
      ],
    });
    const uc = makeUserCard(card);
    expect(
      evaluate(card, uc, purchase({ category: 'fuel', amountPaise: 200_000 }), {}).waiverPaise,
    ).toBe(2000);
    expect(
      evaluate(card, uc, purchase({ category: 'fuel', amountPaise: 30_000 }), {}).waiverPaise,
    ).toBe(0);
    expect(
      evaluate(card, uc, purchase({ category: 'fuel', amountPaise: 200_000 }), {
        [WAIVER_USAGE_KEY]: 24_000,
      }).waiverPaise,
    ).toBe(1000);
  });

  test('excluded spends still get the waiver', () => {
    const card = makeCard({
      id: 'excl-waiver',
      exclusions: [{ id: 'fuel', label: 'Fuel', match: { categories: ['fuel'] } }],
      surchargeWaivers: [{ match: { categories: ['fuel'] }, bps: 100 }],
    });
    const result = evaluate(
      card,
      makeUserCard(card),
      purchase({ category: 'fuel', amountPaise: 100_000 }),
      {},
    );
    expect(result.rewardUnits).toBe(0);
    expect(result.totalValuePaise).toBe(1000);
  });
});

describe('rankCards', () => {
  test('orders by total value, puts ineligible cards last', () => {
    const low = makeCard({ id: 'low', network: 'rupay' });
    const high = makeCard({
      id: 'high',
      network: 'rupay',
      baseRule: { id: 'base', label: '2%', match: {}, earn: { type: 'percent', bps: 200 } },
    });
    const visa = makeCard({
      id: 'visa-only',
      baseRule: { id: 'base', label: '5%', match: {}, earn: { type: 'percent', bps: 500 } },
    });
    const ranked = rankCards(
      [
        { card: low, userCard: makeUserCard(low), usage: {} },
        { card: visa, userCard: makeUserCard(visa), usage: {} },
        { card: high, userCard: makeUserCard(high), usage: {} },
      ],
      purchase({ paymentMethod: 'upi' }),
    );
    expect(ranked.map((r) => r.cardId)).toEqual(['high', 'low', 'visa-only']);
    expect(ranked[2]!.ineligibleReason).toMatch(/UPI/);
  });

  test('breaks ties by name so the order is stable', () => {
    const a = makeCard({ id: 'a', name: 'Alpha' });
    const b = makeCard({ id: 'b', name: 'Beta' });
    const ranked = rankCards(
      [
        { card: b, userCard: makeUserCard(b), usage: {} },
        { card: a, userCard: makeUserCard(a), usage: {} },
      ],
      purchase(),
    );
    expect(ranked.map((r) => r.cardName)).toEqual(['Alpha', 'Beta']);
  });

  test('highest value first among eligible cards', () => {
    const low = makeCard({ id: 'low' });
    const high = makeCard({
      id: 'high',
      baseRule: { id: 'base', label: '2%', match: {}, earn: { type: 'percent', bps: 200 } },
    });
    const ranked = rankCards(
      [
        { card: low, userCard: makeUserCard(low), usage: {} },
        { card: high, userCard: makeUserCard(high), usage: {} },
      ],
      purchase(),
    );
    expect(ranked.map((r) => r.cardId)).toEqual(['high', 'low']);
  });
});

describe('resolveCapMax', () => {
  const cap = {
    id: 'c',
    label: 'c',
    period: 'calendar_month' as const,
    byCardAge: [{ untilMonth: 6, maxUnits: 250 }, { maxUnits: 150 }],
  };
  test('picks the limit for the card age', () => {
    expect(resolveCapMax(cap, '2026-10-01', '2026-11-21')).toEqual({
      maxUnits: 250,
      assumed: false,
    });
    expect(resolveCapMax(cap, '2025-01-01', '2026-11-21')).toEqual({
      maxUnits: 150,
      assumed: false,
    });
  });
  test('uses the lowest limit when the issue date is unknown', () => {
    expect(resolveCapMax(cap, undefined, '2026-11-21')).toEqual({ maxUnits: 150, assumed: true });
  });
  test('fixed caps are never assumed', () => {
    expect(
      resolveCapMax(
        { id: 'f', label: 'f', period: 'calendar_month', maxUnits: 9 },
        undefined,
        '2026-11-21',
      ),
    ).toEqual({ maxUnits: 9, assumed: false });
  });
});
