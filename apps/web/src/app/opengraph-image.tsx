import { ogCard, OG_SIZE } from '@/components/app/og-card';

export const alt = 'Cardwise: which card should I use?';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return ogCard({
    eyebrow: 'Credit and debit card rewards in India',
    title: 'Which card earns the most for this purchase?',
  });
}
