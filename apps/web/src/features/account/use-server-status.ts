'use client';

import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const statusSchema = z.object({
  accounts: z.boolean(),
  google: z.boolean(),
  testLogin: z.boolean(),
  reports: z.boolean(),
});
export type ServerStatus = z.infer<typeof statusSchema>;

const OFFLINE: ServerStatus = { accounts: false, google: false, testLogin: false, reports: false };

/** Which account features this server offers; all off when offline or not configured. */
export function useServerStatus() {
  return useQuery({
    queryKey: ['server-status'],
    queryFn: async () => {
      const res = await fetch('/api/status');
      return res.ok ? statusSchema.parse(await res.json()) : OFFLINE;
    },
    staleTime: Infinity,
    placeholderData: OFFLINE,
  });
}
