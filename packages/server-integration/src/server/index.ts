/**
 * HyperFixi API Server Entry Point
 *
 * Production-ready server with:
 * - API key authentication
 * - Usage tracking (Stripe Meters)
 * - Rate limiting
 * - PostgreSQL for state
 */

import { HyperfixiService } from '../service/hyperfixi-service.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';
import { createUsageMiddleware } from '../middleware/usage.js';
import { DatabaseClient } from '../db/client.js';
import { StripeClient } from '../billing/stripe.js';
import type { ServiceConfig } from '../types.js';

// Load configuration from environment
function loadConfig(): ServiceConfig & {
  databaseUrl?: string;
  stripeSecretKey?: string;
  apiKeySalt?: string;
} {
  return {
    port: parseInt(process.env.PORT || '8080', 10),
    host: process.env.HOST || '0.0.0.0',
    cache: {
      enabled: process.env.CACHE_ENABLED !== 'false',
      maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
      ttl: parseInt(process.env.CACHE_TTL || '300000', 10), // 5 minutes default
    },
    cors: {
      enabled: true,
      origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
    },
    security: {
      helmet: true,
      compression: true,
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      },
    },
    // Extended config
    databaseUrl: process.env.DATABASE_URL,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    apiKeySalt: process.env.API_KEY_SALT,
  };
}

async function main() {
  const config = loadConfig();

  console.log('Starting HyperFixi API Server...');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize database (optional in dev mode)
  let db: DatabaseClient | undefined;
  if (config.databaseUrl) {
    console.log('Connecting to database...');
    db = new DatabaseClient(config.databaseUrl);
    await db.connect();
    console.log('Database connected');
  } else {
    console.warn('DATABASE_URL not set - running without persistence');
  }

  // Initialize Stripe (optional in dev mode)
  let stripe: StripeClient | undefined;
  if (config.stripeSecretKey) {
    console.log('Initializing Stripe...');
    stripe = new StripeClient(config.stripeSecretKey);
    console.log('Stripe initialized');
  } else {
    console.warn('STRIPE_SECRET_KEY not set - running without billing');
  }

  // Create the service
  const service = new HyperfixiService(config);

  // Get the underlying Express app to add middleware
  const app = (service as any).app;

  // Add auth middleware (before routes, after built-in middleware)
  if (db && config.apiKeySalt) {
    const authMiddleware = createAuthMiddleware(db, config.apiKeySalt);
    // Insert auth after JSON parsing but before routes
    app.use('/compile', authMiddleware);
    app.use('/validate', authMiddleware);
    app.use('/batch', authMiddleware);
  }

  // Add rate limiting
  if (config.security.rateLimit && db) {
    const rateLimitMiddleware = createRateLimitMiddleware(db, config.security.rateLimit);
    app.use('/compile', rateLimitMiddleware);
    app.use('/validate', rateLimitMiddleware);
    app.use('/batch', rateLimitMiddleware);
  }

  // Add usage tracking
  if (db && stripe) {
    const usageMiddleware = createUsageMiddleware(db, stripe);
    app.use('/compile', usageMiddleware);
    app.use('/batch', usageMiddleware);
  }

  // Start the server
  await service.start();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await service.stop();
    if (db) {
      await db.disconnect();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
