import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConditionState } from '../src/condition-state';
import {
  fetchSiren,
  getConditionState,
  resetClient,
} from '../src/siren-client';
import type { BlockedResponse, ConditionsChangedDetail } from '../src/types';

const mockFetch = vi.fn();

beforeEach(() => {
  resetClient();
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : String(status),
    headers: { 'Content-Type': 'application/vnd.siren+json', ...headers },
  });
}

describe('ConditionState', () => {
  it('tracks conditions per entity', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['order.mutable', 'order.status.pending']);

    expect(state.has('order.mutable', '/orders/1')).toBe(true);
    expect(state.has('order.mutable', '/orders/2')).toBe(false);
    expect(state.get('/orders/1')).toEqual(['order.mutable', 'order.status.pending']);
    expect(state.get('/orders/2')).toEqual([]);
  });

  it('returns diff on update', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['order.mutable', 'order.status.pending']);

    const diff = state.update('/orders/1', ['order.mutable', 'order.status.processing']);
    expect(diff.added).toEqual(['order.status.processing']);
    expect(diff.removed).toEqual(['order.status.pending']);
  });

  it('checks across all entities when no entity specified', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['order.mutable']);
    state.update('/orders/2', ['order.status.shipped']);

    expect(state.has('order.mutable')).toBe(true);
    expect(state.has('order.status.shipped')).toBe(true);
    expect(state.has('nonexistent')).toBe(false);
  });

  it('merges all conditions when get() called without entity', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['a', 'b']);
    state.update('/orders/2', ['b', 'c']);

    const all = state.get();
    expect(all).toContain('a');
    expect(all).toContain('b');
    expect(all).toContain('c');
    expect(all).toHaveLength(3);
  });

  it('applySSE dispatches siren:conditions event', () => {
    const state = new ConditionState();
    const handler = vi.fn();
    document.addEventListener('siren:conditions', handler);

    state.applySSE({
      entity: '/orders/1',
      conditions: ['order.mutable', 'order.status.processing'],
      added: ['order.status.processing'],
      removed: [],
    });

    expect(handler).toHaveBeenCalledOnce();
    const detail: ConditionsChangedDetail = handler.mock.calls[0][0].detail;
    expect(detail.entity).toBe('/orders/1');
    expect(detail.added).toEqual(['order.mutable', 'order.status.processing']);

    document.removeEventListener('siren:conditions', handler);
  });

  it('applySSE does not dispatch when nothing changed', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['a', 'b']);

    const handler = vi.fn();
    document.addEventListener('siren:conditions', handler);

    state.applySSE({
      entity: '/orders/1',
      conditions: ['a', 'b'],
      added: [],
      removed: [],
    });

    expect(handler).not.toHaveBeenCalled();
    document.removeEventListener('siren:conditions', handler);
  });

  it('clear removes all state', () => {
    const state = new ConditionState();
    state.update('/orders/1', ['a']);
    state.clear();
    expect(state.get()).toEqual([]);
  });
});

describe('fetchSiren condition tracking', () => {
  it('tracks conditions from x-conditions header on 200', async () => {
    const entity = { class: ['order'], properties: { id: 1 } };
    mockFetch.mockResolvedValue(jsonResponse(entity, 200, {
      'x-conditions': 'order.mutable, order.status.pending',
    }));

    const handler = vi.fn();
    document.addEventListener('siren:conditions', handler);

    await fetchSiren('https://api.test/orders/1');

    expect(handler).toHaveBeenCalledOnce();
    const detail: ConditionsChangedDetail = handler.mock.calls[0][0].detail;
    expect(detail.entity).toBe('/orders/1');
    expect(detail.conditions).toEqual(['order.mutable', 'order.status.pending']);

    const state = getConditionState();
    expect(state.has('order.mutable', '/orders/1')).toBe(true);

    document.removeEventListener('siren:conditions', handler);
  });

  it('dispatches enriched siren:blocked on GRAIL 409', async () => {
    const blockedBody: BlockedResponse = {
      class: ['blocked'],
      properties: {
        status: 409,
        message: 'Payment required before shipping',
        blockedAction: 'ship',
        blockedCondition: 'order.paid',
        unmetConditions: ['order.paid'],
      },
      actions: [
        { name: 'pay', href: '/orders/1/pay', method: 'POST', effects: ['order.paid'] },
      ],
      'x-conditions': ['order.mutable', 'order.status.pending'],
    };
    mockFetch.mockResolvedValue(jsonResponse(blockedBody, 409));

    const handler = vi.fn();
    document.addEventListener('siren:blocked', handler);

    await fetchSiren('https://api.test/orders/1/ship');

    expect(handler).toHaveBeenCalledOnce();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.blockedAction).toBe('ship');
    expect(detail.blockedCondition).toBe('order.paid');
    expect(detail.unmetConditions).toEqual(['order.paid']);
    expect(detail.raw).toBeTruthy();
    expect(detail.offeredActions[0].effects).toEqual(['order.paid']);

    // Also tracked conditions from x-conditions in body
    const state = getConditionState();
    expect(state.has('order.mutable', '/orders/1/ship')).toBe(true);

    document.removeEventListener('siren:blocked', handler);
  });

  it('handles non-GRAIL 409 gracefully', async () => {
    const genericBody = { properties: { message: 'Conflict' } };
    mockFetch.mockResolvedValue(jsonResponse(genericBody, 409));

    const handler = vi.fn();
    document.addEventListener('siren:blocked', handler);

    await fetchSiren('https://api.test/orders/1/ship');

    const detail = handler.mock.calls[0][0].detail;
    expect(detail.blockedAction).toBeNull();
    expect(detail.blockedCondition).toBeNull();
    expect(detail.unmetConditions).toEqual([]);
    expect(detail.raw).toBeNull();

    document.removeEventListener('siren:blocked', handler);
  });

  it('resetClient clears condition state', async () => {
    const entity = { class: ['order'], properties: { id: 1 } };
    mockFetch.mockResolvedValue(jsonResponse(entity, 200, {
      'x-conditions': 'order.mutable',
    }));

    await fetchSiren('https://api.test/orders/1');
    expect(getConditionState().has('order.mutable')).toBe(true);

    resetClient();
    expect(getConditionState().get()).toEqual([]);
  });
});
