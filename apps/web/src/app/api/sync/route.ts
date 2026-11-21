import { PRIVACY_NOTICE_VERSION, syncRequestSchema } from '@cardwise/contracts';
import { syncUserData } from '@cardwise/db';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { accountsEnabled } from '@/server/env';
import { isSameOrigin, jsonError, readJson, logServerError } from '@/server/http';
import { createRateLimiter } from '@/server/rate-limit';
import { getSessionUser } from '@/server/session';

const limiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export async function POST(request: Request) {
  if (!accountsEnabled()) return jsonError(503, 'Accounts are not enabled on this server');
  if (!isSameOrigin(request)) return jsonError(403, 'Cross-site request refused');
  const user = await getSessionUser(request.headers);
  if (!user) return jsonError(401, 'Sign in to sync');
  if (user.consentVersion !== PRIVACY_NOTICE_VERSION) return jsonError(409, 'consent_required');
  if (!limiter.take(user.id)) return jsonError(429, 'Too many sync requests');

  const body = await readJson(request, syncRequestSchema);
  if (!body.ok) return body.response;
  try {
    const result = await syncUserData(await getDb(), user.id, body.data);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logServerError('sync', error);
    return jsonError(500, 'Sync failed. Please try again.');
  }
}
