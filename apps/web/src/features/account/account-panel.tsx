'use client';

import { PRIVACY_NOTICE_VERSION } from '@cardwise/contracts';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountUser } from '@/lib/auth-client';
import { AccountCard, ConsentCard } from './account-card';
import { takeConsentIntent } from './consent-intent';
import { SignInCard } from './sign-in-card';
import { useServerStatus, type ServerStatus } from './use-server-status';

async function postConsent(): Promise<boolean> {
  const res = await fetch('/api/account/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version: PRIVACY_NOTICE_VERSION }),
  });
  return res.ok;
}

function AccountSection({ status }: { status: ServerStatus }) {
  const { user, isPending, refetch } = useAccountUser();
  const recorded = useRef(false);

  // The box was ticked before signing in, so record the consent now that we know who it is.
  useEffect(() => {
    if (!user || user.consentVersion === PRIVACY_NOTICE_VERSION || recorded.current) return;
    if (!takeConsentIntent()) return;
    recorded.current = true;
    void postConsent().then((ok) => ok && refetch());
  }, [user, refetch]);

  if (isPending) return <Skeleton className="h-28 w-full rounded-xl" />;
  if (!user) return <SignInCard status={status} />;
  if (user.consentVersion !== PRIVACY_NOTICE_VERSION) return <ConsentCard onAgreed={refetch} />;
  return <AccountCard user={user} />;
}

export function AccountPanel() {
  const status = useServerStatus();
  return status.data?.accounts ? <AccountSection status={status.data} /> : null;
}
