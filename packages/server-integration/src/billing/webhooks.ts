/**
 * Stripe Webhook Handlers
 *
 * Handles Stripe events for:
 * - Subscription lifecycle (created, updated, deleted)
 * - Invoice payments
 * - Customer updates
 */

import { Router, Request, Response } from 'express';
import type { DatabaseClient } from '../db/client.js';
import type { StripeClient } from './stripe.js';
import { generateApiKey, hashApiKey } from '../middleware/auth.js';
import type Stripe from 'stripe';

// Tier mapping from Stripe price IDs
const PRICE_TO_TIER: Record<string, 'free' | 'pro' | 'team'> = {
  [process.env.STRIPE_PRO_PRICE_ID || 'price_pro']: 'pro',
  [process.env.STRIPE_TEAM_PRICE_ID || 'price_team']: 'team',
};

const TIER_LIMITS: Record<string, number> = {
  free: 1000,
  pro: Infinity,
  team: Infinity,
};

/**
 * Create webhook router
 */
export function createWebhookRouter(
  db: DatabaseClient,
  stripe: StripeClient,
  webhookSecret: string,
  apiKeySalt: string
): Router {
  const router = Router();

  // Webhook endpoint - needs raw body for signature verification
  router.post(
    '/stripe',
    async (req: Request, res: Response) => {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature header' });
      }

      let event: Stripe.Event;

      try {
        // req.body should be raw buffer for webhook verification
        event = stripe.constructWebhookEvent(req.body, signature, webhookSecret);
      } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return res.status(400).json({ error: 'Invalid signature' });
      }

      // Check for duplicate events (idempotency)
      const alreadyProcessed = await db.isStripeEventProcessed(event.id);
      if (alreadyProcessed) {
        console.log(`Event ${event.id} already processed, skipping`);
        return res.json({ received: true, skipped: true });
      }

      console.log(`Processing Stripe event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case 'customer.subscription.created':
            await handleSubscriptionCreated(db, event.data.object as Stripe.Subscription, apiKeySalt);
            break;

          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(db, event.data.object as Stripe.Subscription);
            break;

          case 'customer.subscription.deleted':
            await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
            break;

          case 'invoice.paid':
            await handleInvoicePaid(db, event.data.object as Stripe.Invoice);
            break;

          case 'invoice.payment_failed':
            await handlePaymentFailed(db, event.data.object as Stripe.Invoice);
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        // Mark event as processed
        await db.markStripeEventProcessed(event.id, event.type);

        res.json({ received: true });
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        // Return 500 so Stripe retries
        res.status(500).json({ error: 'Event processing failed' });
      }
    }
  );

  return router;
}

/**
 * Handle new subscription created
 */
async function handleSubscriptionCreated(
  db: DatabaseClient,
  subscription: Stripe.Subscription,
  apiKeySalt: string
): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || 'pro';

  console.log(`New subscription: customer=${customerId}, tier=${tier}`);

  // Get or create user
  const customerEmail = (subscription as any).customer_email || `customer_${customerId}@hyperfixi.dev`;
  const user = await db.getOrCreateUserByStripeId(customerId, customerEmail);

  // Check if user already has an API key
  const existingKeys = await db.getApiKeysByUserId(user.id);

  if (existingKeys.length > 0) {
    // Upgrade existing key
    const key = existingKeys[0];
    await db.updateApiKeyTier(key.id, tier, TIER_LIMITS[tier]);
    console.log(`Upgraded API key ${key.keyPrefix} to ${tier}`);
  } else {
    // Create new API key
    const { key, prefix } = generateApiKey();
    const keyHash = hashApiKey(key, apiKeySalt);

    await db.createApiKey({
      keyHash,
      keyPrefix: prefix,
      userId: user.id,
      stripeCustomerId: customerId,
      tier,
      monthlyLimit: TIER_LIMITS[tier],
    });

    console.log(`Created new API key ${prefix} for ${tier} tier`);

    // TODO: Send welcome email with API key
    // This should be done via a queue/email service in production
  }
}

/**
 * Handle subscription updated (tier change)
 */
async function handleSubscriptionUpdated(
  db: DatabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || 'pro';

  console.log(`Subscription updated: customer=${customerId}, tier=${tier}`);

  // Find user's API keys and update tier
  const user = await db.getOrCreateUserByStripeId(customerId, `customer_${customerId}@hyperfixi.dev`);
  const keys = await db.getApiKeysByUserId(user.id);

  for (const key of keys) {
    await db.updateApiKeyTier(key.id, tier, TIER_LIMITS[tier]);
    console.log(`Updated API key ${key.keyPrefix} to ${tier}`);
  }
}

/**
 * Handle subscription canceled/deleted
 */
async function handleSubscriptionDeleted(
  db: DatabaseClient,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;

  console.log(`Subscription deleted: customer=${customerId}`);

  // Downgrade to free tier (don't delete keys)
  const user = await db.getOrCreateUserByStripeId(customerId, `customer_${customerId}@hyperfixi.dev`);
  const keys = await db.getApiKeysByUserId(user.id);

  for (const key of keys) {
    await db.updateApiKeyTier(key.id, 'free', TIER_LIMITS.free);
    console.log(`Downgraded API key ${key.keyPrefix} to free`);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(db: DatabaseClient, invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  console.log(`Invoice paid: customer=${customerId}, amount=${invoice.amount_paid / 100}`);

  // Reset monthly usage counter on billing cycle
  const user = await db.getOrCreateUserByStripeId(customerId, `customer_${customerId}@hyperfixi.dev`);
  const keys = await db.getApiKeysByUserId(user.id);

  for (const key of keys) {
    await db.incrementApiKeyUsage(key.id, -key.currentUsage); // Reset to 0
    console.log(`Reset usage for API key ${key.keyPrefix}`);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(db: DatabaseClient, invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  console.log(`Payment failed: customer=${customerId}`);

  // TODO: Send payment failed notification
  // TODO: Consider grace period before downgrade
}
