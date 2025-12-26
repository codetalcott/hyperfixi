/**
 * Rate Limiting Middleware
 *
 * Tracks request counts by API key with tier-based limits.
 * Uses sliding window algorithm for fair rate limiting.
 */

import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import type { DatabaseClient } from '../db/client.js';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Default max requests per window
}

// Tier-based rate limits (requests per minute)
const TIER_LIMITS: Record<string, number> = {
  free: 60, // 1 request/second
  pro: 600, // 10 requests/second
  team: 3000, // 50 requests/second
};

// In-memory rate limit tracking (for fast lookups)
const rateLimitCache = new Map<
  string,
  {
    count: number;
    windowStart: number;
  }
>();

/**
 * Clean up expired rate limit entries
 */
function cleanupCache(windowMs: number) {
  const now = Date.now();
  for (const [key, value] of rateLimitCache.entries()) {
    if (now - value.windowStart > windowMs) {
      rateLimitCache.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(() => cleanupCache(60000), 60000);

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(db: DatabaseClient, config: RateLimitConfig) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip rate limiting for unauthenticated requests (handled by auth middleware)
    if (!req.apiKey) {
      return next();
    }

    const keyId = req.apiKey.id;
    const tier = req.tier || 'free';
    const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitCache.get(keyId);

    if (!entry || now - entry.windowStart > config.windowMs) {
      // Start new window
      entry = {
        count: 0,
        windowStart: now,
      };
      rateLimitCache.set(keyId, entry);
    }

    // Increment count
    entry.count++;

    // Calculate remaining and reset time
    const remaining = Math.max(0, limit - entry.count);
    const resetTime = entry.windowStart + config.windowMs;
    const resetSeconds = Math.ceil((resetTime - now) / 1000);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
    res.setHeader('X-RateLimit-Policy', `${limit};w=${config.windowMs / 1000}`);

    // Check if over limit
    if (entry.count > limit) {
      res.setHeader('Retry-After', resetSeconds);

      // Log rate limit hit (async)
      db.logRateLimitHit(keyId, tier, entry.count).catch((err) => {
        console.error('Failed to log rate limit hit:', err);
      });

      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You have exceeded ${limit} requests per minute`,
        limit,
        remaining: 0,
        resetIn: resetSeconds,
        tier,
        upgrade: tier === 'free' ? 'https://hyperfixi.dev/pricing' : undefined,
      });
    }

    next();
  };
}

/**
 * Get current rate limit status for an API key
 */
export function getRateLimitStatus(keyId: string, tier: string) {
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const entry = rateLimitCache.get(keyId);

  if (!entry) {
    return {
      limit,
      remaining: limit,
      reset: null,
    };
  }

  const now = Date.now();
  const remaining = Math.max(0, limit - entry.count);
  const resetTime = entry.windowStart + 60000; // 1 minute window

  return {
    limit,
    remaining,
    reset: new Date(resetTime).toISOString(),
    currentCount: entry.count,
  };
}
