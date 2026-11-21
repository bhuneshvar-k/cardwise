import { describe, expect, test } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  test('allows up to the limit per window, per key', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect([limiter.take('a', 0), limiter.take('a', 1), limiter.take('a', 2)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(limiter.take('b', 2)).toBe(true);
  });

  test('a flood of new keys does not reset limits for existing ones', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 3 });
    limiter.take('victim', 0);
    limiter.take('a', 1);
    limiter.take('b', 2);
    // Full: an expired entry would go first; none has expired, so the oldest key is dropped
    limiter.take('c', 3);
    expect(limiter.take('b', 4)).toBe(false);
  });

  test('resets after the window', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.take('a', 0);
    expect(limiter.take('a', 999)).toBe(false);
    expect(limiter.take('a', 1000)).toBe(true);
  });
});
