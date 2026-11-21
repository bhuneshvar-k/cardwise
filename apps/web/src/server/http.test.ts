// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';
import { z } from 'zod';

vi.mock('server-only', () => ({}));

const schema = z.object({ a: z.number() });
const post = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/x', {
    method: 'POST',
    body,
    headers,
    duplex: 'half',
  } as RequestInit);

describe('readJson', () => {
  test('parses a valid body', async () => {
    const { readJson } = await import('./http');
    expect(await readJson(post('{"a":1}'), schema)).toEqual({ ok: true, data: { a: 1 } });
  });

  test('refuses a streamed body over the limit even without content-length', async () => {
    const { readJson } = await import('./http');
    const big = new ReadableStream({
      start(c) {
        for (let i = 0; i < 20; i += 1) c.enqueue(new Uint8Array(100_000));
        c.close();
      },
    });
    const result = await readJson(post(big), schema);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  test('rejects bad JSON and invalid shapes', async () => {
    const { readJson } = await import('./http');
    const bad = await readJson(post('{nope'), schema);
    const wrong = await readJson(post('{"a":"x"}'), schema);
    expect(bad.ok || wrong.ok).toBe(false);
    if (!bad.ok) expect(bad.response.status).toBe(400);
  });
});

describe('isSameOrigin', () => {
  test('needs an Origin matching the host', async () => {
    const { isSameOrigin } = await import('./http');
    const req = (origin?: string) =>
      new Request('http://localhost/api/x', {
        headers: { host: 'cardwise.test', ...(origin ? { origin } : {}) },
      });
    expect(isSameOrigin(req('https://cardwise.test'))).toBe(true);
    expect(isSameOrigin(req('https://evil.test'))).toBe(false);
    expect(isSameOrigin(req())).toBe(false);
  });
});
