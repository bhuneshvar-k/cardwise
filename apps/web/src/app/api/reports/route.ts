import { reportRequestSchema } from '@cardwise/contracts';
import { createReport } from '@cardwise/db';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { serverEnv } from '@/server/env';
import { clientIp, isSameOrigin, jsonError, readJson } from '@/server/http';
import { createRateLimiter } from '@/server/rate-limit';
import { getSessionUser } from '@/server/session';

const limiter = createRateLimiter({ limit: 5, windowMs: 60 * 60_000 });

/** "This is wrong" reports. Signed-out users can report too, within a tight rate limit. */
export async function POST(request: Request) {
  if (!serverEnv().DATABASE_URL) return jsonError(503, 'Reports are not enabled on this server');
  if (!isSameOrigin(request)) return jsonError(403, 'Cross-site request refused');
  const user = await getSessionUser(request.headers).catch(() => null);
  if (!limiter.take(user?.id ?? `ip:${clientIp(request)}`))
    return jsonError(429, 'Too many reports. Try again later.');

  const body = await readJson(request, reportRequestSchema);
  if (!body.ok) return body.response;
  try {
    const report = await createReport(await getDb(), user?.id ?? null, body.data);
    return NextResponse.json({ id: report.id }, { status: 201 });
  } catch (error) {
    console.error('report failed', error);
    return jsonError(500, 'Could not send the report');
  }
}
