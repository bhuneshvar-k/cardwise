import 'server-only';
import type { ApiError } from '@cardwise/contracts';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export function jsonError(
  status: number,
  error: string,
  details?: unknown,
): NextResponse<ApiError> {
  return NextResponse.json(details === undefined ? { error } : { error, details }, { status });
}

/** Cookie-authenticated writes must come from our own pages (CSRF defence). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const MAX_BODY_BYTES = 1_000_000;

/** Parse a JSON body against a schema, with a size limit. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse<ApiError> }> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return { ok: false, response: jsonError(413, 'Request too large') };
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES)
      return { ok: false, response: jsonError(413, 'Request too large') };
    body = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, 'Body must be JSON') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return { ok: false, response: jsonError(400, 'Invalid request', z.flattenError(parsed.error)) };
  return { ok: true, data: parsed.data };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
