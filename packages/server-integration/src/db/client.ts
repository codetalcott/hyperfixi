/**
 * PostgreSQL Database Client
 *
 * Provides typed database operations for the HyperFixi API.
 * Uses pg (node-postgres) for connection management.
 */

import pg from 'pg';
import type { ApiKeyRecord } from '../middleware/auth.js';

const { Pool } = pg;

export interface UsageLogEntry {
  apiKeyId: string;
  endpoint: string;
  method: string;
  scriptCount: number;
  responseTimeMs: number;
  errorCount: number;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface CreateApiKeyParams {
  keyHash: string;
  keyPrefix: string;
  userId: string;
  stripeCustomerId?: string;
  tier?: 'free' | 'pro' | 'team';
  monthlyLimit?: number;
}

export class DatabaseClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    this.pool.on('error', err => {
      console.error('Unexpected database pool error:', err);
    });
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection verified');
    } finally {
      client.release();
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Run database migrations/schema setup
   */
  async migrate(): Promise<void> {
    // In production, use a proper migration tool like node-pg-migrate
    // This is a simplified version for initial setup
    console.log('Running database migrations...');
    // Schema is applied via schema.sql
  }

  // ============================================
  // API Key Operations
  // ============================================

  /**
   * Get an API key by its hash
   */
  async getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const result = await this.pool.query<ApiKeyRecord>(
      `SELECT
        id,
        key_hash as "keyHash",
        key_prefix as "keyPrefix",
        user_id as "userId",
        stripe_customer_id as "stripeCustomerId",
        tier,
        monthly_limit as "monthlyLimit",
        current_usage as "currentUsage",
        created_at as "createdAt",
        last_used_at as "lastUsedAt",
        deleted_at as "deletedAt"
      FROM api_keys
      WHERE key_hash = $1`,
      [keyHash]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new API key
   */
  async createApiKey(params: CreateApiKeyParams): Promise<ApiKeyRecord> {
    const result = await this.pool.query<ApiKeyRecord>(
      `INSERT INTO api_keys (key_hash, key_prefix, user_id, stripe_customer_id, tier, monthly_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
        id,
        key_hash as "keyHash",
        key_prefix as "keyPrefix",
        user_id as "userId",
        stripe_customer_id as "stripeCustomerId",
        tier,
        monthly_limit as "monthlyLimit",
        current_usage as "currentUsage",
        created_at as "createdAt",
        last_used_at as "lastUsedAt"`,
      [
        params.keyHash,
        params.keyPrefix,
        params.userId,
        params.stripeCustomerId || null,
        params.tier || 'free',
        params.monthlyLimit || 1000,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update API key last used timestamp
   */
  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    await this.pool.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [keyId]);
  }

  /**
   * Increment API key usage counter
   */
  async incrementApiKeyUsage(keyId: string, count: number = 1): Promise<void> {
    await this.pool.query(`UPDATE api_keys SET current_usage = current_usage + $2 WHERE id = $1`, [
      keyId,
      count,
    ]);
  }

  /**
   * Delete (soft) an API key
   */
  async deleteApiKey(keyId: string): Promise<void> {
    await this.pool.query(`UPDATE api_keys SET deleted_at = NOW() WHERE id = $1`, [keyId]);
  }

  /**
   * Get all API keys for a user
   */
  async getApiKeysByUserId(userId: string): Promise<ApiKeyRecord[]> {
    const result = await this.pool.query<ApiKeyRecord>(
      `SELECT
        id,
        key_hash as "keyHash",
        key_prefix as "keyPrefix",
        user_id as "userId",
        stripe_customer_id as "stripeCustomerId",
        tier,
        monthly_limit as "monthlyLimit",
        current_usage as "currentUsage",
        created_at as "createdAt",
        last_used_at as "lastUsedAt"
      FROM api_keys
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Update API key tier
   */
  async updateApiKeyTier(
    keyId: string,
    tier: 'free' | 'pro' | 'team',
    monthlyLimit: number
  ): Promise<void> {
    await this.pool.query(`UPDATE api_keys SET tier = $2, monthly_limit = $3 WHERE id = $1`, [
      keyId,
      tier,
      monthlyLimit,
    ]);
  }

  // ============================================
  // Usage Logging
  // ============================================

  /**
   * Log a usage event
   */
  async logUsage(entry: UsageLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_logs (api_key_id, endpoint, method, script_count, response_time_ms, error_count, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.apiKeyId,
        entry.endpoint,
        entry.method,
        entry.scriptCount,
        entry.responseTimeMs,
        entry.errorCount,
        entry.userAgent,
        entry.ipAddress,
      ]
    );
  }

  /**
   * Update monthly usage aggregates
   */
  async updateMonthlyUsage(
    apiKeyId: string,
    compileCount: number,
    scriptCount: number
  ): Promise<void> {
    const month = new Date().toISOString().substring(0, 7) + '-01'; // YYYY-MM-01

    await this.pool.query(
      `INSERT INTO usage_monthly (api_key_id, month, total_compiles, total_scripts)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (api_key_id, month) DO UPDATE SET
         total_compiles = usage_monthly.total_compiles + EXCLUDED.total_compiles,
         total_scripts = usage_monthly.total_scripts + EXCLUDED.total_scripts,
         updated_at = NOW()`,
      [apiKeyId, month, compileCount, scriptCount]
    );
  }

  /**
   * Get usage stats for an API key
   */
  async getUsageStats(
    apiKeyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCompiles: number;
    totalScripts: number;
    avgResponseMs: number;
  }> {
    const result = await this.pool.query(
      `SELECT
        COALESCE(SUM(total_compiles), 0) as "totalCompiles",
        COALESCE(SUM(total_scripts), 0) as "totalScripts",
        COALESCE(AVG(avg_response_ms), 0) as "avgResponseMs"
       FROM usage_monthly
       WHERE api_key_id = $1 AND month >= $2 AND month <= $3`,
      [apiKeyId, startDate, endDate]
    );

    return result.rows[0];
  }

  // ============================================
  // Rate Limiting
  // ============================================

  /**
   * Log a rate limit hit
   */
  async logRateLimitHit(apiKeyId: string, tier: string, requestCount: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO rate_limit_events (api_key_id, tier, request_count)
       VALUES ($1, $2, $3)`,
      [apiKeyId, tier, requestCount]
    );
  }

  // ============================================
  // User Operations
  // ============================================

  /**
   * Get or create user by Stripe customer ID
   */
  async getOrCreateUserByStripeId(
    stripeCustomerId: string,
    email: string
  ): Promise<{ id: string; email: string }> {
    const existing = await this.pool.query(
      `SELECT id, email FROM users WHERE stripe_customer_id = $1`,
      [stripeCustomerId]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const result = await this.pool.query(
      `INSERT INTO users (stripe_customer_id, email)
       VALUES ($1, $2)
       RETURNING id, email`,
      [stripeCustomerId, email]
    );

    return result.rows[0];
  }

  // ============================================
  // Stripe Events
  // ============================================

  /**
   * Check if a Stripe event has been processed
   */
  async isStripeEventProcessed(eventId: string): Promise<boolean> {
    const result = await this.pool.query(`SELECT 1 FROM stripe_events WHERE id = $1`, [eventId]);
    return result.rows.length > 0;
  }

  /**
   * Mark a Stripe event as processed
   */
  async markStripeEventProcessed(eventId: string, type: string, payload?: any): Promise<void> {
    await this.pool.query(
      `INSERT INTO stripe_events (id, type, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [eventId, type, payload ? JSON.stringify(payload) : null]
    );
  }
}
