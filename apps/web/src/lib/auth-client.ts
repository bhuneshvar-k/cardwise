'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

export interface AccountUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  consentVersion: string | null;
}

/** The signed-in user with Cardwise's extra fields, or null. */
export function useAccountUser(): {
  user: AccountUser | null;
  isPending: boolean;
  refetch: () => void;
} {
  const { data, isPending, refetch } = authClient.useSession();
  const raw = data?.user as
    (Record<string, unknown> & { id: string; name: string; email: string }) | undefined;
  const user = raw
    ? {
        id: raw.id,
        name: raw.name,
        email: raw.email,
        role: raw.role === 'admin' ? ('admin' as const) : ('user' as const),
        consentVersion: typeof raw.consentVersion === 'string' ? raw.consentVersion : null,
      }
    : null;
  return { user, isPending, refetch: () => void refetch() };
}
