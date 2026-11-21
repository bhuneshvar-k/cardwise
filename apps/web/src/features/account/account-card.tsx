'use client';

import { PRIVACY_NOTICE_VERSION } from '@cardwise/contracts';
import { useMutation } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { toast } from '@/components/ding-toaster';
import { Button } from '@/components/ui/button';
import { authClient, type AccountUser } from '@/lib/auth-client';
import { db } from '@/lib/db';
import { forgetAccountOnDevice, syncNow } from '@/lib/sync-client';

async function signOut() {
  if (
    !window.confirm('Sign out? Your cards stay in your account but are removed from this device.')
  )
    return;
  await authClient.signOut();
  await forgetAccountOnDevice();
  toast.success('Signed out');
}

async function deleteAccount() {
  const typed = window.prompt(
    'This permanently deletes your account and everything synced to it. Type DELETE to confirm.',
  );
  if (typed !== 'DELETE') return;
  const res = await fetch('/api/account', { method: 'DELETE' });
  if (!res.ok) {
    toast.error('Could not delete the account. Please try again.');
    return;
  }
  await authClient.signOut();
  await forgetAccountOnDevice();
  toast.success('Account deleted');
}

export function ConsentCard({ onAgreed }: { onAgreed: () => void }) {
  const agree = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/account/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: PRIVACY_NOTICE_VERSION }),
      });
      if (!res.ok) throw new Error('consent failed');
    },
    onSuccess: onAgreed,
    onError: () => toast.error('Could not save. Please try again.'),
  });
  return (
    <div className="space-y-3 rounded-xl border border-amber-500/50 p-4">
      <p className="text-sm">
        Before we sync your data, please read and agree to the{' '}
        <Link href="/privacy" className="underline">
          privacy notice
        </Link>
        .
      </p>
      <div className="flex gap-2">
        <Button onClick={() => agree.mutate()} disabled={agree.isPending}>
          I agree
        </Button>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AccountCard({ user }: { user: AccountUser }) {
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  const state = useLiveQuery(() => db.syncState.get('sync'), []);
  const sync = useMutation({
    mutationFn: () => syncNow(user.id),
    onSuccess: (r) =>
      r.status === 'synced' ? toast.success('Synced') : toast.error('Could not sync right now'),
  });
  const last = state?.lastSyncedAt
    ? new Date(state.lastSyncedAt).toLocaleString('en-IN')
    : 'not yet';

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>
      <p className="text-sm" aria-live="polite">
        Last synced: {last}
        {pending > 0 && ` · ${pending} change${pending === 1 ? '' : 's'} waiting`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          Sync now
        </Button>
        <Button variant="outline" asChild>
          <a href="/api/account">Download account data</a>
        </Button>
        {user.role === 'admin' && (
          <Button variant="outline" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
        )}
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
        <Button variant="destructive" onClick={deleteAccount}>
          Delete account
        </Button>
      </div>
    </div>
  );
}
