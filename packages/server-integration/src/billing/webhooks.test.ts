/**
 * Stripe Webhook Handler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createWebhookRouter } from './webhooks.js';
import type Stripe from 'stripe';

describe('Stripe Webhook Handlers', () => {
  // Mock database client
  const mockDb = {
    isStripeEventProcessed: vi.fn().mockResolvedValue(false),
    markStripeEventProcessed: vi.fn().mockResolvedValue(undefined),
    getOrCreateUserByStripeId: vi.fn().mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
    getApiKeysByUserId: vi.fn().mockResolvedValue([]),
    createApiKey: vi.fn().mockResolvedValue({ id: 'key-123' }),
    updateApiKeyTier: vi.fn().mockResolvedValue(undefined),
    incrementApiKeyUsage: vi.fn().mockResolvedValue(undefined),
  };

  // Mock Stripe client
  const mockStripe = {
    constructWebhookEvent: vi.fn(),
  };

  const webhookSecret = 'whsec_test123';
  const apiKeySalt = 'test-salt-12345';

  // Helper to create mock request
  function createMockRequest(
    body: any = {},
    headers: Record<string, string> = {}
  ): Request {
    return {
      body,
      headers: {
        'stripe-signature': 'sig_test123',
        ...headers,
      },
    } as unknown as Request;
  }

  // Helper to create mock response
  function createMockResponse(): Response & { _body?: any; _status?: number } {
    const res: Partial<Response> & { _body?: any; _status?: number } = {
      status: vi.fn(function (this: any, code: number) {
        this._status = code;
        return this;
      }),
      json: vi.fn(function (this: any, body: any) {
        this._body = body;
        return this;
      }),
    };
    return res as Response & { _body?: any; _status?: number };
  }

  // Helper to create Stripe event
  function createStripeEvent(
    type: string,
    data: any,
    id: string = 'evt_test123'
  ): Stripe.Event {
    return {
      id,
      type,
      data: { object: data },
      object: 'event',
      api_version: '2025-02-24.acacia',
      created: Date.now() / 1000,
      livemode: false,
      pending_webhooks: 0,
      request: null,
    } as unknown as Stripe.Event;
  }

  // Helper to create subscription object
  function createSubscription(
    customerId: string = 'cus_test123',
    priceId: string = 'price_pro'
  ): Stripe.Subscription {
    return {
      id: 'sub_test123',
      customer: customerId,
      items: {
        data: [
          {
            price: { id: priceId },
          },
        ],
      },
      customer_email: 'test@example.com',
    } as unknown as Stripe.Subscription;
  }

  // Helper to create invoice object
  function createInvoice(
    customerId: string = 'cus_test123',
    amountPaid: number = 2900
  ): Stripe.Invoice {
    return {
      id: 'in_test123',
      customer: customerId,
      amount_paid: amountPaid,
    } as unknown as Stripe.Invoice;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.isStripeEventProcessed.mockResolvedValue(false);
    mockDb.getApiKeysByUserId.mockResolvedValue([]);
  });

  describe('Signature Verification', () => {
    it('should return 400 if stripe-signature header is missing', async () => {
      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({}, { 'stripe-signature': '' });
      delete (req.headers as any)['stripe-signature'];
      const res = createMockResponse();

      // Get the handler
      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'Missing stripe-signature header' });
    });

    it('should return 400 if signature verification fails', async () => {
      mockStripe.constructWebhookEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({ payload: 'test' });
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'Invalid signature' });
    });

    it('should call constructWebhookEvent with correct parameters', async () => {
      const event = createStripeEvent('test.event', {});
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest(Buffer.from('raw-body'));
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockStripe.constructWebhookEvent).toHaveBeenCalledWith(
        Buffer.from('raw-body'),
        'sig_test123',
        webhookSecret
      );
    });
  });

  describe('Idempotency', () => {
    it('should skip already processed events', async () => {
      const event = createStripeEvent('customer.subscription.created', createSubscription());
      mockStripe.constructWebhookEvent.mockReturnValue(event);
      mockDb.isStripeEventProcessed.mockResolvedValue(true);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._body).toEqual({ received: true, skipped: true });
      expect(mockDb.getOrCreateUserByStripeId).not.toHaveBeenCalled();
    });

    it('should mark event as processed after handling', async () => {
      const event = createStripeEvent('customer.subscription.created', createSubscription(), 'evt_unique');
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.markStripeEventProcessed).toHaveBeenCalledWith('evt_unique', 'customer.subscription.created');
    });
  });

  describe('customer.subscription.created', () => {
    it('should create new API key for new subscriber', async () => {
      const subscription = createSubscription('cus_new', 'price_pro');
      const event = createStripeEvent('customer.subscription.created', subscription);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.createApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          stripeCustomerId: 'cus_new',
          tier: 'pro',
        })
      );
      expect(res._body).toEqual({ received: true });
    });

    it('should upgrade existing API key for existing subscriber', async () => {
      const existingKey = {
        id: 'key-existing',
        keyPrefix: 'hfx_exist12',
        tier: 'free',
        monthlyLimit: 1000,
        currentUsage: 0,
      };
      mockDb.getApiKeysByUserId.mockResolvedValue([existingKey]);

      const subscription = createSubscription('cus_upgrade', 'price_team');
      const event = createStripeEvent('customer.subscription.created', subscription);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.updateApiKeyTier).toHaveBeenCalledWith('key-existing', 'team', Infinity);
      expect(mockDb.createApiKey).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('should update tier for all user API keys', async () => {
      const existingKeys = [
        { id: 'key-1', keyPrefix: 'hfx_key1' },
        { id: 'key-2', keyPrefix: 'hfx_key2' },
      ];
      mockDb.getApiKeysByUserId.mockResolvedValue(existingKeys);

      const subscription = createSubscription('cus_update', 'price_team');
      const event = createStripeEvent('customer.subscription.updated', subscription);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.updateApiKeyTier).toHaveBeenCalledTimes(2);
      expect(mockDb.updateApiKeyTier).toHaveBeenCalledWith('key-1', 'team', Infinity);
      expect(mockDb.updateApiKeyTier).toHaveBeenCalledWith('key-2', 'team', Infinity);
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should downgrade all user API keys to free tier', async () => {
      const existingKeys = [
        { id: 'key-1', keyPrefix: 'hfx_key1', tier: 'pro' },
      ];
      mockDb.getApiKeysByUserId.mockResolvedValue(existingKeys);

      const subscription = createSubscription('cus_cancel');
      const event = createStripeEvent('customer.subscription.deleted', subscription);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.updateApiKeyTier).toHaveBeenCalledWith('key-1', 'free', 1000);
    });
  });

  describe('invoice.paid', () => {
    it('should reset usage counters on payment', async () => {
      const existingKeys = [
        { id: 'key-1', keyPrefix: 'hfx_key1', currentUsage: 500 },
      ];
      mockDb.getApiKeysByUserId.mockResolvedValue(existingKeys);

      const invoice = createInvoice('cus_paid', 2900);
      const event = createStripeEvent('invoice.paid', invoice);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.incrementApiKeyUsage).toHaveBeenCalledWith('key-1', -500);
    });
  });

  describe('invoice.payment_failed', () => {
    it('should handle payment failure gracefully', async () => {
      const invoice = createInvoice('cus_failed');
      const event = createStripeEvent('invoice.payment_failed', invoice);
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._body).toEqual({ received: true });
    });
  });

  describe('Unhandled events', () => {
    it('should acknowledge unhandled event types', async () => {
      const event = createStripeEvent('unknown.event.type', { foo: 'bar' });
      mockStripe.constructWebhookEvent.mockReturnValue(event);

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._body).toEqual({ received: true });
      expect(mockDb.markStripeEventProcessed).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on processing error', async () => {
      const event = createStripeEvent('customer.subscription.created', createSubscription());
      mockStripe.constructWebhookEvent.mockReturnValue(event);
      mockDb.getOrCreateUserByStripeId.mockRejectedValue(new Error('Database error'));

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(res._status).toBe(500);
      expect(res._body).toEqual({ error: 'Event processing failed' });
    });

    it('should not mark event as processed on error', async () => {
      const event = createStripeEvent('customer.subscription.created', createSubscription(), 'evt_error');
      mockStripe.constructWebhookEvent.mockReturnValue(event);
      mockDb.getOrCreateUserByStripeId.mockRejectedValue(new Error('Database error'));

      const router = createWebhookRouter(mockDb as any, mockStripe as any, webhookSecret, apiKeySalt);
      const req = createMockRequest({});
      const res = createMockResponse();

      const handler = (router.stack[0].route.stack[0] as any).handle;
      await handler(req, res);

      expect(mockDb.markStripeEventProcessed).not.toHaveBeenCalled();
    });
  });
});
