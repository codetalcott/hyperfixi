/**
 * Usage Tracking Middleware Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Response, NextFunction } from 'express';
import {
  createUsageMiddleware,
  getBufferedUsage,
  forceFlush,
} from './usage.js';
import type { AuthenticatedRequest, ApiKeyRecord } from './auth.js';

describe('Usage Tracking Middleware', () => {
  // Mock database client
  const mockDb = {
    logUsage: vi.fn().mockResolvedValue(undefined),
    updateMonthlyUsage: vi.fn().mockResolvedValue(undefined),
  };

  // Mock Stripe client
  const mockStripe = {
    reportUsage: vi.fn().mockResolvedValue(undefined),
  };

  // Counter for unique key IDs
  let keyCounter = 0;

  // Mock request/response helpers
  function createMockApiKey(options: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
    keyCounter++;
    return {
      id: `key-${keyCounter}`,
      keyHash: 'hash123',
      keyPrefix: 'hfx_test1234',
      userId: 'user-456',
      stripeCustomerId: `cus_test${keyCounter}`,
      tier: 'pro',
      monthlyLimit: 10000,
      currentUsage: 500,
      createdAt: new Date(),
      lastUsedAt: null,
      ...options,
    };
  }

  function createMockRequest(apiKey?: ApiKeyRecord): AuthenticatedRequest {
    const req: Partial<AuthenticatedRequest> = {
      headers: { 'user-agent': 'test-agent' },
      path: '/api/compile',
      method: 'POST',
      ip: '127.0.0.1',
    };
    if (apiKey) {
      req.apiKey = apiKey;
      req.userId = apiKey.userId;
      req.tier = apiKey.tier;
    }
    return req as AuthenticatedRequest;
  }

  function createMockResponse(): Response & { _body?: any } {
    const res: Partial<Response> & { _body?: any } = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(function (this: any, body: any) {
        this._body = body;
        return this;
      }),
      setHeader: vi.fn().mockReturnThis(),
    };
    return res as Response & { _body?: any };
  }

  const nextFn: NextFunction = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear buffer by flushing (ignoring errors for empty buffer)
    await forceFlush(mockDb as any, mockStripe as any).catch(() => {});
    vi.clearAllMocks(); // Clear again after flush
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createUsageMiddleware', () => {
    it('should skip tracking for unauthenticated requests', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const req = createMockRequest(); // No apiKey
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
      // Original json should not be modified for unauthenticated
    });

    it('should call next for authenticated requests', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should count scripts in response', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      // Simulate response with compiled scripts
      res.json({
        success: true,
        compiled: {
          main: 'compiled-js-1',
          secondary: 'compiled-js-2',
          third: 'compiled-js-3',
        },
      });

      // Wait for async logging
      await vi.runAllTimersAsync();

      expect(mockDb.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKeyId: apiKey.id,
          endpoint: '/api/compile',
          method: 'POST',
          scriptCount: 3,
        })
      );
    });

    it('should log response time', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      // Advance time by 100ms
      vi.advanceTimersByTime(100);

      res.json({ success: true, compiled: {} });

      await vi.runAllTimersAsync();

      expect(mockDb.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTimeMs: expect.any(Number),
        })
      );
    });

    it('should log error count from response', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      res.json({
        success: false,
        compiled: {},
        errors: [
          { message: 'Error 1' },
          { message: 'Error 2' },
        ],
      });

      await vi.runAllTimersAsync();

      expect(mockDb.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCount: 2,
        })
      );
    });

    it('should log user agent and IP', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({ success: true, compiled: {} });

      await vi.runAllTimersAsync();

      expect(mockDb.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'test-agent',
          ipAddress: '127.0.0.1',
        })
      );
    });
  });

  describe('getBufferedUsage', () => {
    it('should return zero counts for unknown key', () => {
      const usage = getBufferedUsage('unknown-key');
      expect(usage).toEqual({ compileCount: 0, scriptCount: 0 });
    });

    it('should track buffered usage after requests', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({
        success: true,
        compiled: { main: 'js', secondary: 'js2' },
      });

      const usage = getBufferedUsage(apiKey.id);
      expect(usage.compileCount).toBe(1);
      expect(usage.scriptCount).toBe(2);
    });

    it('should accumulate usage across requests', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        const req = createMockRequest(apiKey);
        const res = createMockResponse();
        await middleware(req, res, nextFn);
        res.json({
          success: true,
          compiled: { script: 'js' },
        });
      }

      const usage = getBufferedUsage(apiKey.id);
      expect(usage.compileCount).toBe(3);
      expect(usage.scriptCount).toBe(3);
    });
  });

  describe('forceFlush', () => {
    it('should flush buffered usage to Stripe', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({
        success: true,
        compiled: { main: 'js', secondary: 'js2' },
      });

      await forceFlush(mockDb as any, mockStripe as any);

      expect(mockStripe.reportUsage).toHaveBeenCalledWith(apiKey.stripeCustomerId, 1);
    });

    it('should update monthly usage in database', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({
        success: true,
        compiled: { main: 'js' },
      });

      await forceFlush(mockDb as any, mockStripe as any);

      expect(mockDb.updateMonthlyUsage).toHaveBeenCalledWith(apiKey.id, 1, 1);
    });

    it('should clear buffer after successful flush', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({ success: true, compiled: { main: 'js' } });

      await forceFlush(mockDb as any, mockStripe as any);

      const usage = getBufferedUsage(apiKey.id);
      expect(usage.compileCount).toBe(0);
    });

    it('should re-add to buffer on flush failure', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({ success: true, compiled: { main: 'js' } });

      // Make Stripe fail
      mockStripe.reportUsage.mockRejectedValueOnce(new Error('Stripe error'));

      await forceFlush(mockDb as any, mockStripe as any);

      // Buffer should still have the usage
      const usage = getBufferedUsage(apiKey.id);
      expect(usage.compileCount).toBe(1);
    });

    it('should skip customers without Stripe ID', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey({ stripeCustomerId: null });
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);
      res.json({ success: true, compiled: { main: 'js' } });

      await forceFlush(mockDb as any, mockStripe as any);

      // Should not call Stripe for null customer
      expect(mockStripe.reportUsage).not.toHaveBeenCalled();
    });
  });

  describe('Response passthrough', () => {
    it('should preserve original response body', async () => {
      const middleware = createUsageMiddleware(mockDb as any, mockStripe as any);
      const apiKey = createMockApiKey();
      const req = createMockRequest(apiKey);
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      const responseBody = {
        success: true,
        compiled: { main: 'js-code' },
        metadata: { foo: 'bar' },
      };

      res.json(responseBody);

      expect(res._body).toEqual(responseBody);
    });
  });
});
