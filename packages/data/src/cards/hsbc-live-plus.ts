import { cardProductSchema, type CardProduct, type EarnRule } from '@cardwise/engine';

const HSBC = 'https://www.hsbc.bank.in/credit-cards/products/live-plus/';
const CAP_ID = 'live-plus-10';
const BIG_MARKETPLACES = ['amazon', 'flipkart', 'myntra'];

const tenPercent = (id: string, label: string, match: EarnRule['match']): EarnRule => ({
  id,
  label: `10% on ${label}`,
  match,
  earn: { type: 'percent', bps: 1000 },
  capIds: [CAP_ID],
});

export const hsbcLivePlus: CardProduct = cardProductSchema.parse({
  id: 'hsbc-live-plus',
  cardAdvisorKey: 'hsbc-live-plus',
  name: 'HSBC Live+ Credit Card',
  issuer: 'HSBC',
  network: 'visa',
  kind: 'credit',
  currency: {
    kind: 'cashback',
    unitLabel: '₹ cashback',
    redemptions: [{ id: 'statement', label: 'Statement credit', paisePerUnit: 1 }],
    defaultRedemptionId: 'statement',
  },
  baseRule: {
    id: 'base',
    label: '1.5% on most other spends',
    match: {},
    earn: { type: 'percent', bps: 150 },
  },
  rules: [
    tenPercent('dining', 'dining', { categories: ['dining'] }),
    tenPercent('food-delivery', 'food delivery', { categories: ['food_delivery'] }),
    tenPercent('grocery', 'groceries', { categories: ['grocery'] }),
    tenPercent('utilities', 'utility bills', { categories: ['utilities'] }),
    tenPercent('shopping', 'shopping', {
      categories: ['shopping', 'online_shopping'],
      notMerchants: BIG_MARKETPLACES,
    }),
  ],
  caps: [
    {
      id: CAP_ID,
      label: '10% cashback cap (₹1,200)',
      period: 'statement_cycle',
      maxUnits: 120_000,
    },
  ],
  exclusions: [
    { id: 'fuel', label: 'Fuel', match: { categories: ['fuel'] } },
    { id: 'rent', label: 'Rent', match: { categories: ['rent'] } },
    { id: 'wallet', label: 'Wallet loads', match: { categories: ['wallet_load'] } },
    { id: 'emi', label: 'EMI purchases', match: { emi: true } },
  ],
  origin: 'curated',
  sources: [
    {
      url: HSBC,
      checkedOn: '2026-11-21',
      note: '10% up to ₹1,200 a month on dining, food delivery, grocery, shopping, utilities; 1.5% otherwise; fuel 0%',
    },
    {
      url: 'https://www.hsbc.bank.in/credit-cards/fuel-surcharge-waiver/',
      checkedOn: '2026-11-21',
      note: 'No fuel surcharge waiver on Live+',
    },
    {
      url: 'https://cardinsider.com/blog/hsbc-live-plus-credit-card-major-revaluation/',
      checkedOn: '2026-11-21',
      note: 'Amazon/Flipkart/Myntra excluded from 10% (third party)',
    },
  ],
  notes: [
    'The bank page implies spend above the cap earns nothing extra; it does not say so outright.',
    'Rent, wallet and EMI exclusions are from older HSBC terms; the current footnotes could not be read.',
    '₹250 quarterly contactless fuel cashback (₹10,000+ quarterly spend) is not modelled.',
  ],
});
