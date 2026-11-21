'use client';

import { useSyncExternalStore } from 'react';
import { localToday } from '@/lib/today';

const noopSubscribe = () => () => {};

/** Today's local date on the client; null while prerendering so the shell stays static. */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, localToday, () => null);
}
