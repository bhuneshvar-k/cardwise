import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Spends } from '@/features/spends/spends';

// Shows only this device's spends: nothing for search engines to index.
export const metadata: Metadata = { title: 'Spends', robots: { index: false, follow: true } };

export default function SpendsPage() {
  return (
    <>
      <PageHeader title="Spends" description="Logged spends keep reward caps accurate." />
      <Spends />
    </>
  );
}
