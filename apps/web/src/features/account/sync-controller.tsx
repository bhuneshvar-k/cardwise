'use client';

import { PRIVACY_NOTICE_VERSION } from '@cardwise/contracts';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAccountUser } from '@/lib/auth-client';
import { db } from '@/lib/db';
import { syncNow } from '@/lib/sync-client';
import { useServerStatus } from './use-server-status';

const AFTER_EDIT_DELAY_MS = 3000;
const BACKGROUND_INTERVAL_MS = 5 * 60 * 1000;

/** Keeps a signed-in device in sync: after edits, on focus, when back online and every few minutes. */
function ActiveSync() {
  const { user } = useAccountUser();
  const pending = useLiveQuery(() => db.outbox.count(), [], 0);
  const running = useRef(false);
  const warned = useRef(false);
  const canSync = Boolean(user && user.consentVersion === PRIVACY_NOTICE_VERSION);

  const run = useCallback(async () => {
    if (!user || !canSync || running.current || !navigator.onLine) return;
    running.current = true;
    const result = await syncNow(user.id);
    running.current = false;
    if (result.status === 'error' && !warned.current) {
      warned.current = true;
      toast.error('Could not sync. Your changes are saved on this device and will sync later.');
    }
    if (result.status === 'synced') warned.current = false;
  }, [user, canSync]);

  useEffect(() => {
    if (!canSync) return;
    void run();
    const onWake = () => void run();
    window.addEventListener('online', onWake);
    window.addEventListener('focus', onWake);
    const timer = window.setInterval(onWake, BACKGROUND_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', onWake);
      window.removeEventListener('focus', onWake);
      window.clearInterval(timer);
    };
  }, [canSync, run]);

  useEffect(() => {
    if (!canSync || pending === 0) return;
    const timer = window.setTimeout(() => void run(), AFTER_EDIT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pending, canSync, run]);

  return null;
}

/** Servers without accounts never see session requests from the app. */
export function SyncController() {
  const status = useServerStatus();
  return status.data?.accounts ? <ActiveSync /> : null;
}
