'use client';

import { CreditCard, Info, Receipt, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Pick', icon: Sparkles },
  { href: '/cards', label: 'My cards', icon: CreditCard },
  { href: '/spends', label: 'Spends', icon: Receipt },
  { href: '/about', label: 'About', icon: Info },
] as const;

function Nav({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="bg-background/95 supports-backdrop-filter:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname !== null && (href === '/' ? pathname === '/' : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ActiveNav() {
  return <Nav pathname={usePathname()} />;
}

/** The highlighted tab needs the URL, which dynamic routes only know at request time. */
export function BottomNav() {
  return (
    <Suspense fallback={<Nav pathname={null} />}>
      <ActiveNav />
    </Suspense>
  );
}
