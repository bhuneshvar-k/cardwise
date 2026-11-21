'use client';

import { SerwistProvider } from '@serwist/next/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ding-toaster';
import { SyncController } from '@/features/account/sync-controller';
import { CatalogueProvider } from '@/features/catalogue/catalogue-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { mutations: { retry: 0 }, queries: { staleTime: 60_000 } },
      }),
  );
  return (
    <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV !== 'production'}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <QueryClientProvider client={queryClient}>
          <CatalogueProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <SyncController />
          </CatalogueProvider>
          <Toaster position="top-center" />
        </QueryClientProvider>
      </ThemeProvider>
    </SerwistProvider>
  );
}
