// Distributed rate limiter backed by Upstash Redis, with fallback to in-memory.
// Key is typically `userId:endpoint`. Window is in milliseconds.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = { count: number; windowStart: number };

const inMemoryStore = new Map<string, RateLimitEntry>();

// Track whether we've already logged the fallback warning to avoid spam
let hasLoggedFallback = false;

// Initialize Upstash client if env vars are present
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Initialize Upstash rate limiter if Redis is available
const limiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(1, "1s"), // 1 request per second per key (will be overridden per-call)
      analytics: true,
    })
  : null;

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  // Use Upstash if available
  if (limiter && redis) {
    try {
      // Upstash Ratelimit expects window in milliseconds as a string like "60000 ms"
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
      // If Upstash fails, fall back to in-memory (don't break on network issues)
      console.error("[rate-limit] Upstash error, falling back to in-memory:", error);
    }
  }

  // Log fallback once
  if (!hasLoggedFallback) {
    console.warn(
      "[rate-limit] Redis not configured — using in-memory fallback"
    );
    hasLoggedFallback = true;
  }

  // In-memory sliding window implementation
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    inMemoryStore.set(key, { count: 1, windowStart: now });
    // Inline cleanup: if the store grows too large, evict all expired entries in one pass
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

