/**
 * Rate Limiting Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Response, NextFunction } from 'express';
import { createRateLimitMiddleware, getRateLimitStatus } from './rate-limit.js';
import type { AuthenticatedRequest, ApiKeyRecord } from './auth.js';

describe('Rate Limiting Middleware', () => {
  // Mock database client
  const mockDb = {
    logRateLimitHit: vi.fn().mockResolvedValue(undefined),
  };

  const config = {
    windowMs: 60000, // 1 minute
    max: 60,
  };

  // Mock request/response helpers
  function createMockApiKey(tier: 'free' | 'pro' | 'team' = 'free'): ApiKeyRecord {
    return {
      id: `key-${tier}-${Math.random().toString(36).slice(2, 8)}`,
      keyHash: 'hash123',
      keyPrefix: 'hfx_test1234',
      userId: 'user-456',
      stripeCustomerId: null,
      tier,
      monthlyLimit: 1000,
      currentUsage: 0,
      createdAt: new Date(),
      lastUsedAt: null,
    };
  }

  function createMockRequest(
    apiKey?: ApiKeyRecord,
    tier?: 'free' | 'pro' | 'team'
  ): AuthenticatedRequest {
    const req: Partial<AuthenticatedRequest> = {
      headers: {},
      path: '/api/compile',
    };
    if (apiKey) {
      req.apiKey = apiKey;
      req.userId = apiKey.userId;
      req.tier = tier || apiKey.tier;
    }
    return req as AuthenticatedRequest;
  }

  function createMockResponse(): Response {
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };
    return res as Response;
  }

  const nextFn: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createRateLimitMiddleware', () => {
    it('should skip rate limiting for unauthenticated requests', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const req = createMockRequest(); // No apiKey
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should set rate limit headers for authenticated requests', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');
      const req = createMockRequest(apiKey, 'free');
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 60);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 59);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Policy', '60;w=60');
    });

    it('should use higher limit for pro tier', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('pro');
      const req = createMockRequest(apiKey, 'pro');
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 600);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 599);
    });

    it('should use highest limit for team tier', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('team');
      const req = createMockRequest(apiKey, 'team');
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3000);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2999);
    });

    it('should decrement remaining count on each request', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);

        if (i === 2) {
          // After 3 requests, remaining should be 57
          expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 57);
        }
      }
    });

    it('should return 429 when rate limit exceeded', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Make 61 requests (free tier limit is 60)
      for (let i = 0; i < 61; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);

        if (i === 60) {
          // 61st request should be rejected
          expect(res.status).toHaveBeenCalledWith(429);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: 'Rate limit exceeded',
              limit: 60,
              remaining: 0,
              tier: 'free',
            })
          );
          expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
        }
      }
    });

    it('should log rate limit hits to database', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Exceed the limit
      for (let i = 0; i <= 60; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);
      }

      // Wait for async log
      await vi.runAllTimersAsync();

      expect(mockDb.logRateLimitHit).toHaveBeenCalledWith(apiKey.id, 'free', 61);
    });

    it('should reset counter after window expires', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Make 30 requests
      for (let i = 0; i < 30; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);
      }

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Make another request - should reset
      const req = createMockRequest(apiKey, 'free');
      const res = createMockResponse();
      await middleware(req, res, nextFn);

      // Should have full limit - 1
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 59);
    });

    it('should include upgrade link for free tier', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Exceed limit
      for (let i = 0; i <= 60; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);

        if (i === 60) {
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              upgrade: 'https://hyperfixi.dev/pricing',
            })
          );
        }
      }
    });

    it('should not include upgrade link for paid tiers', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('pro');

      // Exceed limit (pro has 600 limit)
      for (let i = 0; i <= 600; i++) {
        const req = createMockRequest(apiKey, 'pro');
        const res = createMockResponse();
        await middleware(req, res, nextFn);

        if (i === 600) {
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              upgrade: undefined,
            })
          );
        }
      }
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return full limit when no requests made', () => {
      const status = getRateLimitStatus('new-key-id', 'free');

      expect(status).toEqual({
        limit: 60,
        remaining: 60,
        reset: null,
      });
    });

    it('should return correct limit for each tier', () => {
      expect(getRateLimitStatus('key', 'free').limit).toBe(60);
      expect(getRateLimitStatus('key', 'pro').limit).toBe(600);
      expect(getRateLimitStatus('key', 'team').limit).toBe(3000);
    });

    it('should default to free tier for unknown tier', () => {
      const status = getRateLimitStatus('key', 'unknown');
      expect(status.limit).toBe(60);
    });

    it('should track remaining after requests', async () => {
      const middleware = createRateLimitMiddleware(mockDb as any, config);
      const apiKey = createMockApiKey('free');

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const req = createMockRequest(apiKey, 'free');
        const res = createMockResponse();
        await middleware(req, res, nextFn);
      }

      const status = getRateLimitStatus(apiKey.id, 'free');
      expect(status.remaining).toBe(50);
      expect(status.currentCount).toBe(10);
    });
  });
});
