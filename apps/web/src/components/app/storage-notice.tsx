'use client';

import { HardDrive, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'cardwise:storage-notice-dismissed';

type Status = 'unknown' | 'persisted' | 'at-risk' | 'ios-browser';

function isIosSafariTab(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
}

/** Warns that data lives only on this device, and how to stop the browser clearing it. */
export function StorageNotice() {
  const [status, setStatus] = useState<Status>('unknown');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    if (isIosSafariTab()) {
      setStatus('ios-browser');
      return;
    }
    navigator.storage
      ?.persist?.()
      .then((granted) => setStatus(granted ? 'persisted' : 'at-risk'))
      .catch(() => setStatus('at-risk'));
  }, []);

  if (dismissed || status === 'unknown' || status === 'persisted') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode: the notice simply comes back next time.
    }
  };

  return (
    <Alert className="relative pr-10">
      <HardDrive aria-hidden />
      <AlertTitle>Your cards are saved only on this device</AlertTitle>
      <AlertDescription>
        {status === 'ios-browser'
          ? 'Safari can clear website data after 7 days without use. Add Cardwise to your Home Screen (Share → Add to Home Screen) and export a backup from About.'
          : 'Your browser may clear it if storage runs low. Export a backup from About now and then.'}
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <X />
      </Button>
    </Alert>
  );
}
