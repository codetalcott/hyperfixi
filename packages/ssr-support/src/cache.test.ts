import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemorySSRCache, createSSRCache } from './cache';
import { SSRResult } from './types';

// Helper to create a mock SSRResult
function createMockResult(id: string, tags: string[] = []): SSRResult {
  return {
    html: `<div>Content ${id}</div>`,
    criticalCSS: [],
    externalCSS: [],
    javascript: [],
    variables: [],
    hyperscript: [],
    components: [],
    metaTags: [],
    linkTags: [],
    performance: {
      renderTime: 10,
      hydrationSize: 0,
      criticalCSSSize: 0,
      totalSize: 100,
    },
    cache: {
      key: id,
      ttl: 3600,
      tags,
    },
  };
}

describe('MemorySSRCache', () => {
  let cache: MemorySSRCache;

  beforeEach(() => {
    cache = new MemorySSRCache({ maxSize: 10 });
  });

  describe('basic operations', () => {
    it('should store and retrieve a value', async () => {
      const result = createMockResult('test1');
      await cache.set('key1', result);

      const retrieved = await cache.get('key1');
      expect(retrieved).toEqual(result);
    });

    it('should return null for non-existent key', async () => {
      const retrieved = await cache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should update existing key', async () => {
      const result1 = createMockResult('test1');
      const result2 = createMockResult('test2');

      await cache.set('key1', result1);
      await cache.set('key1', result2);

      const retrieved = await cache.get('key1');
      expect(retrieved?.html).toContain('test2');
    });

    it('should clear all entries', async () => {
      await cache.set('key1', createMockResult('1'));
      await cache.set('key2', createMockResult('2'));

      await cache.clear();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      vi.useFakeTimers();

      const result = createMockResult('test');
      await cache.set('key1', result, 1); // 1 second TTL

      // Still valid
      expect(await cache.get('key1')).not.toBeNull();

      // Advance time past TTL
      vi.advanceTimersByTime(2000);

      // Should be expired
      expect(await cache.get('key1')).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when at capacity', async () => {
      vi.useFakeTimers();
      const smallCache = new MemorySSRCache({ maxSize: 3 });

      vi.setSystemTime(1000);
      await smallCache.set('key1', createMockResult('1'));

      vi.setSystemTime(2000);
      await smallCache.set('key2', createMockResult('2'));

      vi.setSystemTime(3000);
      await smallCache.set('key3', createMockResult('3'));

      // Access key1 to make it recently used (timestamp 4000)
      vi.setSystemTime(4000);
      await smallCache.get('key1');

      // Add new entry, should evict key2 (least recently used at timestamp 2000)
      vi.setSystemTime(5000);
      await smallCache.set('key4', createMockResult('4'));

      vi.setSystemTime(6000);
      expect(await smallCache.get('key1')).not.toBeNull();
      expect(await smallCache.get('key2')).toBeNull(); // Evicted (LRU)
      expect(await smallCache.get('key3')).not.toBeNull();
      expect(await smallCache.get('key4')).not.toBeNull();

      vi.useRealTimers();
    });

    it('should not evict when updating existing key', async () => {
      const smallCache = new MemorySSRCache({ maxSize: 2 });

      await smallCache.set('key1', createMockResult('1'));
      await smallCache.set('key2', createMockResult('2'));

      // Update existing key should not trigger eviction
      await smallCache.set('key1', createMockResult('1-updated'));

      expect(await smallCache.get('key1')).not.toBeNull();
      expect(await smallCache.get('key2')).not.toBeNull();
    });
  });

  describe('tag invalidation', () => {
    it('should invalidate entries by tag', async () => {
      await cache.set('key1', createMockResult('1', ['user:123', 'page']));
      await cache.set('key2', createMockResult('2', ['user:456', 'page']));
      await cache.set('key3', createMockResult('3', ['user:123', 'admin']));

      await cache.invalidate(['user:123']);

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).not.toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });

    it('should invalidate entries by multiple tags', async () => {
      await cache.set('key1', createMockResult('1', ['tag-a']));
      await cache.set('key2', createMockResult('2', ['tag-b']));
      await cache.set('key3', createMockResult('3', ['tag-c']));

      await cache.invalidate(['tag-a', 'tag-b']);

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).not.toBeNull();
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', createMockResult('1'));

      await cache.get('key1'); // hit
      await cache.get('key1'); // hit
      await cache.get('nonexistent'); // miss

      const stats = await cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should report correct key count', async () => {
      await cache.set('key1', createMockResult('1'));
      await cache.set('key2', createMockResult('2'));

      const stats = await cache.stats();
      expect(stats.keys).toBe(2);
    });

    it('should estimate size', async () => {
      await cache.set('key1', createMockResult('1'));

      const stats = await cache.stats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });
});

describe('createSSRCache', () => {
  it('should create memory cache by default', () => {
    const cache = createSSRCache({ type: 'memory' });
    expect(cache).toBeInstanceOf(MemorySSRCache);
  });

  it('should throw for redis cache without client', () => {
    expect(() => createSSRCache({ type: 'redis' })).toThrow('Redis client required');
  });

  it('should throw for tiered cache without client', () => {
    expect(() => createSSRCache({ type: 'tiered' })).toThrow('Redis client required');
  });
});
