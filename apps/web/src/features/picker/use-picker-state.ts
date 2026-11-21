'use client';

import { CATEGORIES, PAYMENT_METHODS } from '@cardwise/engine';
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';
import { parseRupees } from '@/lib/money';
import type { PurchaseChoice } from '@/lib/recommend';

/** Picker state lives in the URL, so back/forward and shared links work. */
const parsers = {
  m: parseAsString,
  v: parseAsString,
  c: parseAsStringLiteral(CATEGORIES),
  a: parseAsString.withDefault(''),
  p: parseAsStringLiteral(PAYMENT_METHODS).withDefault('online'),
  emi: parseAsBoolean.withDefault(false),
};

export function usePickerState() {
  const [state, setState] = useQueryStates(parsers, { history: 'replace', clearOnDefault: true });
  const choice: PurchaseChoice = {
    merchantId: state.m ?? undefined,
    variantId: state.v ?? undefined,
    category: state.c ?? undefined,
    paymentMethod: state.p,
    amountPaise: parseRupees(state.a),
    emi: state.emi,
  };
  return { state, setState, choice };
}
