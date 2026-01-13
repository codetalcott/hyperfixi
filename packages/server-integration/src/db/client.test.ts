/**
 * Database Client Tests
 *
 * Tests for PostgreSQL database operations.
 * Uses mocking since we don't want to require a real database for unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseClient, type UsageLogEntry, type CreateApiKeyParams } from './client.js';

// Mock pg module
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const mockPool = {
  connect: vi.fn().mockResolvedValue(mockClient),
  query: vi.fn(),
  end: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
};

vi.mock('pg', () => {
  return {
    default: {
      Pool: class MockPool {
        constructor() {
          return mockPool;
        }
      },
    },
  };
});

describe('DatabaseClient', () => {
  let client: DatabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    client = new DatabaseClient('postgresql://test:test@localhost:5432/test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Lifecycle', () => {
    it('should create pool and register error handler', () => {
      // Pool is created in constructor
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should verify connection on connect()', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await client.connect();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should end pool on disconnect()', async () => {
      await client.disconnect();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(client.connect()).rejects.toThrow('Connection refused');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('API Key Operations', () => {
    const mockApiKeyRecord = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      keyHash: 'abc123hash',
      keyPrefix: 'hfx_abc1',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      stripeCustomerId: 'cus_test123',
      tier: 'pro',
      monthlyLimit: 10000,
      currentUsage: 500,
      createdAt: new Date('2024-01-01'),
      lastUsedAt: new Date('2024-01-15'),
      deletedAt: null,
    };

    describe('getApiKeyByHash', () => {
      it('should return API key when found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [mockApiKeyRecord] });

        const result = await client.getApiKeyByHash('abc123hash');

        expect(result).toEqual(mockApiKeyRecord);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM api_keys'), [
          'abc123hash',
        ]);
      });

      it('should return null when API key not found', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await client.getApiKeyByHash('nonexistent');

        expect(result).toBeNull();
      });

      it('should include all required fields in query', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.getApiKeyByHash('test');

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain('key_hash as "keyHash"');
        expect(query).toContain('key_prefix as "keyPrefix"');
        expect(query).toContain('user_id as "userId"');
        expect(query).toContain('stripe_customer_id as "stripeCustomerId"');
        expect(query).toContain('monthly_limit as "monthlyLimit"');
        expect(query).toContain('current_usage as "currentUsage"');
      });
    });

    describe('createApiKey', () => {
      it('should create API key with all parameters', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [mockApiKeyRecord] });

        const params: CreateApiKeyParams = {
          keyHash: 'newhash123',
          keyPrefix: 'hfx_new1',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          stripeCustomerId: 'cus_new123',
          tier: 'team',
          monthlyLimit: 50000,
        };

        const result = await client.createApiKey(params);

        expect(result).toEqual(mockApiKeyRecord);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO api_keys'),
          ['newhash123', 'hfx_new1', params.userId, 'cus_new123', 'team', 50000]
        );
      });

      it('should use defaults for optional parameters', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [mockApiKeyRecord] });

        const params: CreateApiKeyParams = {
          keyHash: 'hash',
          keyPrefix: 'hfx_test',
          userId: '123e4567-e89b-12d3-a456-426614174001',
        };

        await client.createApiKey(params);

        const queryParams = mockPool.query.mock.calls[0][1];
        expect(queryParams[3]).toBeNull(); // stripeCustomerId
        expect(queryParams[4]).toBe('free'); // tier default
        expect(queryParams[5]).toBe(1000); // monthlyLimit default
      });
    });

    describe('updateApiKeyLastUsed', () => {
      it('should update last_used_at timestamp', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.updateApiKeyLastUsed('key-id-123');

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE api_keys SET last_used_at = NOW()'),
          ['key-id-123']
        );
      });
    });

    describe('incrementApiKeyUsage', () => {
      it('should increment usage by specified count', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.incrementApiKeyUsage('key-id-123', 5);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('current_usage = current_usage + $2'),
          ['key-id-123', 5]
        );
      });

      it('should default to incrementing by 1', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.incrementApiKeyUsage('key-id-123');

        expect(mockPool.query).toHaveBeenCalledWith(expect.anything(), ['key-id-123', 1]);
      });
    });

    describe('deleteApiKey', () => {
      it('should soft delete by setting deleted_at', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.deleteApiKey('key-id-123');

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SET deleted_at = NOW()'),
          ['key-id-123']
        );
      });
    });

    describe('getApiKeysByUserId', () => {
      it('should return all non-deleted keys for user', async () => {
        const keys = [mockApiKeyRecord, { ...mockApiKeyRecord, id: 'key-2' }];
        mockPool.query.mockResolvedValueOnce({ rows: keys });

        const result = await client.getApiKeysByUserId('user-123');

        expect(result).toHaveLength(2);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('deleted_at IS NULL'), [
          'user-123',
        ]);
      });

      it('should order by created_at DESC', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.getApiKeysByUserId('user-123');

        expect(mockPool.query.mock.calls[0][0]).toContain('ORDER BY created_at DESC');
      });
    });

    describe('updateApiKeyTier', () => {
      it('should update tier and monthly limit', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.updateApiKeyTier('key-123', 'team', 100000);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('SET tier = $2, monthly_limit = $3'),
          ['key-123', 'team', 100000]
        );
      });
    });
  });

  describe('Usage Logging', () => {
    describe('logUsage', () => {
      it('should log usage entry with all fields', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const entry: UsageLogEntry = {
          apiKeyId: 'key-123',
          endpoint: '/api/compile',
          method: 'POST',
          scriptCount: 5,
          responseTimeMs: 150,
          errorCount: 0,
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        };

        await client.logUsage(entry);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO usage_logs'),
          ['key-123', '/api/compile', 'POST', 5, 150, 0, 'Mozilla/5.0', '192.168.1.1']
        );
      });

      it('should handle null user agent and IP', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const entry: UsageLogEntry = {
          apiKeyId: 'key-123',
          endpoint: '/api/compile',
          method: 'POST',
          scriptCount: 1,
          responseTimeMs: 50,
          errorCount: 0,
          userAgent: null,
          ipAddress: null,
        };

        await client.logUsage(entry);

        const params = mockPool.query.mock.calls[0][1];
        expect(params[6]).toBeNull();
        expect(params[7]).toBeNull();
      });
    });

    describe('updateMonthlyUsage', () => {
      it('should upsert monthly usage stats', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.updateMonthlyUsage('key-123', 10, 25);

        const query = mockPool.query.mock.calls[0][0];
        expect(query).toContain('INSERT INTO usage_monthly');
        expect(query).toContain('ON CONFLICT (api_key_id, month) DO UPDATE');
      });

      it('should use correct month format', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.updateMonthlyUsage('key-123', 1, 1);

        const params = mockPool.query.mock.calls[0][1];
        // Month should be in YYYY-MM-01 format
        expect(params[1]).toMatch(/^\d{4}-\d{2}-01$/);
      });
    });

    describe('getUsageStats', () => {
      it('should return aggregated stats for date range', async () => {
        const mockStats = {
          totalCompiles: 100,
          totalScripts: 500,
          avgResponseMs: 75,
        };
        mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

        const result = await client.getUsageStats(
          'key-123',
          new Date('2024-01-01'),
          new Date('2024-12-31')
        );

        expect(result).toEqual(mockStats);
        expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('FROM usage_monthly'), [
          'key-123',
          expect.any(Date),
          expect.any(Date),
        ]);
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('logRateLimitHit', () => {
      it('should log rate limit event', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.logRateLimitHit('key-123', 'pro', 150);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO rate_limit_events'),
          ['key-123', 'pro', 150]
        );
      });
    });
  });

  describe('User Operations', () => {
    describe('getOrCreateUserByStripeId', () => {
      it('should return existing user if found', async () => {
        const existingUser = { id: 'user-123', email: 'test@example.com' };
        mockPool.query.mockResolvedValueOnce({ rows: [existingUser] });

        const result = await client.getOrCreateUserByStripeId('cus_123', 'test@example.com');

        expect(result).toEqual(existingUser);
        expect(mockPool.query).toHaveBeenCalledTimes(1);
      });

      it('should create new user if not found', async () => {
        const newUser = { id: 'user-new', email: 'new@example.com' };
        mockPool.query
          .mockResolvedValueOnce({ rows: [] }) // First query returns no existing user
          .mockResolvedValueOnce({ rows: [newUser] }); // Second query creates user

        const result = await client.getOrCreateUserByStripeId('cus_new', 'new@example.com');

        expect(result).toEqual(newUser);
        expect(mockPool.query).toHaveBeenCalledTimes(2);
        expect(mockPool.query.mock.calls[1][0]).toContain('INSERT INTO users');
      });
    });
  });

  describe('Stripe Events', () => {
    describe('isStripeEventProcessed', () => {
      it('should return true if event exists', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });

        const result = await client.isStripeEventProcessed('evt_123');

        expect(result).toBe(true);
      });

      it('should return false if event does not exist', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const result = await client.isStripeEventProcessed('evt_123');

        expect(result).toBe(false);
      });
    });

    describe('markStripeEventProcessed', () => {
      it('should insert event with payload', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        const payload = { customer: 'cus_123' };
        await client.markStripeEventProcessed('evt_123', 'customer.subscription.created', payload);

        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO stripe_events'),
          ['evt_123', 'customer.subscription.created', JSON.stringify(payload)]
        );
      });

      it('should handle null payload', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.markStripeEventProcessed('evt_123', 'customer.subscription.deleted');

        const params = mockPool.query.mock.calls[0][1];
        expect(params[2]).toBeNull();
      });

      it('should use ON CONFLICT DO NOTHING for idempotency', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [] });

        await client.markStripeEventProcessed('evt_123', 'test.event');

        expect(mockPool.query.mock.calls[0][0]).toContain('ON CONFLICT (id) DO NOTHING');
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(client.getApiKeyByHash('test')).rejects.toThrow('Database connection lost');
    });

    it('should handle constraint violations', async () => {
      const error = new Error('duplicate key value violates unique constraint');
      (error as any).code = '23505';
      mockPool.query.mockRejectedValueOnce(error);

      await expect(
        client.createApiKey({
          keyHash: 'duplicate',
          keyPrefix: 'hfx_dup',
          userId: 'user-123',
        })
      ).rejects.toThrow('duplicate key');
    });
  });
});
