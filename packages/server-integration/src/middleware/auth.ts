/**
 * API Key Authentication Middleware
 *
 * Validates X-API-Key header and attaches user context to request.
 * Supports tiered access: free, pro, team
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import type { DatabaseClient } from '../db/client.js';

export interface ApiKeyRecord {
  id: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  stripeCustomerId: string | null;
  tier: 'free' | 'pro' | 'team';
  monthlyLimit: number;
  currentUsage: number;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface AuthenticatedRequest extends Request {
  apiKey?: ApiKeyRecord;
  userId?: string;
  tier?: 'free' | 'pro' | 'team';
}

/**
 * Hash an API key for secure storage/comparison
 */
export function hashApiKey(key: string, salt: string): string {
  return createHash('sha256')
    .update(key + salt)
    .digest('hex');
}

/**
 * Generate a new API key with prefix
 */
export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key = 'hfx_' + Buffer.from(bytes).toString('base64url');
  const prefix = key.substring(0, 12); // hfx_XXXXXXXX
  return { key, prefix };
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(db: DatabaseClient, salt: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    // Allow health check without auth
    if (req.path === '/health') {
      return next();
    }

    // Check for API key
    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing API key',
        message: 'Include X-API-Key header with your request',
        docs: 'https://hyperfixi.dev/docs/api-keys',
      });
    }

    // Validate format
    if (!apiKey.startsWith('hfx_')) {
      return res.status(401).json({
        error: 'Invalid API key format',
        message: 'API keys should start with "hfx_"',
      });
    }

    try {
      // Hash the key for lookup
      const keyHash = hashApiKey(apiKey, salt);

      // Look up the key in database
      const record = await db.getApiKeyByHash(keyHash);

      if (!record) {
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is not valid or has been revoked',
        });
      }

      // Check if key is active (not deleted)
      if ((record as any).deletedAt) {
        return res.status(401).json({
          error: 'API key revoked',
          message: 'This API key has been revoked',
        });
      }

      // Attach user context to request
      req.apiKey = record;
      req.userId = record.userId;
      req.tier = record.tier;

      // Update last used timestamp (async, don't block request)
      db.updateApiKeyLastUsed(record.id).catch(err => {
        console.error('Failed to update API key last used:', err);
      });

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'An error occurred while validating your API key',
      });
    }
  };
}

/**
 * Middleware to require specific tier
 */
export function requireTier(...allowedTiers: Array<'free' | 'pro' | 'team'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tier) {
      return res.status(401).json({
        error: 'Not authenticated',
      });
    }

    if (!allowedTiers.includes(req.tier)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This endpoint requires one of: ${allowedTiers.join(', ')}`,
        currentTier: req.tier,
        upgrade: 'https://hyperfixi.dev/pricing',
      });
    }

    next();
  };
}
