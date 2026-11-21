import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionUser } from '@/server/session';

/** Admin pages 404 for everyone else, so their existence is not revealed. */
export async function AdminGate({ children }: { children: ReactNode }) {
  const user = await getSessionUser().catch(() => null);
  if (user?.role !== 'admin') notFound();
  return children;
}
