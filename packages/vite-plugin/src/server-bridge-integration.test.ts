import { describe, it, expect, vi, beforeEach } from 'vitest';
import { _computeRouteHash, resetServerBridgeState } from './server-bridge-integration';

describe('server-bridge integration', () => {
  beforeEach(() => {
    resetServerBridgeState();
  });

  describe('computeRouteHash', () => {
    it('produces consistent hash for same routes regardless of order', () => {
      const routes1 = [
        { method: 'GET', path: '/api/users' },
        { method: 'POST', path: '/api/users' },
      ];
      const routes2 = [
        { method: 'POST', path: '/api/users' },
        { method: 'GET', path: '/api/users' },
      ];
      expect(_computeRouteHash(routes1)).toBe(_computeRouteHash(routes2));
    });

    it('produces different hash for different routes', () => {
      const routes1 = [{ method: 'GET', path: '/api/users' }];
      const routes2 = [{ method: 'GET', path: '/api/posts' }];
      expect(_computeRouteHash(routes1)).not.toBe(_computeRouteHash(routes2));
    });

    it('handles empty routes', () => {
      expect(_computeRouteHash([])).toBe('');
    });

    it('includes method in hash', () => {
      const get = [{ method: 'GET', path: '/api/users' }];
      const post = [{ method: 'POST', path: '/api/users' }];
      expect(_computeRouteHash(get)).not.toBe(_computeRouteHash(post));
    });
  });

  describe('runServerBridge', () => {
    it('does not throw even when generate fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { runServerBridge } = await import('./server-bridge-integration');
      resetServerBridgeState();

      // Should not throw — gracefully handles errors
      await expect(
        runServerBridge('/nonexistent', { framework: 'express' }, false)
      ).resolves.toBeUndefined();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('loadServerBridge', () => {
    it('caches the loaded module — second call returns same reference', async () => {
      const { loadServerBridge } = await import('./server-bridge-integration');
      resetServerBridgeState();

      const first = await loadServerBridge();
      const second = await loadServerBridge();
      // Both should be the same object reference (cached)
      expect(first).toBe(second);
    });

    it('returns non-null in monorepo (server-bridge is available)', async () => {
      const { loadServerBridge } = await import('./server-bridge-integration');
      resetServerBridgeState();

      const mod = await loadServerBridge();
      // In the monorepo, @hyperfixi/server-bridge is always resolvable
      expect(mod).not.toBeNull();
    });
  });

  describe('hash-based skip', () => {
    it('same routes produce same hash', () => {
      const routes = [
        { method: 'GET', path: '/api/users' },
        { method: 'POST', path: '/api/users' },
      ];
      const hash1 = _computeRouteHash(routes);
      const hash2 = _computeRouteHash(routes);
      expect(hash1).toBe(hash2);
    });

    it('hash is deterministic regardless of insertion order', () => {
      const a = [
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
        { method: 'POST', path: '/a' },
      ];
      const b = [
        { method: 'POST', path: '/a' },
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
      ];
      expect(_computeRouteHash(a)).toBe(_computeRouteHash(b));
    });
  });

  describe('resetServerBridgeState', () => {
    it('allows re-loading after reset', () => {
      // Just verify the function exists and doesn't throw
      resetServerBridgeState();
      resetServerBridgeState(); // multiple calls should be safe
    });
  });
});
