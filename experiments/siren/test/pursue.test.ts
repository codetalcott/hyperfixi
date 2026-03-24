import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pursueReactive, executeProactivePlan, pursue } from '../src/pursue';
import { setCurrentEntity, resetClient } from '../src/siren-client';
import { createPlanStep } from '../src/planner';
import type { SirenAction, BlockedResponse } from '../src/types';

const mockFetch = vi.fn();

beforeEach(() => {
  resetClient();
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Helpers

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : String(status),
    headers: { 'Content-Type': 'application/vnd.siren+json' },
  });
}

function blocked409(
  blockedAction: string,
  blockedCondition: string,
  offeredActions: SirenAction[] = [],
): Response {
  const body: BlockedResponse = {
    class: ['error', 'blocked'],
    properties: {
      status: 409,
      message: `Cannot ${blockedAction}: ${blockedCondition} not met`,
      blockedAction,
      blockedCondition,
    },
    actions: offeredActions,
  };
  return jsonResponse(body, 409);
}

const SHIP_ACTION: SirenAction = {
  name: 'ship-order',
  href: '/orders/1/ship',
  method: 'POST',
  preconditions: ['order.status.processing', 'order.items.nonempty'],
  effects: ['order.status.shipped'],
  cost: 2,
};

const PAY_ACTION: SirenAction = {
  name: 'pay',
  href: '/orders/1/pay',
  method: 'POST',
  effects: ['order.paid'],
  cost: 1,
};

const UPDATE_ACTION: SirenAction = {
  name: 'update-order',
  href: '/orders/1',
  method: 'PUT',
  preconditions: ['order.mutable'],
  effects: ['order.status.processing'],
  cost: 1,
  fields: [{ name: 'status', type: 'text', value: 'processing' }],
};

function setupEntity(): void {
  setCurrentEntity(
    {
      class: ['order'],
      properties: { id: 1 },
      actions: [SHIP_ACTION, PAY_ACTION, UPDATE_ACTION],
    },
    'https://api.test/orders/1',
  );
}

// ---------------------------------------------------------------------------
// pursueReactive
// ---------------------------------------------------------------------------

describe('pursueReactive', () => {
  it('succeeds when action executes directly', async () => {
    setupEntity();
    const successEntity = { class: ['order'], properties: { status: 'shipped' } };
    mockFetch.mockResolvedValue(jsonResponse(successEntity));

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('success');
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toEqual({ action: 'ship-order', status: 'success' });
  });

  it('chains through single 409 hop', async () => {
    setupEntity();

    // First call (ship-order) → 409, offered: pay
    mockFetch.mockResolvedValueOnce(
      blocked409('ship-order', 'order.paid', [PAY_ACTION]),
    );
    // Second call (pay) → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'paid' } }),
    );
    // Third call (retry ship-order) → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' } }),
    );

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('success');
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].status).toBe('blocked');
    expect(result.steps[0].offeredAction).toBe('pay');
    expect(result.steps[1]).toEqual({ action: 'pay', status: 'success' });
    expect(result.steps[2]).toEqual({ action: 'ship-order', status: 'success' });
  });

  it('handles terminal block (no offered actions)', async () => {
    setupEntity();
    mockFetch.mockResolvedValue(blocked409('ship-order', 'order.approved', []));

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('failure');
    expect(result.steps[0].status).toBe('terminal');
    expect(result.reason).toContain('order.approved');
  });

  it('detects cycles', async () => {
    setupEntity();
    // ship-order → 409, offered: ship-order (cycle)
    mockFetch.mockResolvedValue(
      blocked409('ship-order', 'order.paid', [SHIP_ACTION]),
    );

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('failure');
    expect(result.steps[0].status).toBe('cycle');
    expect(result.reason).toContain('Cycle detected');
  });

  it('respects maxDepth', async () => {
    setupEntity();

    // Create a chain that exceeds depth 2
    const actionA: SirenAction = { name: 'a', href: '/a', method: 'POST' };
    const actionB: SirenAction = { name: 'b', href: '/b', method: 'POST' };
    const actionC: SirenAction = { name: 'c', href: '/c', method: 'POST' };

    // goal → 409 offered a → 409 offered b → depth exceeded (maxDepth=2)
    mockFetch.mockResolvedValueOnce(blocked409('goal', 'cond1', [actionA]));
    mockFetch.mockResolvedValueOnce(blocked409('a', 'cond2', [actionB]));

    const goalAction: SirenAction = { name: 'goal', href: '/goal', method: 'POST' };
    const result = await pursueReactive(goalAction, {}, { maxDepth: 2 });
    expect(result.status).toBe('failure');
    expect(result.steps.some(s => s.status === 'depth-exceeded')).toBe(true);
  });

  it('handles non-409 errors', async () => {
    setupEntity();
    mockFetch.mockResolvedValue(
      new Response('Server Error', { status: 500, statusText: 'Internal Server Error' }),
    );

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('failure');
    expect(result.steps[0].status).toBe('error');
  });

  it('handles network errors', async () => {
    setupEntity();
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const result = await pursueReactive(SHIP_ACTION);
    expect(result.status).toBe('failure');
    expect(result.steps[0].status).toBe('error');
    expect(result.steps[0].error).toContain('Network failure');
  });

  it('uses pre-filled field values from offered actions', async () => {
    setupEntity();
    mockFetch.mockResolvedValueOnce(
      blocked409('ship-order', 'order.status.processing', [UPDATE_ACTION]),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'processing' } }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' } }),
    );

    await pursueReactive(SHIP_ACTION);

    // Second call should be update-order with pre-filled status=processing
    const [, opts] = mockFetch.mock.calls[1];
    const body = JSON.parse(opts.body);
    expect(body.status).toBe('processing');
  });
});

// ---------------------------------------------------------------------------
// executeProactivePlan
// ---------------------------------------------------------------------------

describe('executeProactivePlan', () => {
  it('executes all steps in sequence', async () => {
    setupEntity();

    // Step 1: pay → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { paid: true }, actions: [SHIP_ACTION, PAY_ACTION, UPDATE_ACTION] }),
    );
    // Step 2: ship-order → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' } }),
    );

    const plan = [createPlanStep('pay'), createPlanStep('ship-order')];
    const result = await executeProactivePlan(plan);

    expect(result.status).toBe('success');
    expect(result.steps).toHaveLength(2);
    expect(result.steps.map(s => s.action)).toEqual(['pay', 'ship-order']);
  });

  it('falls back to reactive on 409 during plan', async () => {
    setupEntity();

    // Step 1: pay → 409 with offered action
    mockFetch.mockResolvedValueOnce(
      blocked409('pay', 'payment.method', [
        { name: 'add-card', href: '/cards', method: 'POST' },
      ]),
    );
    // Reactive: add-card → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['card'], properties: {} }),
    );
    // Reactive: retry ship-order → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' }, actions: [SHIP_ACTION] }),
    );

    const plan = [createPlanStep('pay'), createPlanStep('ship-order')];
    const result = await executeProactivePlan(plan);

    // Should have the blocked step from proactive, then reactive steps
    expect(result.steps[0].status).toBe('blocked');
  });

  it('returns failure when no current entity', async () => {
    // Don't call setupEntity — no current entity
    const plan = [createPlanStep('pay')];
    const result = await executeProactivePlan(plan);
    expect(result.status).toBe('failure');
    expect(result.reason).toBe('No current entity');
  });
});

// ---------------------------------------------------------------------------
// pursue (entry point)
// ---------------------------------------------------------------------------

describe('pursue', () => {
  it('returns failure when no current entity', async () => {
    const result = await pursue('ship-order');
    expect(result.status).toBe('failure');
    expect(result.reason).toBe('No current entity');
  });

  it('returns failure when action not found', async () => {
    setupEntity();
    const result = await pursue('nonexistent');
    expect(result.status).toBe('failure');
    expect(result.reason).toContain("'nonexistent' not found");
  });

  it('delegates to pursueReactive by default', async () => {
    setupEntity();
    mockFetch.mockResolvedValue(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' } }),
    );

    const result = await pursue('ship-order');
    expect(result.status).toBe('success');
    expect(result.steps[0].action).toBe('ship-order');
  });

  it('uses proactive planning when option set with condition map', async () => {
    setupEntity();

    const conditionMap = {
      'order.paid': {
        description: 'Order is paid',
        producedBy: ['pay'],
        requiredBy: ['ship-order'],
      },
    };

    // pay → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { paid: true }, actions: [SHIP_ACTION, PAY_ACTION] }),
    );
    // ship-order → 200
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ class: ['order'], properties: { status: 'shipped' } }),
    );

    const result = await pursue('ship-order', {}, {
      proactive: true,
      conditionMap,
    });

    expect(result.status).toBe('success');
  });
});
