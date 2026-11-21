import { describe, expect, test } from 'vitest';
import {
  buildCatalogue,
  cards,
  curatedCards,
  getCard,
  getMerchant,
  isVerified,
  merchants,
  searchMerchants,
} from './index';

describe('catalogue', () => {
  test('curated cards replace their CardAdvisor import', () => {
    const keys = cards.map((c) => c.cardAdvisorKey);
    expect(keys.filter((k) => k === 'hsbc-live-plus')).toHaveLength(1);
    expect(getCard('hsbc-live-plus')?.origin).toBe('curated');
    expect(getCard('ca-hsbc-live-plus')).toBeUndefined();
  });

  test('includes the imported cards', () => {
    expect(cards.length).toBeGreaterThan(200);
  });

  test('buildCatalogue keeps imported cards without a curated version', () => {
    const imported = { ...curatedCards[0]!, id: 'ca-x', cardAdvisorKey: 'x', name: 'Zed' };
    expect(buildCatalogue(curatedCards, [imported]).map((c) => c.id)).toContain('ca-x');
  });

  test('every merchant referenced by a curated rule exists', () => {
    const referenced = curatedCards.flatMap((c) =>
      [...c.rules, ...c.exclusions].flatMap((r) => [
        ...(r.match.merchants ?? []),
        ...(r.match.notMerchants ?? []),
      ]),
    );
    for (const id of referenced) expect(getMerchant(id), id).toBeDefined();
  });

  test('merchant ids are unique', () => {
    expect(new Set(merchants.map((m) => m.id)).size).toBe(merchants.length);
  });

  test('isVerified needs a review in the last 90 days', () => {
    const card = curatedCards[0]!;
    expect(isVerified(card, '2026-11-21')).toBe(false);
    const reviewed = { ...card, review: { reviewedOn: '2026-10-01', reviewedBy: 'admin' } };
    expect(isVerified(reviewed, '2026-11-21')).toBe(true);
    expect(isVerified(reviewed, '2027-03-01')).toBe(false);
  });
});

describe('searchMerchants', () => {
  test('finds by alias and ranks prefix matches first', () => {
    expect(searchMerchants('iocl')[0]?.id).toBe('indianoil');
    expect(searchMerchants('swi').map((m) => m.id)).toEqual(['swiggy', 'swiggy-instamart']);
  });

  test('ignores case, spaces and punctuation', () => {
    expect(searchMerchants('  Domino’s ')[0]?.id).toBe('dominos');
  });

  test('returns nothing for an empty query', () => {
    expect(searchMerchants('   ')).toEqual([]);
  });
});
