/**
 * Authentication Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createAuthMiddleware,
  requireTier,
  hashApiKey,
  generateApiKey,
  type AuthenticatedRequest,
  type ApiKeyRecord,
} from './auth.js';

describe('Authentication Middleware', () => {
  // Mock database client
  const mockDb = {
    getApiKeyByHash: vi.fn(),
    updateApiKeyLastUsed: vi.fn().mockResolvedValue(undefined),
  };

  const salt = 'test-salt-12345';

  // Mock request/response helpers
  function createMockRequest(overrides: Partial<Request> = {}): AuthenticatedRequest {
    return {
      headers: {},
      path: '/api/compile',
      ...overrides,
    } as AuthenticatedRequest;
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
  });

  describe('hashApiKey', () => {
    it('should produce consistent hash for same key and salt', () => {
      const hash1 = hashApiKey('hfx_testkey123', salt);
      const hash2 = hashApiKey('hfx_testkey123', salt);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different keys', () => {
      const hash1 = hashApiKey('hfx_key1', salt);
      const hash2 = hashApiKey('hfx_key2', salt);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash for different salts', () => {
      const hash1 = hashApiKey('hfx_testkey', 'salt1');
      const hash2 = hashApiKey('hfx_testkey', 'salt2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64 character hex string', () => {
      const hash = hashApiKey('hfx_anykey', salt);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateApiKey', () => {
    it('should generate key starting with hfx_', () => {
      const { key, prefix } = generateApiKey();
      expect(key).toMatch(/^hfx_/);
    });

    it('should generate 12 character prefix', () => {
      const { prefix } = generateApiKey();
      expect(prefix).toHaveLength(12);
      expect(prefix).toMatch(/^hfx_/);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const { key } = generateApiKey();
        keys.add(key);
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('createAuthMiddleware', () => {
    const middleware = createAuthMiddleware(mockDb as any, salt);

    it('should allow health check without auth', async () => {
      const req = createMockRequest({ path: '/health' });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when X-API-Key header is missing', async () => {
      const req = createMockRequest({ headers: {} });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing API key',
        })
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid API key format', async () => {
      const req = createMockRequest({
        headers: { 'x-api-key': 'invalid_key_format' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid API key format',
        })
      );
    });

    it('should return 401 for key not found in database', async () => {
      mockDb.getApiKeyByHash.mockResolvedValueOnce(null);

      const req = createMockRequest({
        headers: { 'x-api-key': 'hfx_nonexistent123' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid API key',
        })
      );
    });

    it('should return 401 for deleted/revoked key', async () => {
      mockDb.getApiKeyByHash.mockResolvedValueOnce({
        id: 'key-123',
        deletedAt: new Date(),
      });

      const req = createMockRequest({
        headers: { 'x-api-key': 'hfx_revoked123456' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'API key revoked',
        })
      );
    });

    it('should attach user context for valid key', async () => {
      const mockRecord: ApiKeyRecord = {
        id: 'key-123',
        keyHash: 'hash123',
        keyPrefix: 'hfx_test1234',
        userId: 'user-456',
        stripeCustomerId: 'cus_test',
        tier: 'pro',
        monthlyLimit: 10000,
        currentUsage: 500,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockDb.getApiKeyByHash.mockResolvedValueOnce(mockRecord);

      const req = createMockRequest({
        headers: { 'x-api-key': 'hfx_validkey1234' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(req.apiKey).toEqual(mockRecord);
      expect(req.userId).toBe('user-456');
      expect(req.tier).toBe('pro');
    });

    it('should update last used timestamp asynchronously', async () => {
      const mockRecord: ApiKeyRecord = {
        id: 'key-123',
        keyHash: 'hash123',
        keyPrefix: 'hfx_test1234',
        userId: 'user-456',
        stripeCustomerId: null,
        tier: 'free',
        monthlyLimit: 1000,
        currentUsage: 0,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockDb.getApiKeyByHash.mockResolvedValueOnce(mockRecord);

      const req = createMockRequest({
        headers: { 'x-api-key': 'hfx_validkey1234' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDb.updateApiKeyLastUsed).toHaveBeenCalledWith('key-123');
    });

    it('should return 500 on database error', async () => {
      mockDb.getApiKeyByHash.mockRejectedValueOnce(new Error('Database error'));

      const req = createMockRequest({
        headers: { 'x-api-key': 'hfx_validkey1234' },
      });
      const res = createMockResponse();

      await middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication failed',
        })
      );
    });
  });

  describe('requireTier', () => {
    it('should return 401 if not authenticated', () => {
      const middleware = requireTier('pro', 'team');
      const req = createMockRequest() as AuthenticatedRequest;
      const res = createMockResponse();

      middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not authenticated',
        })
      );
    });

    it('should return 403 for insufficient tier', () => {
      const middleware = requireTier('pro', 'team');
      const req = createMockRequest() as AuthenticatedRequest;
      req.tier = 'free';
      const res = createMockResponse();

      middleware(req, res, nextFn);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Insufficient permissions',
          currentTier: 'free',
        })
      );
    });

    it('should allow matching tier', () => {
      const middleware = requireTier('pro', 'team');
      const req = createMockRequest() as AuthenticatedRequest;
      req.tier = 'pro';
      const res = createMockResponse();

      middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should allow team tier access to team-only endpoint', () => {
      const middleware = requireTier('team');
      const req = createMockRequest() as AuthenticatedRequest;
      req.tier = 'team';
      const res = createMockResponse();

      middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should allow all tiers when all specified', () => {
      const middleware = requireTier('free', 'pro', 'team');
      const req = createMockRequest() as AuthenticatedRequest;
      req.tier = 'free';
      const res = createMockResponse();

      middleware(req, res, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });
});
