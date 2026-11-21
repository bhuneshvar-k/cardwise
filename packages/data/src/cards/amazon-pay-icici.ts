import { cardProductSchema, type CardProduct } from '@cardwise/engine';

const ICICI = 'https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card';

export const amazonPayIcici: CardProduct = cardProductSchema.parse({
  id: 'icici-amazon-pay',
  cardAdvisorKey: 'icici-amazon-pay',
  name: 'Amazon Pay ICICI Bank Credit Card',
  issuer: 'ICICI Bank',
  network: 'visa',
  kind: 'credit',
  currency: {
    kind: 'cashback',
    unitLabel: '₹ Amazon Pay balance',
    redemptions: [{ id: 'amazon-pay-balance', label: 'Amazon Pay balance', paisePerUnit: 1 }],
    defaultRedemptionId: 'amazon-pay-balance',
  },
  attributes: ['amazonPrime'],
  baseRule: {
    id: 'base',
    label: '1% on other spends',
    match: {},
    earn: { type: 'percent', bps: 100 },
  },
  rules: [
    {
      id: 'amazon-prime',
      label: '5% on Amazon (Prime)',
      match: { merchants: ['amazon'] },
      requires: { amazonPrime: true },
      earn: { type: 'percent', bps: 500 },
    },
    {
      id: 'amazon',
      label: '3% on Amazon',
      match: { merchants: ['amazon'] },
      earn: { type: 'percent', bps: 300 },
    },
    {
      id: 'amazon-pay-partners',
      label: '2% at Amazon Pay partners',
      match: { merchantTags: ['amazon_pay_partner'], paymentMethods: ['amazon_pay'] },
      earn: { type: 'percent', bps: 200 },
    },
  ],
  caps: [],
  exclusions: [
    { id: 'emi', label: 'EMI purchases', match: { emi: true } },
    { id: 'fuel', label: 'Fuel', match: { categories: ['fuel'] } },
    { id: 'rent', label: 'Rent', match: { categories: ['rent'] } },
    { id: 'education', label: 'Education', match: { categories: ['education'] } },
    { id: 'government', label: 'Tax and government', match: { categories: ['government'] } },
    { id: 'gold', label: 'Gold and jewellery', match: { categories: ['jewellery'] } },
    { id: 'wallet', label: 'Wallet loads', match: { categories: ['wallet_load'] } },
    {
      id: 'international',
      label: 'International spends',
      match: { categories: ['international'] },
    },
  ],
  surchargeWaivers: [{ match: { categories: ['fuel'] }, bps: 100 }],
  origin: 'curated',
  sources: [
    {
      url: ICICI,
      checkedOn: '2026-11-21',
      note: '5 / 3 / 2 points per ₹100 table; "Login and Pay with Amazon" for partners',
    },
    {
      url: 'https://cardexpress.in/mcc-guide/exclusions/icici-amazon-pay',
      checkedOn: '2026-11-21',
      note: 'Exclusion list (third party, community-sourced)',
    },
  ],
  notes: [
    'ICICI FAQ also says 1% at partner merchants; the 2% partner rate needs confirming in the T&C PDF.',
    'Exclusions come from third-party guides; the bank T&C PDF could not be read.',
    'Fuel surcharge waiver amount range is not published on the card page.',
  ],
});
