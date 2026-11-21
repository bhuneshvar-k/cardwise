import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { Spends } from '@/features/spends/spends';

export const metadata: Metadata = { title: 'Spends' };

export default function SpendsPage() {
  return (
    <>
      <PageHeader title="Spends" description="Logged spends keep reward caps accurate." />
      <Spends />
    </>
  );
}
