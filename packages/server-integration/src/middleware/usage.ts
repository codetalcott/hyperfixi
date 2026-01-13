/**
 * Usage Tracking Middleware
 *
 * Tracks compilation usage for billing:
 * - Logs to PostgreSQL for audit trail
 * - Batches events to Stripe Meters every 60 seconds
 */

import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import type { DatabaseClient } from '../db/client.js';
import type { StripeClient } from '../billing/stripe.js';

// In-memory usage buffer for batching
const usageBuffer = new Map<
  string,
  {
    customerId: string;
    compileCount: number;
    scriptCount: number;
  }
>();

// Flush interval (60 seconds)
let flushInterval: NodeJS.Timeout | null = null;

/**
 * Start the usage flusher
 */
function startFlusher(db: DatabaseClient, stripe: StripeClient) {
  if (flushInterval) return;

  flushInterval = setInterval(async () => {
    await flushUsageBuffer(db, stripe);
  }, 60000); // Flush every 60 seconds

  // Ensure flush on process exit
  process.on('beforeExit', async () => {
    await flushUsageBuffer(db, stripe);
  });
}

/**
 * Flush buffered usage to Stripe
 */
async function flushUsageBuffer(db: DatabaseClient, stripe: StripeClient) {
  if (usageBuffer.size === 0) return;

  console.log(`Flushing usage buffer (${usageBuffer.size} entries)...`);

  const entries = Array.from(usageBuffer.entries());
  usageBuffer.clear();

  for (const [keyId, usage] of entries) {
    if (!usage.customerId) continue;

    try {
      // Report to Stripe
      await stripe.reportUsage(usage.customerId, usage.compileCount);

      // Update monthly aggregate in database
      await db.updateMonthlyUsage(keyId, usage.compileCount, usage.scriptCount);

      console.log(
        `Reported usage for ${keyId}: ${usage.compileCount} compiles, ${usage.scriptCount} scripts`
      );
    } catch (error) {
      console.error(`Failed to report usage for ${keyId}:`, error);

      // Re-add to buffer for retry
      const existing = usageBuffer.get(keyId);
      if (existing) {
        existing.compileCount += usage.compileCount;
        existing.scriptCount += usage.scriptCount;
      } else {
        usageBuffer.set(keyId, usage);
      }
    }
  }
}

/**
 * Create usage tracking middleware
 */
export function createUsageMiddleware(db: DatabaseClient, stripe: StripeClient) {
  // Start the flusher
  startFlusher(db, stripe);

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Skip if not authenticated
    if (!req.apiKey) {
      return next();
    }

    // Capture response to count results
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    res.json = (body: any) => {
      // Count scripts in response
      let scriptCount = 0;
      let compileCount = 1; // Each request counts as 1 compile

      if (body.compiled && typeof body.compiled === 'object') {
        scriptCount = Object.keys(body.compiled).length;
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Log to database (async, don't block response)
      logUsage(db, req, scriptCount, responseTime, body.errors?.length || 0);

      // Add to buffer for Stripe
      bufferUsage(req.apiKey!.id, req.apiKey!.stripeCustomerId || '', compileCount, scriptCount);

      return originalJson(body);
    };

    next();
  };
}

/**
 * Log usage to database
 */
async function logUsage(
  db: DatabaseClient,
  req: AuthenticatedRequest,
  scriptCount: number,
  responseTimeMs: number,
  errorCount: number
) {
  try {
    await db.logUsage({
      apiKeyId: req.apiKey!.id,
      endpoint: req.path,
      method: req.method,
      scriptCount,
      responseTimeMs,
      errorCount,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}

/**
 * Buffer usage for Stripe reporting
 */
function bufferUsage(keyId: string, customerId: string, compileCount: number, scriptCount: number) {
  const existing = usageBuffer.get(keyId);

  if (existing) {
    existing.compileCount += compileCount;
    existing.scriptCount += scriptCount;
  } else {
    usageBuffer.set(keyId, {
      customerId,
      compileCount,
      scriptCount,
    });
  }
}

/**
 * Get current buffered usage for an API key
 */
export function getBufferedUsage(keyId: string) {
  return usageBuffer.get(keyId) || { compileCount: 0, scriptCount: 0 };
}

/**
 * Force flush the usage buffer (for testing/shutdown)
 */
export async function forceFlush(db: DatabaseClient, stripe: StripeClient) {
  await flushUsageBuffer(db, stripe);
}
