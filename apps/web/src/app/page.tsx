import { Suspense } from 'react';
import { PageHeader } from '@/components/app/page-header';
import { StorageNotice } from '@/components/app/storage-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Picker } from '@/features/picker/picker';

export default function HomePage() {
  return (
    <>
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
