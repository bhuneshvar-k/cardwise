import { merchantSchema, type Merchant, type MerchantInput } from '@cardwise/engine';

const PARTNER = 'amazon_pay_partner';

/**
 * Popular Indian merchants. MCCs are the codes most often seen for each merchant;
 * a merchant can bill under several. Amazon Pay partner tags only where a source says so.
 */
const RAW: MerchantInput[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    aliases: ['amazon.in', 'amzn'],
    category: 'online_shopping',
    mccs: [5399, 5311],
    variants: [
      { id: 'gift-card', label: 'Gift card', category: 'gift_cards' },
      { id: 'wallet-load', label: 'Amazon Pay wallet top-up', category: 'wallet_load' },
      { id: 'gold', label: 'Gold or silver coins', category: 'jewellery' },
      { id: 'bill', label: 'Bill or recharge', category: 'utilities' },
    ],
  },
  { id: 'flipkart', name: 'Flipkart', category: 'online_shopping', mccs: [5399] },
  { id: 'myntra', name: 'Myntra', category: 'online_shopping', mccs: [5651] },
  { id: 'ajio', name: 'AJIO', category: 'online_shopping', mccs: [5651] },
  { id: 'nykaa', name: 'Nykaa', category: 'online_shopping', mccs: [5977] },
  { id: 'meesho', name: 'Meesho', category: 'online_shopping', mccs: [5399] },
  { id: 'tata-cliq', name: 'Tata CLiQ', category: 'online_shopping', mccs: [5311] },
  { id: 'croma', name: 'Croma', category: 'shopping', mccs: [5732], inStore: true },
  {
    id: 'reliance-digital',
    name: 'Reliance Digital',
    category: 'shopping',
    mccs: [5732],
    inStore: true,
  },
  { id: 'decathlon', name: 'Decathlon', category: 'shopping', mccs: [5941], inStore: true },
  { id: 'lenskart', name: 'Lenskart', category: 'shopping', mccs: [8043], inStore: true },
  { id: 'swiggy', name: 'Swiggy', category: 'food_delivery', tags: [PARTNER], mccs: [5814] },
  {
    id: 'swiggy-instamart',
    name: 'Swiggy Instamart',
    aliases: ['instamart'],
    category: 'grocery',
    mccs: [5411],
  },
  { id: 'zomato', name: 'Zomato', category: 'food_delivery', mccs: [5814] },
  { id: 'blinkit', name: 'Blinkit', aliases: ['grofers'], category: 'grocery', mccs: [5411] },
  { id: 'zepto', name: 'Zepto', category: 'grocery', mccs: [5411] },
  {
    id: 'bigbasket',
    name: 'BigBasket',
    aliases: ['bb now'],
    category: 'grocery',
    tags: [PARTNER],
    mccs: [5411],
  },
  {
    id: 'dmart',
    name: 'DMart',
    aliases: ['avenue supermarts'],
    category: 'grocery',
    mccs: [5411],
    inStore: true,
    online: true,
  },
  {
    id: 'reliance-smart',
    name: 'Reliance Smart',
    aliases: ['reliance fresh', 'jiomart'],
    category: 'grocery',
    mccs: [5411],
    inStore: true,
  },
  {
    id: 'indianoil',
    name: 'IndianOil',
    aliases: ['iocl', 'indian oil', 'petrol pump'],
    category: 'fuel',
    mccs: [5541, 5542],
    inStore: true,
    online: false,
  },
  {
    id: 'bpcl',
    name: 'Bharat Petroleum',
    aliases: ['bpcl', 'bharat petrol'],
    category: 'fuel',
    mccs: [5541, 5542],
    inStore: true,
    online: false,
  },
  {
    id: 'hpcl',
    name: 'HP Petrol Pump',
    aliases: ['hpcl', 'hindustan petroleum'],
    category: 'fuel',
    mccs: [5541, 5542],
    inStore: true,
    online: false,
  },
  { id: 'shell', name: 'Shell', category: 'fuel', mccs: [5541], inStore: true, online: false },
  {
    id: 'jio',
    name: 'Jio recharge',
    aliases: ['jio', 'reliance jio'],
    category: 'utilities',
    mccs: [4814],
  },
  {
    id: 'airtel',
    name: 'Airtel',
    aliases: ['airtel recharge'],
    category: 'utilities',
    mccs: [4814],
  },
  {
    id: 'electricity',
    name: 'Electricity bill',
    aliases: ['bescom', 'tata power', 'adani electricity', 'msedcl'],
    category: 'utilities',
    mccs: [4900],
  },
  { id: 'makemytrip', name: 'MakeMyTrip', aliases: ['mmt'], category: 'travel', mccs: [4722] },
  {
    id: 'irctc',
    name: 'IRCTC',
    aliases: ['train tickets', 'indian railways'],
    category: 'travel',
    mccs: [4112],
  },
  { id: 'indigo', name: 'IndiGo', category: 'travel', mccs: [3301] },
  { id: 'uber', name: 'Uber', category: 'transport', mccs: [4121] },
  { id: 'ola', name: 'Ola', category: 'transport', mccs: [4121] },
  { id: 'rapido', name: 'Rapido', category: 'transport', mccs: [4121] },
  { id: 'fastag', name: 'FASTag recharge', aliases: ['toll'], category: 'transport', mccs: [4784] },
  {
    id: 'bookmyshow',
    name: 'BookMyShow',
    aliases: ['bms'],
    category: 'entertainment',
    mccs: [7832],
  },
  {
    id: 'pvr',
    name: 'PVR INOX',
    aliases: ['pvr', 'inox'],
    category: 'entertainment',
    mccs: [7832],
    inStore: true,
  },
  { id: 'netflix', name: 'Netflix', category: 'ott', mccs: [4899] },
  { id: 'spotify', name: 'Spotify', category: 'ott', mccs: [5815] },
  {
    id: 'hotstar',
    name: 'JioHotstar',
    aliases: ['hotstar', 'disney'],
    category: 'ott',
    mccs: [4899],
  },
  { id: 'starbucks', name: 'Starbucks', category: 'dining', mccs: [5814], inStore: true },
  {
    id: 'dominos',
    name: "Domino's",
    aliases: ['dominos'],
    category: 'dining',
    mccs: [5814],
    inStore: true,
  },
  {
    id: 'mcdonalds',
    name: "McDonald's",
    aliases: ['mcd'],
    category: 'dining',
    mccs: [5814],
    inStore: true,
  },
  {
    id: 'restaurant',
    name: 'Restaurant (dine-in)',
    aliases: ['cafe', 'bar'],
    category: 'dining',
    mccs: [5812],
    inStore: true,
    online: false,
  },
  { id: 'lic', name: 'LIC premium', aliases: ['insurance'], category: 'insurance', mccs: [6300] },
  {
    id: 'tanishq',
    name: 'Tanishq',
    aliases: ['jewellery'],
    category: 'jewellery',
    mccs: [5944],
    inStore: true,
  },
  {
    id: 'rent',
    name: 'Rent payment',
    aliases: ['cred rent', 'nobroker'],
    category: 'rent',
    mccs: [6513],
  },
  {
    id: 'income-tax',
    name: 'Income tax / government',
    aliases: ['tax', 'gst'],
    category: 'government',
    mccs: [9311],
  },
  {
    id: 'school-fees',
    name: 'School or college fees',
    aliases: ['education', 'fees'],
    category: 'education',
    mccs: [8220],
  },
];

export const merchants: readonly Merchant[] = RAW.map((m) => merchantSchema.parse(m));

const byId = new Map(merchants.map((m) => [m.id, m]));
export const getMerchant = (id: string): Merchant | undefined => byId.get(id);

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');

/** Prefix matches first, then substring matches, on name and aliases. */
export function searchMerchants(query: string, limit = 8): Merchant[] {
  const q = normalise(query);
  if (!q) return [];
  const scored = merchants
    .map((m) => {
      const names = [m.name, ...m.aliases].map(normalise);
      const score = names.some((n) => n.startsWith(q))
        ? 2
        : names.some((n) => n.includes(q))
          ? 1
          : 0;
      return { m, score };
    })
    .filter((s) => s.score > 0)
    .toSorted((a, b) => b.score - a.score || a.m.name.localeCompare(b.m.name));
  return scored.slice(0, limit).map((s) => s.m);
}
