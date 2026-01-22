/**
 * Stripe Billing Integration
 *
 * Handles:
 * - Usage-based billing with Stripe Meters (2024 API)
 * - Subscription management
 * - Customer creation
 */

import Stripe from 'stripe';

// Meter event name for compilation tracking
const METER_EVENT_NAME = 'hyperfixi_compile';

// Tier configuration
export const TIER_CONFIG = {
  free: {
    priceId: null, // No subscription needed
    monthlyLimit: 1000,
    overageRate: 0, // No overage - blocked
  },
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
    monthlyLimit: Infinity,
    overageRate: 0.001, // $0.001 per compile
  },
  team: {
    priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team',
    monthlyLimit: Infinity,
    overageRate: 0.0005, // $0.0005 per compile
  },
} as const;

export class StripeClient {
  private stripe: Stripe;
  private meterId: string | null = null;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  /**
   * Initialize the meter (call once on startup)
   */
  async initializeMeter(): Promise<string> {
    // Check if meter already exists
    const meters = await this.stripe.billing.meters.list({ limit: 10 });
    const existingMeter = meters.data.find(m => m.event_name === METER_EVENT_NAME);

    if (existingMeter) {
      this.meterId = existingMeter.id;
      console.log(`Using existing meter: ${this.meterId}`);
      return this.meterId;
    }

    // Create new meter
    const meter = await this.stripe.billing.meters.create({
      display_name: 'LokaScript Compilations',
      event_name: METER_EVENT_NAME,
      default_aggregation: { formula: 'sum' },
    });

    this.meterId = meter.id;
    console.log(`Created new meter: ${this.meterId}`);
    return this.meterId;
  }

  /**
   * Report usage to Stripe Meters
   */
  async reportUsage(customerId: string, count: number): Promise<void> {
    if (!customerId || count <= 0) return;

    try {
      await this.stripe.billing.meterEvents.create({
        event_name: METER_EVENT_NAME,
        payload: {
          value: count.toString(),
          stripe_customer_id: customerId,
        },
        timestamp: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      // Log but don't throw - usage reporting shouldn't break the API
      console.error('Failed to report usage to Stripe:', error);
    }
  }

  /**
   * Create a new Stripe customer
   */
  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata: {
        source: 'lokascript_api',
      },
    });
  }

  /**
   * Get a customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer.deleted ? null : (customer as Stripe.Customer);
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    tier: 'pro' | 'team',
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const priceId = TIER_CONFIG[tier].priceId;
    if (!priceId) {
      throw new Error(`No price configured for tier: ${tier}`);
    }

    return this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier,
      },
    });
  }

  /**
   * Create a billing portal session
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Get customer's active subscription
   */
  async getActiveSubscription(customerId: string): Promise<Stripe.Subscription | null> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    return subscriptions.data[0] || null;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Construct webhook event from request
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  /**
   * Get usage summary for a customer
   */
  async getUsageSummary(customerId: string): Promise<{
    periodStart: Date;
    periodEnd: Date;
    totalUsage: number;
  } | null> {
    if (!this.meterId) {
      await this.initializeMeter();
    }

    try {
      const summaries = await this.stripe.billing.meters.listEventSummaries(this.meterId!, {
        customer: customerId,
        start_time: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60, // Last 30 days
        end_time: Math.floor(Date.now() / 1000),
      });

      if (summaries.data.length === 0) {
        return null;
      }

      const summary = summaries.data[0];
      return {
        periodStart: new Date(summary.start_time * 1000),
        periodEnd: new Date(summary.end_time * 1000),
        totalUsage: summary.aggregated_value,
      };
    } catch (error) {
      console.error('Failed to get usage summary:', error);
      return null;
    }
  }
}
