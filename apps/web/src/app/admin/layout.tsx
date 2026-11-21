import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminGate } from './admin-gate';

/** Admin pages read the session on every request; they may block instead of streaming a shell. */
export const instant = false;

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/cards', label: 'Cards' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5">
      <nav aria-label="Admin" className="flex flex-wrap gap-3 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}
