import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchSiren,
  getCurrentEntity,
  getCurrentUrl,
  setCurrentEntity,
  resetClient,
} from '../src/siren-client';
import type { SirenEntity } from '../src/types';

// Mock fetch globally
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

const sampleEntity: SirenEntity = {
  class: ['order'],
  properties: { status: 'pending', total: 42 },
  actions: [
    { name: 'ship', href: '/orders/1/ship', method: 'POST' },
  ],
  links: [
    { rel: ['self'], href: '/orders/1' },
    { rel: ['collection'], href: '/orders' },
  ],
};

describe('siren-client', () => {
  describe('fetchSiren', () => {
    it('fetches and stores a 200 entity', async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleEntity));

      const result = await fetchSiren('https://api.test/orders/1');

      expect(result).toEqual(sampleEntity);
      expect(getCurrentEntity()).toEqual(sampleEntity);
      expect(getCurrentUrl()).toBeTruthy();
    });

    it('sets Accept header to application/vnd.siren+json', async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleEntity));

      await fetchSiren('https://api.test/orders/1');

      const [, opts] = mockFetch.mock.calls[0];
      const headers = new Headers(opts.headers);
      expect(headers.get('Accept')).toBe('application/vnd.siren+json');
    });

    it('preserves existing Accept header', async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleEntity));

      await fetchSiren('https://api.test/orders/1', {
        headers: { 'Accept': 'application/json' },
      });

      const [, opts] = mockFetch.mock.calls[0];
      const headers = new Headers(opts.headers);
      expect(headers.get('Accept')).toBe('application/json');
    });

    it('returns null for 204 No Content', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

      const result = await fetchSiren('https://api.test/orders/1');
      expect(result).toBeNull();
    });

    it('follows 201 + Location redirect', async () => {
      const createdResponse = new Response(null, {
        status: 201,
        headers: { Location: '/orders/42' },
      });
      mockFetch
        .mockResolvedValueOnce(createdResponse)
        .mockResolvedValueOnce(jsonResponse(sampleEntity));

      const result = await fetchSiren('https://api.test/orders');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(sampleEntity);
    });

    it('dispatches siren:blocked on 409', async () => {
      const blockedEntity: SirenEntity = {
        properties: { message: 'Payment required' },
        actions: [{ name: 'pay', href: '/orders/1/pay', method: 'POST' }],
      };
      mockFetch.mockResolvedValue(jsonResponse(blockedEntity, 409));

      const handler = vi.fn();
      document.addEventListener('siren:blocked', handler);

      const result = await fetchSiren('https://api.test/orders/1/ship');

      expect(result).toBeNull();
      expect(handler).toHaveBeenCalledOnce();
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.message).toBe('Payment required');
      expect(detail.offeredActions).toHaveLength(1);
      expect(detail.offeredActions[0].name).toBe('pay');

      document.removeEventListener('siren:blocked', handler);
    });

    it('dispatches siren:error on 500', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 500, statusText: 'Internal Server Error' }));

      const handler = vi.fn();
      document.addEventListener('siren:error', handler);

      await expect(fetchSiren('https://api.test/orders')).rejects.toThrow('500');

      expect(handler).toHaveBeenCalledOnce();
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.status).toBe(500);
      expect(detail.transient).toBe(true);

      document.removeEventListener('siren:error', handler);
    });

    it('dispatches siren:error on network failure', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const handler = vi.fn();
      document.addEventListener('siren:error', handler);

      await expect(fetchSiren('https://api.test/down')).rejects.toThrow('Failed to fetch');

      expect(handler).toHaveBeenCalledOnce();
      const detail = handler.mock.calls[0][0].detail;
      expect(detail.status).toBe(0);
      expect(detail.transient).toBe(true);

      document.removeEventListener('siren:error', handler);
    });

    it('dispatches siren:entity with previousUrl', async () => {
      mockFetch.mockResolvedValue(jsonResponse(sampleEntity));

      // First fetch
      await fetchSiren('https://api.test/orders/1');

      const handler = vi.fn();
      document.addEventListener('siren:entity', handler);

      // Second fetch
      const entity2: SirenEntity = { properties: { id: 2 } };
      mockFetch.mockResolvedValue(jsonResponse(entity2));
      await fetchSiren('https://api.test/orders/2');

      const detail = handler.mock.calls[0][0].detail;
      expect(detail.entity).toEqual(entity2);

      document.removeEventListener('siren:entity', handler);
    });

    it('classifies 4xx errors as non-transient', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 404, statusText: 'Not Found' }));

      const handler = vi.fn();
      document.addEventListener('siren:error', handler);

      await expect(fetchSiren('https://api.test/missing')).rejects.toThrow('404');

      const detail = handler.mock.calls[0][0].detail;
      expect(detail.transient).toBe(false);

      document.removeEventListener('siren:error', handler);
    });
  });

  describe('setCurrentEntity', () => {
    it('updates state and fires event', () => {
      const handler = vi.fn();
      document.addEventListener('siren:entity', handler);

      setCurrentEntity(sampleEntity, 'https://api.test/orders/1');

      expect(getCurrentEntity()).toBe(sampleEntity);
      expect(getCurrentUrl()).toBe('https://api.test/orders/1');
      expect(handler).toHaveBeenCalledOnce();

      document.removeEventListener('siren:entity', handler);
    });
  });

  describe('resetClient', () => {
    it('clears entity and URL', () => {
      setCurrentEntity(sampleEntity, 'https://api.test/orders/1');
      resetClient();

      expect(getCurrentEntity()).toBeNull();
      expect(getCurrentUrl()).toBeNull();
    });
  });
});
