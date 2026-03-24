import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchConditionMap } from '../src/fetch-condition-map';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchConditionMap', () => {
  it('parses condition registry response', async () => {
    const body = {
      class: ['condition-registry'],
      properties: {
        conditions: {
          'order.mutable': {
            description: 'Order is mutable',
            producedBy: [],
            requiredBy: ['update-order'],
          },
          'order.status.pending': {
            description: 'Status is pending',
            producedBy: ['update-order'],
            requiredBy: [],
          },
        },
      },
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

    const map = await fetchConditionMap('https://api.test/conditions');
    expect(map['order.mutable'].requiredBy).toEqual(['update-order']);
    expect(map['order.status.pending'].producedBy).toEqual(['update-order']);
  });

  it('sends Accept: application/json header', async () => {
    const body = { properties: { conditions: {} } };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

    await fetchConditionMap('https://api.test/conditions');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.headers.Accept).toBe('application/json');
  });

  it('throws on non-2xx response', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' }));

    await expect(fetchConditionMap('https://api.test/conditions')).rejects.toThrow(
      'fetchConditionMap: 404 Not Found',
    );
  });

  it('throws on missing conditions property', async () => {
    const body = { properties: { other: 'data' } };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

    await expect(fetchConditionMap('https://api.test/conditions')).rejects.toThrow(
      'response missing properties.conditions',
    );
  });

  it('throws on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchConditionMap('https://api.test/conditions')).rejects.toThrow(
      'Network error',
    );
  });
});
