import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Offline', robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-muted-foreground text-sm">
        This page wasn&apos;t saved for offline use. The card picker still works.
      </p>
      <Button asChild>
        <Link href="/">Open the picker</Link>
      </Button>
    </div>
  );
}
