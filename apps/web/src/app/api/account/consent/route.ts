import { PRIVACY_NOTICE_VERSION } from '@cardwise/contracts';
import { recordConsent } from '@cardwise/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/server/db';
import { accountsEnabled } from '@/server/env';
import { isSameOrigin, jsonError, readJson } from '@/server/http';
import { getSessionUser } from '@/server/session';

const consentSchema = z.object({ version: z.literal(PRIVACY_NOTICE_VERSION) });

/** Record that the signed-in user agreed to the current privacy notice. */
export async function POST(request: Request) {
  if (!accountsEnabled()) return jsonError(503, 'Accounts are not enabled on this server');
  if (!isSameOrigin(request)) return jsonError(403, 'Cross-site request refused');
  const user = await getSessionUser(request.headers);
  if (!user) return jsonError(401, 'Sign in first');
  const body = await readJson(request, consentSchema);
  if (!body.ok) return body.response;
  await recordConsent(await getDb(), user.id, body.data.version);
  return NextResponse.json({ version: body.data.version });
}
