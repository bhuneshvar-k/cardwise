import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

/** Renders with the app's providers; `rerender` keeps them. */
export function renderWithProviders(ui: ReactElement): RenderResult {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(ui, { wrapper });
}
