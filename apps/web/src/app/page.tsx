import type { Metadata } from 'next';
import { Suspense } from 'react';
import { JsonLd } from '@/components/app/json-ld';
import { PageHeader } from '@/components/app/page-header';
import { StorageNotice } from '@/components/app/storage-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Picker } from '@/features/picker/picker';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo';

export const metadata: Metadata = { alternates: { canonical: '/' } };

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'en-IN',
    },
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (installable web app)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={STRUCTURED_DATA} />
      <PageHeader
        title="Which card?"
        description="Tell us where you're paying. We'll rank your cards by what they earn."
      />
      <div className="space-y-5">
        <StorageNotice />
        <Suspense fallback={<Skeleton className="h-11 w-full rounded-xl" />}>
          <Picker />
        </Suspense>
      </div>
    </>
  );
}
