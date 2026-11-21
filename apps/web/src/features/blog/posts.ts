/**
 * Guides for search visitors. Every rate and cap here comes from the curated card files in
 * packages/data/src/cards (which cite the bank pages); update both together.
 */

export interface PostSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface PostFaq {
  question: string;
  answer: string;
}

export interface PostSource {
  label: string;
  url: string;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  /** Curated card ids the post covers. */
  cardIds: string[];
  /** Where "Try it" sends the reader: a picker URL with a merchant or category filled in. */
  tryHref: string;
  sections: PostSection[];
  faq: PostFaq[];
  sources: PostSource[];
}

const HSBC_LIVE_PLUS = 'https://www.hsbc.bank.in/credit-cards/products/live-plus/';
const ICICI_AMAZON =
  'https://www.icici.bank.in/personal-banking/cards/credit-card/amazon-pay-credit-card';
const HDFC_INDIANOIL = 'https://hdfc.bank.in/credit-cards/indianoil-hdfc-bank-credit-card';
const CAVEAT =
  'Banks change reward terms often. Check your card’s current terms before relying on any rate here.';

export const posts: Post[] = [
  {
    slug: 'best-credit-card-for-swiggy-zomato-dining',
    title: 'Best credit card for Swiggy, Zomato and dining out in India',
    description:
      'HSBC Live+ pays 10% on food delivery, dining and groceries up to ₹1,200 a cycle. How the cap works and when another card wins.',
    published: '2026-11-21',
    updated: '2026-11-21',
    cardIds: ['hsbc-live-plus'],
    tryHref: '/?m=swiggy&a=600',
    sections: [
      {
        heading: 'The short answer',
        paragraphs: [
          'For Swiggy, Zomato and restaurant bills, the HSBC Live+ Credit Card is one of the strongest everyday picks: it pays 10% cashback on dining, food delivery and groceries, credited to your statement.',
          'The 10% is capped at ₹1,200 of cashback per statement cycle, shared across every 10% category. That is about ₹12,000 of qualifying spend a cycle. Above that, Cardwise assumes the extra spend earns nothing, because HSBC does not promise the 1.5% base rate on it.',
        ],
      },
      {
        heading: 'What earns 10% on HSBC Live+',
        paragraphs: ['These categories share the one ₹1,200 cap:'],
        bullets: [
          'Dining at restaurants',
          'Food delivery apps such as Swiggy and Zomato',
          'Groceries',
          'Utility bills',
          'Shopping, except Amazon, Flipkart and Myntra',
        ],
      },
      {
        heading: 'What earns less, or nothing',
        paragraphs: [
          'Most other spends earn 1.5%. Fuel, rent, wallet loads and EMI purchases earn nothing, and there is no fuel surcharge waiver on this card.',
        ],
      },
      {
        heading: 'When another card is the better pick',
        paragraphs: [
          'Once you have used up the cycle’s cap, a card with a flat rate beats 0%. If you also hold an Amazon Pay ICICI card, for example, its 1% on other spends is worth more than an exhausted Live+.',
          'This is exactly what Cardwise tracks: log your spends and it moves to the next best card once a cap is used up.',
        ],
      },
    ],
    faq: [
      {
        question: 'Does HSBC Live+ give 10% on Swiggy?',
        answer:
          'Yes. Food delivery is one of its 10% categories, up to ₹1,200 of cashback per statement cycle shared with dining, groceries, utilities and shopping.',
      },
      {
        question: 'Does HSBC Live+ give 10% on Amazon or Flipkart?',
        answer:
          'No. Amazon, Flipkart and Myntra are excluded from the 10% shopping rate, so they earn the 1.5% base rate.',
      },
    ],
    sources: [
      { label: 'HSBC Live+ Credit Card (HSBC India)', url: HSBC_LIVE_PLUS },
      {
        label: 'HSBC fuel surcharge waiver page',
        url: 'https://www.hsbc.bank.in/credit-cards/fuel-surcharge-waiver/',
      },
    ],
  },
  {
    slug: 'amazon-pay-icici-credit-card-rewards-guide',
    title: 'Amazon Pay ICICI credit card: 5%, 3% and 1% explained',
    description:
      'Amazon Pay ICICI pays 5% on Amazon with Prime, 3% without, 2% at Amazon Pay partners and 1% elsewhere. What is excluded and how you get paid.',
    published: '2026-11-21',
    updated: '2026-11-21',
    cardIds: ['icici-amazon-pay'],
    tryHref: '/?m=amazon&a=2000',
    sections: [
      {
        heading: 'The rates',
        paragraphs: ['Rewards land as Amazon Pay balance, so ₹1 earned is worth ₹1 on Amazon.'],
        bullets: [
          '5% on Amazon if you are a Prime member',
          '3% on Amazon without Prime',
          '2% at Amazon Pay partner merchants',
          '1% on most other spends',
        ],
      },
      {
        heading: 'Prime matters more than any other choice',
        paragraphs: [
          'The difference between 5% and 3% is two points on every Amazon order. Cardwise asks whether you have Prime and ranks the card accordingly, so the same purchase can show different rewards for different people.',
          'There is no published monthly cap on these rates, which makes this card a good default for large Amazon orders.',
        ],
      },
      {
        heading: 'What earns nothing',
        paragraphs: [
          'Third-party guides list these exclusions; ICICI’s full terms could not be checked, so treat them as likely rather than certain:',
        ],
        bullets: [
          'EMI purchases',
          'Fuel (a 1% fuel surcharge waiver applies instead)',
          'Rent, education, tax and government payments',
          'Gold and jewellery',
          'Wallet loads',
        ],
      },
      {
        heading: 'Where it loses',
        paragraphs: [
          'Off Amazon, 1% is a low rate. For food delivery a 10% category card such as HSBC Live+ wins until its cap runs out, and for fuel a co-branded fuel card earns far more.',
        ],
      },
    ],
    faq: [
      {
        question: 'Do I need Amazon Prime for 5% back?',
        answer: 'Yes. Without Prime the card pays 3% on Amazon.',
      },
      {
        question: 'Does the Amazon Pay ICICI card earn on fuel?',
        answer: 'Fuel spends are excluded from rewards, but the card waives the 1% fuel surcharge.',
      },
    ],
    sources: [{ label: 'Amazon Pay ICICI Bank Credit Card (ICICI Bank)', url: ICICI_AMAZON }],
  },
  {
    slug: 'indianoil-hdfc-credit-card-fuel-points',
    title: 'IndianOil HDFC credit card: fuel points, caps and real value',
    description:
      'IndianOil HDFC earns 5% as Fuel Points at IndianOil, on groceries and on bills, with monthly caps that drop after six months. What a point is worth.',
    published: '2026-11-21',
    updated: '2026-11-21',
    cardIds: ['hdfc-indianoil'],
    tryHref: '/?m=indianoil&a=2000',
    sections: [
      {
        heading: 'How the card earns',
        paragraphs: ['Rewards are Fuel Points, not cash:'],
        bullets: [
          '5% as Fuel Points at IndianOil outlets',
          '5% as Fuel Points on groceries (up to 100 points a month)',
          '5% as Fuel Points on bill payments (up to 100 points a month)',
          '1 Fuel Point per ₹150 on other spends',
        ],
      },
      {
        heading: 'The IndianOil cap depends on card age',
        paragraphs: [
          'Fuel Points earned at IndianOil are capped at 250 a month for the first six months after you get the card, then 150 a month. Cardwise asks when you got the card so it knows which cap applies.',
        ],
      },
      {
        heading: 'What a Fuel Point is worth',
        paragraphs: [
          'Redeemed for free fuel at IndianOil, a point is worth about 96 paise. Taken as cashback or from the catalogue it is worth about 20 paise, so redeem for fuel if you can.',
        ],
      },
      {
        heading: 'Fuel surcharge waiver',
        paragraphs: [
          'The card waives the 1% fuel surcharge on fuel bills of ₹400 or more, up to ₹250 a statement cycle. Fuel bought outside IndianOil earns no points.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is the IndianOil HDFC card worth it for fuel?',
        answer:
          'If you fill up at IndianOil and redeem points for fuel, yes: 5% back at about 96 paise a point, within a monthly cap of 250 points (150 after six months).',
      },
      {
        question: 'Can I use the IndianOil HDFC card on UPI?',
        answer:
          'Cardwise lists it on the RuPay network, and RuPay credit cards can be linked to UPI apps. Check which network your own card was issued on.',
      },
    ],
    sources: [
      { label: 'IndianOil HDFC Bank Credit Card (HDFC Bank)', url: HDFC_INDIANOIL },
      {
        label: 'IndianOil HDFC review (CardAdvisor)',
        url: 'https://cardadvisor.in/articles/indianoil-hdfc-bank-credit-card-review-2026',
      },
    ],
  },
  {
    slug: 'credit-card-reward-caps-explained',
    title: 'Credit card reward caps: why your 10% is not always 10%',
    description:
      'Most high reward rates in India come with a cap per statement cycle or month. How caps work, how they are shared, and how to plan around them.',
    published: '2026-11-21',
    updated: '2026-11-21',
    cardIds: ['hsbc-live-plus', 'hdfc-indianoil'],
    tryHref: '/',
    sections: [
      {
        heading: 'A headline rate has a ceiling',
        paragraphs: [
          'A card that advertises 10% almost always limits how much you can earn at that rate. HSBC Live+ pays 10% on dining, food delivery and groceries, but only up to ₹1,200 of cashback a statement cycle.',
        ],
      },
      {
        heading: 'Caps reset on different clocks',
        paragraphs: ['Check which period your card uses, because it decides when the cap refills:'],
        bullets: [
          'Statement cycle: from one bill date to the next (HSBC Live+)',
          'Calendar month: the 1st to the end of the month (IndianOil HDFC Fuel Points)',
          'Quarter or year, on some premium cards',
        ],
      },
      {
        heading: 'Caps are often shared',
        paragraphs: [
          'One cap can cover several categories. On HSBC Live+ the ₹1,200 covers dining, food delivery, groceries, utilities and shopping together, so a big grocery month leaves less room for Swiggy.',
        ],
      },
      {
        heading: 'Some caps change with card age',
        paragraphs: [
          'IndianOil HDFC allows 250 Fuel Points a month at IndianOil for the first six months, then 150. A welcome period like this makes the card look better in its first months than it will later.',
        ],
      },
      {
        heading: 'What happens above the cap',
        paragraphs: [
          'Banks rarely say clearly whether spend above a cap earns the base rate or nothing. Cardwise assumes nothing unless the terms say otherwise, so its estimates are on the cautious side.',
          'Logging your spends in Cardwise lets it track how much of each cap you have used and switch to the next best card when one runs out.',
        ],
      },
    ],
    faq: [
      {
        question: 'Does spend above a cashback cap earn anything?',
        answer:
          'It depends on the card. Many terms are silent; Cardwise assumes it earns nothing unless the bank says the base rate applies.',
      },
    ],
    sources: [
      { label: 'HSBC Live+ Credit Card (HSBC India)', url: HSBC_LIVE_PLUS },
      { label: 'IndianOil HDFC Bank Credit Card (HDFC Bank)', url: HDFC_INDIANOIL },
    ],
  },
  {
    slug: 'credit-card-on-upi-rupay-guide',
    title: 'Paying by UPI with a credit card: why only RuPay works',
    description:
      'In India only RuPay credit cards can be linked to UPI apps. Which cards qualify, what earns rewards on UPI, and how Cardwise ranks UPI payments.',
    published: '2026-11-21',
    updated: '2026-11-21',
    cardIds: ['hdfc-indianoil'],
    tryHref: '/',
    sections: [
      {
        heading: 'Only RuPay credit cards link to UPI',
        paragraphs: [
          'UPI apps such as Google Pay, PhonePe and Paytm let you link a credit card, but only one issued on the RuPay network. A Visa or Mastercard credit card cannot be used for a UPI payment.',
          'When you choose UPI as the payment method, Cardwise ranks only your RuPay credit cards, so it never suggests a card that cannot pay.',
        ],
      },
      {
        heading: 'Rewards on UPI follow the card’s own rules',
        paragraphs: [
          'A UPI payment with a RuPay credit card earns whatever the card pays for that merchant, subject to its exclusions and caps. Some cards treat UPI spends differently, so check the terms.',
        ],
      },
      {
        heading: 'Getting a RuPay version',
        paragraphs: [
          'Many banks issue popular cards on RuPay as well as Visa or Mastercard. In Cardwise’s catalogue, for example, the IndianOil HDFC card is listed on RuPay. If UPI matters to you, ask your bank which network your card is on.',
        ],
      },
    ],
    faq: [
      {
        question: 'Can I pay with a Visa credit card on UPI?',
        answer: 'No. Only RuPay credit cards can be linked to UPI apps in India.',
      },
      {
        question: 'Do RuPay credit cards earn rewards on UPI payments?',
        answer:
          'Usually, at the card’s normal rate for that merchant, but some issuers limit UPI rewards. Check your card’s terms.',
      },
    ],
    sources: [{ label: 'NPCI, which runs UPI and RuPay', url: 'https://www.npci.org.in/' }],
  },
];

export const POST_CAVEAT = CAVEAT;

export function listPosts(): Post[] {
  return [...posts].sort((a, b) => b.published.localeCompare(a.published));
}

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
