/**
 * Bounded in-memory sliding-window rate limiter with automatic FIFO key
 * eviction to prevent memory exhaustion under spoofed-IP floods.
 */

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxTrackedKeys: number;
  private readonly defaultWindowMs: number;

  public constructor(options?: {
    maxTrackedKeys?: number;
    defaultWindowMs?: number;
  }) {
    this.maxTrackedKeys = options?.maxTrackedKeys ?? 10_000;
    this.defaultWindowMs = options?.defaultWindowMs ?? 60 * 60 * 1000;
  }

  public check(
    ip: string,
    bucketKey: string,
    limitPerWindow: number,
    nowMs = Date.now(),
    windowMs = this.defaultWindowMs
  ): RateLimitCheckResult {
    if (limitPerWindow <= 0) {
      return { allowed: true, remaining: 999, retryAfterSeconds: 0 };
    }
    if (this.hits.size > this.maxTrackedKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey !== undefined) {
        this.hits.delete(oldestKey);
      }
    }

    const key = `${bucketKey}::${ip || "unknown"}`;
    const cutoff = nowMs - windowMs;
    const previous = (this.hits.get(key) || []).filter((ts) => ts > cutoff);

    if (previous.length >= limitPerWindow) {
      const oldest = previous[0] ?? nowMs;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldest + windowMs - nowMs) / 1000)
      );
      this.hits.set(key, previous);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    previous.push(nowMs);
    this.hits.set(key, previous);
    return {
      allowed: true,
      remaining: Math.max(0, limitPerWindow - previous.length),
      retryAfterSeconds: 0,
    };
  }

  public reset(): void {
    this.hits.clear();
  }
}
