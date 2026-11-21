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

/** Read at most `limit` bytes; null if the body is larger (even when chunked or mislabelled). */
async function readCapped(request: Request, limit: number): Promise<string | null> {
  if (Number(request.headers.get('content-length') ?? 0) > limit) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Parse a JSON body against a schema, with a size limit. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse<ApiError> }> {
  const text = await readCapped(request, MAX_BODY_BYTES);
  if (text === null) return { ok: false, response: jsonError(413, 'Request too large') };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, 'Body must be JSON') };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return { ok: false, response: jsonError(400, 'Invalid request', z.flattenError(parsed.error)) };
  return { ok: true, data: parsed.data };
}

/**
 * Log a server error without personal data: database errors carry the failed query's
 * parameters (cards, spends) in their message, so only the name and SQLSTATE code are kept.
 */
export function logServerError(context: string, error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error;
  const cause = error instanceof Error ? (error.cause as { code?: string } | undefined) : undefined;
  console.error(`${context} failed`, { name, code: cause?.code ?? null });
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
