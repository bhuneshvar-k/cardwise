import { cardProductSchema, type CardProduct } from '@cardwise/engine';

const HDFC = 'https://hdfc.bank.in/credit-cards/indianoil-hdfc-bank-credit-card';
const FIVE_PERCENT = {
  type: 'per_spend',
  units: 5,
  perPaise: 10_000,
  mode: 'proportional',
} as const;

export const hdfcIndianOil: CardProduct = cardProductSchema.parse({
  id: 'hdfc-indianoil',
  cardAdvisorKey: 'hdfc-indianoil',
  name: 'IndianOil HDFC Bank Credit Card',
  issuer: 'HDFC Bank',
  network: 'rupay',
  kind: 'credit',
  currency: {
    kind: 'points',
    unitLabel: 'Fuel Points',
    redemptions: [
      { id: 'indianoil-fuel', label: 'Free fuel at IndianOil (XTRAREWARDS)', paisePerUnit: 96 },
      { id: 'cashback', label: 'Cashback or catalogue', paisePerUnit: 20 },
    ],
    defaultRedemptionId: 'indianoil-fuel',
  },
  baseRule: {
    id: 'base',
    label: '1 Fuel Point per ₹150',
    match: {},
    earn: { type: 'per_spend', units: 1, perPaise: 15_000, mode: 'blocks' },
  },
  rules: [
    {
      id: 'indianoil',
      label: '5% as Fuel Points at IndianOil',
      match: { merchants: ['indianoil'] },
      earn: FIVE_PERCENT,
      capIds: ['fuel'],
    },
    {
      id: 'grocery',
      label: '5% as Fuel Points on groceries',
      match: { categories: ['grocery'] },
      earn: FIVE_PERCENT,
      capIds: ['grocery'],
    },
    {
      id: 'bills',
      label: '5% as Fuel Points on bill payments',
      match: { categories: ['utilities'] },
      earn: FIVE_PERCENT,
      capIds: ['bills'],
    },
  ],
  caps: [
    {
      id: 'fuel',
      label: 'IndianOil Fuel Points',
      period: 'calendar_month',
      byCardAge: [{ untilMonth: 6, maxUnits: 250 }, { maxUnits: 150 }],
    },
    { id: 'grocery', label: 'Grocery Fuel Points', period: 'calendar_month', maxUnits: 100 },
    { id: 'bills', label: 'Bill payment Fuel Points', period: 'calendar_month', maxUnits: 100 },
  ],
  exclusions: [
    {
      id: 'other-fuel',
      label: 'Fuel outside IndianOil',
      match: { categories: ['fuel'], notMerchants: ['indianoil'] },
    },
  ],
  surchargeWaivers: [
    { match: { categories: ['fuel'] }, bps: 100, minAmountPaise: 40_000, cycleCapPaise: 25_000 },
  ],
  origin: 'curated',
  sources: [
    {
      url: HDFC,
      checkedOn: '2026-11-21',
      note: '5% at IndianOil (250 FP/month for 6 months, then 150); 5% grocery & bills (100 FP each); 1 FP/₹150; 1% surcharge waiver min ₹400, max ₹250/cycle',
    },
    {
      url: 'https://cardadvisor.in/articles/indianoil-hdfc-bank-credit-card-review-2026',
      checkedOn: '2026-11-21',
      note: '96 paise per point via IndianOil fuel redemption',
    },
  ],
  notes: [
    'What spend above a cap earns is not stated; the app assumes nothing.',
    'Exclusion of fuel outside IndianOil follows usual HDFC terms; confirm in the MITC.',
  ],
});
