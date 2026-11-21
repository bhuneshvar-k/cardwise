import { describe, expect, test } from 'vitest';
import {
  STACK_THRESHOLD,
  cardFaceTitle,
  issuerKey,
  paletteFor,
  sortByDisplayName,
  walletLayout,
} from './card-art';

describe('issuerKey', () => {
  test('matches curated and imported spellings of the same bank', () => {
    expect(issuerKey('ICICI Bank')).toBe('ICICI');
    expect(issuerKey('ICICI')).toBe('ICICI');
    expect(issuerKey('HDFC Bank')).toBe('HDFC');
    expect(issuerKey('hsbc')).toBe('HSBC');
  });
});

describe('paletteFor', () => {
  test('uses the issuer colours for a known bank', () => {
    expect(paletteFor('HDFC Bank')).toEqual(paletteFor('HDFC'));
    expect(paletteFor('HDFC').from).not.toBe(paletteFor('SBI').from);
  });

  test('falls back to a neutral palette for an unknown bank', () => {
    expect(paletteFor('Some New Bank')).toEqual(paletteFor('Another Unknown'));
  });
});

describe('cardFaceTitle', () => {
  test('prefers the nickname', () => {
    expect(cardFaceTitle('Work card', 'HSBC Live+ Credit Card')).toBe('Work card');
  });

  test('drops the trailing "Credit Card" from the product name', () => {
    expect(cardFaceTitle(undefined, 'Amazon Pay ICICI Bank Credit Card')).toBe(
      'Amazon Pay ICICI Bank',
    );
    expect(cardFaceTitle(undefined, 'HDFC Millennia Debit Card')).toBe('HDFC Millennia');
    expect(cardFaceTitle(undefined, 'American Express Gold Card')).toBe('American Express Gold');
  });

  test('says so when the card is no longer listed', () => {
    expect(cardFaceTitle(undefined, undefined)).toBe('Card no longer listed');
  });
});

describe('sortByDisplayName', () => {
  test('sorts alphabetically, ignoring case, without changing the input', () => {
    const input = [{ title: 'zeta' }, { title: 'Alpha' }, { title: 'beta' }];
    const sorted = sortByDisplayName(input, (x) => x.title);
    expect(sorted.map((x) => x.title)).toEqual(['Alpha', 'beta', 'zeta']);
    expect(input[0]?.title).toBe('zeta');
  });
});

describe('walletLayout', () => {
  test('shows a grid until the stack threshold', () => {
    expect(walletLayout(0)).toBe('empty');
    expect(walletLayout(1)).toBe('grid');
    expect(walletLayout(STACK_THRESHOLD - 1)).toBe('grid');
    expect(walletLayout(STACK_THRESHOLD)).toBe('stack');
  });
});
