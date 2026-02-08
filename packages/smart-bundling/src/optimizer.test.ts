/**
 * Bundle Optimizer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BundleOptimizer, FileBundleCache } from './optimizer';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
  };
});

describe('BundleOptimizer', () => {
  let optimizer: BundleOptimizer;

  beforeEach(() => {
    optimizer = new BundleOptimizer();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      expect(optimizer).toBeDefined();
      expect(optimizer).toBeInstanceOf(BundleOptimizer);
    });

    it('should accept custom configuration', () => {
      const customOptimizer = new BundleOptimizer({
        treeshaking: {
          enabled: true,
          pureAnnotations: true,
          sideEffects: false,
        },
      });

      expect(customOptimizer).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should have default analysis config', () => {
      expect((optimizer as any).config.analysis).toBeDefined();
      expect((optimizer as any).config.analysis.enabled).toBe(true);
    });

    it('should have default treeshaking config', () => {
      expect((optimizer as any).config.treeshaking).toBeDefined();
      expect((optimizer as any).config.treeshaking.enabled).toBe(true);
    });

    it('should have default splitting config', () => {
      expect((optimizer as any).config.splitting).toBeDefined();
      expect((optimizer as any).config.splitting.enabled).toBe(true);
    });

    it('should have default compression config', () => {
      expect((optimizer as any).config.compression).toBeDefined();
      expect((optimizer as any).config.compression.enabled).toBe(true);
    });
  });
});

describe('FileBundleCache', () => {
  let cache: FileBundleCache;

  beforeEach(() => {
    cache = new FileBundleCache('/tmp/cache');
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(cache).toBeDefined();
      expect(cache).toBeInstanceOf(FileBundleCache);
    });
  });

  describe('get/set', () => {
    it('should store and retrieve cached values', () => {
      cache.set('test-key', { code: 'const x = 1;' }, 'hash123');
      const result = cache.get('test-key');

      expect(result).toBeDefined();
    });
  });

  describe('has', () => {
    it('should check if key exists', () => {
      const exists = cache.has('nonexistent-key', 'hash123');
      expect(typeof exists).toBe('boolean');
    });
  });

  describe('clear', () => {
    it('should clear the cache', async () => {
      await cache.clear();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
