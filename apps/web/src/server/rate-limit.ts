/**
 * Fixed-window rate limiter kept in memory. Enough for the single-server deployment;
 * move to Postgres or Redis before running more than one app instance.
 */
export interface RateLimiter {
  /** True if the call is allowed. */
  take: (key: string, now?: number) => boolean;
}

interface Options {
  limit: number;
  windowMs: number;
  /** Most keys tracked at once, to bound memory under abuse. */
  maxKeys?: number;
}

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000 }: Options): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  /** Drop expired windows; if still full, drop the oldest keys. Never resets live limits wholesale. */
  const evict = (now: number) => {
    for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
    for (const key of hits.keys()) {
      if (hits.size < maxKeys) break;
      hits.delete(key);
    }
  };

  return {
    take(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (!entry && hits.size >= maxKeys) evict(now);
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      hits.set(key, { ...entry, count: entry.count + 1 });
      return true;
    },
  };
}
