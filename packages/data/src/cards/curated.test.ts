import { describe, expect, test } from 'vitest';
import { evaluate, type Purchase, type UserCard } from '@cardwise/engine';
import { amazonPayIcici } from './amazon-pay-icici';
import { hsbcLivePlus } from './hsbc-live-plus';
import { hdfcIndianOil } from './hdfc-indianoil';

const DATE = '2026-11-21';
const p = (o: Partial<Purchase>): Purchase => ({
  category: 'other',
  paymentMethod: 'online',
  amountPaise: 500_000,
  date: DATE,
  ...o,
});
const uc = (cardId: string, o: Partial<UserCard> = {}): UserCard => ({
  id: `u-${cardId}`,
  cardId,
  statementDay: 10,
  ...o,
});

describe('Amazon Pay ICICI', () => {
  const card = amazonPayIcici;
  test('₹5,000 on Amazon earns ₹250 for Prime members', () => {
    const r = evaluate(
      card,
      uc(card.id, { attributes: { amazonPrime: true } }),
      p({ merchantId: 'amazon', category: 'online_shopping' }),
      {},
    );
    expect(r.totalValuePaise).toBe(25_000);
  });
  test('₹5,000 on Amazon earns ₹150 without Prime', () => {
    const r = evaluate(
      card,
      uc(card.id),
      p({ merchantId: 'amazon', category: 'online_shopping' }),
      {},
    );
    expect(r.totalValuePaise).toBe(15_000);
  });
  test('Swiggy paid through Amazon Pay earns 2%', () => {
    const r = evaluate(
      card,
      uc(card.id),
      p({
        merchantId: 'swiggy',
        merchantTags: ['amazon_pay_partner'],
        category: 'food_delivery',
        paymentMethod: 'amazon_pay',
      }),
      {},
    );
    expect(r.effectiveBps).toBe(200);
  });
  test('Amazon on EMI earns nothing', () => {
    const r = evaluate(
      card,
      uc(card.id),
      p({ merchantId: 'amazon', category: 'online_shopping', emi: true }),
      {},
    );
    expect(r.totalValuePaise).toBe(0);
  });
});

describe('HSBC Live+', () => {
  const card = hsbcLivePlus;
  test('₹5,000 dining earns ₹500', () => {
    expect(evaluate(card, uc(card.id), p({ category: 'dining' }), {}).totalValuePaise).toBe(50_000);
  });
  test('the ₹1,200 cap is shared: after ₹1,000 of grocery cashback, dining earns only ₹200', () => {
    const r = evaluate(card, uc(card.id), p({ category: 'dining' }), { 'live-plus-10': 100_000 });
    expect(r.totalValuePaise).toBe(20_000);
  });
  test('Amazon shopping earns 1.5%, not 10%', () => {
    const r = evaluate(
      card,
      uc(card.id),
      p({ merchantId: 'amazon', category: 'online_shopping' }),
      {},
    );
    expect(r.effectiveBps).toBe(150);
  });
  test('fuel earns nothing', () => {
    expect(evaluate(card, uc(card.id), p({ category: 'fuel' }), {}).totalValuePaise).toBe(0);
  });
});

describe('HDFC IndianOil', () => {
  const card = hdfcIndianOil;
  const fuel = p({
    merchantId: 'indianoil',
    category: 'fuel',
    paymentMethod: 'in_store',
    amountPaise: 300_000,
  });
  test('₹3,000 at IndianOil earns 150 fuel points plus a ₹30 surcharge waiver', () => {
    const r = evaluate(card, uc(card.id, { issuedOn: '2026-10-01' }), fuel, {});
    expect(r.rewardUnits).toBe(150);
    expect(r.rewardValuePaise).toBe(150 * 96);
    expect(r.waiverPaise).toBe(3000);
  });
  test('after six months the fuel cap drops to 150 points', () => {
    const r = evaluate(
      card,
      uc(card.id, { issuedOn: '2025-01-01' }),
      { ...fuel, amountPaise: 1_000_000 },
      {},
    );
    expect(r.rewardUnits).toBe(150);
  });
  test('other fuel stations earn no points', () => {
    const r = evaluate(card, uc(card.id), { ...fuel, merchantId: 'bpcl' }, {});
    expect(r.rewardUnits).toBe(0);
  });
  test('everyday spends earn 1 point per ₹150', () => {
    expect(evaluate(card, uc(card.id), p({ amountPaise: 100_000 }), {}).rewardUnits).toBe(6);
  });
});
