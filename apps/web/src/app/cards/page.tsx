import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Wallet } from '@/features/wallet/wallet';

export const metadata: Metadata = { title: 'My cards' };

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
