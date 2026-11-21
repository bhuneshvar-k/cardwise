import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, test } from 'vitest';
import { scrubQueryParams } from './sentry-scrub';

describe('scrubQueryParams', () => {
  test('removes query parameters from error messages', () => {
    const event = {
      type: undefined,
      message: 'Failed query: insert … params: {"nickname":"Alice"}',
      exception: {
        values: [{ value: 'Failed query: update … params: user-1,{"amountPaise":5000}' }],
      },
    } as ErrorEvent;
    const scrubbed = scrubQueryParams(event);
    expect(scrubbed.message).toBe('Failed query: insert … params: [redacted]');
    expect(scrubbed.exception?.values?.[0]?.value).toBe(
      'Failed query: update … params: [redacted]',
    );
  });
});
