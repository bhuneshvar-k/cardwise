import type { Category, PaymentMethod } from '@cardwise/engine';

export const CATEGORY_LABELS: Record<Category, string> = {
  dining: 'Dining out',
  food_delivery: 'Food delivery',
  grocery: 'Groceries',
  fuel: 'Fuel',
  online_shopping: 'Online shopping',
  shopping: 'Shopping in store',
  utilities: 'Bills and recharges',
  travel: 'Travel',
  transport: 'Cabs, tolls and transit',
  entertainment: 'Movies and events',
  ott: 'Streaming subscriptions',
  rent: 'Rent',
  insurance: 'Insurance',
  education: 'Education fees',
  government: 'Tax and government',
  wallet_load: 'Wallet top-up',
  gift_cards: 'Gift cards',
  jewellery: 'Gold and jewellery',
  international: 'International',
  other: 'Something else',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  in_store: 'Tap or swipe',
  online: 'Card online',
  upi: 'UPI',
  amazon_pay: 'Amazon Pay',
};

/** Shown as quick picks before the user types anything. */
export const POPULAR_MERCHANTS = [
  'amazon',
  'swiggy',
  'zomato',
  'indianoil',
  'flipkart',
  'blinkit',
  'bigbasket',
  'electricity',
];
