import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/server/auth';
import { accountsEnabled } from '@/server/env';
import { jsonError } from '@/server/http';

async function handle(request: Request, method: 'GET' | 'POST') {
  if (!accountsEnabled()) return jsonError(503, 'Accounts are not enabled on this server');
  const handlers = toNextJsHandler(await getAuth());
  return handlers[method](request);
}

export const GET = (request: Request) => handle(request, 'GET');
export const POST = (request: Request) => handle(request, 'POST');
