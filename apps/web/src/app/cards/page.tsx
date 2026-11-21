import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Wallet } from '@/features/wallet/wallet';

// Shows only this device's cards: nothing for search engines to index.
export const metadata: Metadata = { title: 'My cards', robots: { index: false, follow: true } };

export default function CardsPage() {
  return (
    <>
      <PageHeader
        title="My cards"
        description="Saved on this device, and synced if you sign in. No card numbers, ever."
      />
      <Wallet />
    </>
  );
}
