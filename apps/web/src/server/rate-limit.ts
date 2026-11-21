/**
 * Fixed-window rate limiter kept in memory. Enough for the single-server deployment;
 * move to Postgres or Redis before running more than one app instance.
 */
export interface RateLimiter {
  /** True if the call is allowed. */
  take: (key: string, now?: number) => boolean;
}

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    take(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size > 10_000) hits.clear(); // bound memory under abuse
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      hits.set(key, { ...entry, count: entry.count + 1 });
      return true;
    },
  };
}
