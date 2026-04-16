/**
 * Sliding-window rate limiter. Uses Upstash Redis when configured,
 * falls back to in-memory for local dev.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = { count: number; windowStart: number };

const inMemoryStore = new Map<string, RateLimitEntry>();

let hasLoggedFallback = false;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(1, "1s"),
      analytics: true,
    })
  : null;

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  if (limiter && redis) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const upstashLimiter = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds}s`),
      });

      const result = await upstashLimiter.limit(key);

      return {
        allowed: result.success,
        remaining: Math.max(0, result.remaining),
        resetMs: result.reset,
      };
    } catch (error) {
      console.error("[rate-limit] Upstash error, falling back to in-memory:", error);
    }
  }

  if (!hasLoggedFallback) {
    console.warn(
      "[rate-limit] Redis not configured — using in-memory fallback"
    );
    hasLoggedFallback = true;
  }

  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    inMemoryStore.set(key, { count: 1, windowStart: now });
    if (inMemoryStore.size > 500) {
      for (const [k, e] of inMemoryStore.entries()) {
        if (now - e.windowStart > windowMs) inMemoryStore.delete(k);
      }
    }
    return { allowed: true, remaining: maxRequests - 1, resetMs: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetMs: entry.windowStart + windowMs };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetMs: entry.windowStart + windowMs };
}

