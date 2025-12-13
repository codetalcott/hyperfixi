/**
 * Semantic Cache Tests
 *
 * Tests LRU caching behavior for semantic analysis results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticCache,
  createSemanticCache,
  withCache,
} from '../../src/cache/semantic-cache';
import type { SemanticAnalysisResult } from '../../src/core-bridge';

// Mock analysis result for testing
const mockResult = (confidence: number): SemanticAnalysisResult => ({
  confidence,
  command: {
    name: 'toggle',
    roles: new Map([['patient', { type: 'selector', value: '.active' }]]),
  },
  node: {
    kind: 'command',
    action: 'toggle',
    roles: new Map(),
    metadata: {},
  },
});

describe('SemanticCache', () => {
  let cache: SemanticCache;

  beforeEach(() => {
    cache = new SemanticCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const result = mockResult(0.9);
      cache.set('toggle .active', 'en', result);

      const retrieved = cache.get('toggle .active', 'en');
      expect(retrieved).toBeDefined();
      expect(retrieved?.confidence).toBe(0.9);
    });

    it('should return undefined for cache miss', () => {
      const result = cache.get('unknown input', 'en');
      expect(result).toBeUndefined();
    });

    it('should distinguish between languages', () => {
      cache.set('toggle .active', 'en', mockResult(0.9));
      cache.set('toggle .active', 'ja', mockResult(0.85));

      expect(cache.get('toggle .active', 'en')?.confidence).toBe(0.9);
      expect(cache.get('toggle .active', 'ja')?.confidence).toBe(0.85);
    });

    it('should not cache failed results (confidence 0)', () => {
      const failedResult: SemanticAnalysisResult = {
        confidence: 0,
        errors: ['No pattern matched'],
      };
      cache.set('invalid input', 'en', failedResult);

      expect(cache.get('invalid input', 'en')).toBeUndefined();
    });

    it('should check if entry exists with has()', () => {
      cache.set('toggle .active', 'en', mockResult(0.9));

      expect(cache.has('toggle .active', 'en')).toBe(true);
      expect(cache.has('unknown', 'en')).toBe(false);
    });

    it('should delete specific entries', () => {
      cache.set('toggle .active', 'en', mockResult(0.9));
      expect(cache.has('toggle .active', 'en')).toBe(true);

      cache.delete('toggle .active', 'en');
      expect(cache.has('toggle .active', 'en')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('input1', 'en', mockResult(0.9));
      cache.set('input2', 'en', mockResult(0.8));
      cache.set('input3', 'ja', mockResult(0.85));

      expect(cache.getStats().size).toBe(3);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when max size reached', () => {
      const smallCache = new SemanticCache({ maxSize: 3 });

      smallCache.set('input1', 'en', mockResult(0.9));
      smallCache.set('input2', 'en', mockResult(0.8));
      smallCache.set('input3', 'en', mockResult(0.7));

      // All should be present
      expect(smallCache.has('input1', 'en')).toBe(true);
      expect(smallCache.has('input2', 'en')).toBe(true);
      expect(smallCache.has('input3', 'en')).toBe(true);

      // Add fourth entry - should evict input1 (oldest)
      smallCache.set('input4', 'en', mockResult(0.6));

      expect(smallCache.has('input1', 'en')).toBe(false);
      expect(smallCache.has('input2', 'en')).toBe(true);
      expect(smallCache.has('input3', 'en')).toBe(true);
      expect(smallCache.has('input4', 'en')).toBe(true);
    });

    it('should update LRU order on access', () => {
      const smallCache = new SemanticCache({ maxSize: 3 });

      smallCache.set('input1', 'en', mockResult(0.9));
      smallCache.set('input2', 'en', mockResult(0.8));
      smallCache.set('input3', 'en', mockResult(0.7));

      // Access input1 to make it most recently used
      smallCache.get('input1', 'en');

      // Add fourth entry - should evict input2 (now oldest)
      smallCache.set('input4', 'en', mockResult(0.6));

      expect(smallCache.has('input1', 'en')).toBe(true); // Was accessed, now recent
      expect(smallCache.has('input2', 'en')).toBe(false); // Evicted
      expect(smallCache.has('input3', 'en')).toBe(true);
      expect(smallCache.has('input4', 'en')).toBe(true);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const ttlCache = new SemanticCache({ ttlMs: 50 });

      ttlCache.set('input', 'en', mockResult(0.9));
      expect(ttlCache.get('input', 'en')).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(ttlCache.get('input', 'en')).toBeUndefined();
    });

    it('should not expire entries when TTL is 0', async () => {
      const noTtlCache = new SemanticCache({ ttlMs: 0 });

      noTtlCache.set('input', 'en', mockResult(0.9));

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(noTtlCache.get('input', 'en')).toBeDefined();
    });
  });

  describe('statistics', () => {
    it('should track hits and misses', () => {
      cache.set('input', 'en', mockResult(0.9));

      cache.get('input', 'en'); // Hit
      cache.get('input', 'en'); // Hit
      cache.get('unknown', 'en'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track evictions', () => {
      const smallCache = new SemanticCache({ maxSize: 2 });

      smallCache.set('input1', 'en', mockResult(0.9));
      smallCache.set('input2', 'en', mockResult(0.8));
      smallCache.set('input3', 'en', mockResult(0.7)); // Evicts input1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should reset statistics', () => {
      cache.set('input', 'en', mockResult(0.9));
      cache.get('input', 'en');
      cache.get('unknown', 'en');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should report size and maxSize', () => {
      const smallCache = new SemanticCache({ maxSize: 100 });

      smallCache.set('input1', 'en', mockResult(0.9));
      smallCache.set('input2', 'en', mockResult(0.8));

      const stats = smallCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('configuration', () => {
    it('should allow disabling cache', () => {
      const disabledCache = new SemanticCache({ enabled: false });

      disabledCache.set('input', 'en', mockResult(0.9));
      expect(disabledCache.get('input', 'en')).toBeUndefined();
      expect(disabledCache.getStats().enabled).toBe(false);
    });

    it('should allow enabling/disabling at runtime', () => {
      cache.set('input', 'en', mockResult(0.9));
      expect(cache.get('input', 'en')).toBeDefined();

      cache.disable();
      expect(cache.get('input', 'en')).toBeUndefined();

      cache.enable();
      // Cache was cleared when disabled, so still undefined
      expect(cache.has('input', 'en')).toBe(true); // Entry still exists
    });

    it('should allow changing maxSize at runtime', () => {
      const smallCache = new SemanticCache({ maxSize: 5 });

      smallCache.set('input1', 'en', mockResult(0.9));
      smallCache.set('input2', 'en', mockResult(0.8));
      smallCache.set('input3', 'en', mockResult(0.7));

      // Reduce max size - should evict
      smallCache.configure({ maxSize: 2 });

      const stats = smallCache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(2);
    });

    it('should return current configuration', () => {
      const customCache = new SemanticCache({
        maxSize: 500,
        ttlMs: 1000,
        enabled: true,
      });

      const config = customCache.getConfig();
      expect(config.maxSize).toBe(500);
      expect(config.ttlMs).toBe(1000);
      expect(config.enabled).toBe(true);
    });
  });

  describe('createSemanticCache factory', () => {
    it('should create cache with default config', () => {
      const newCache = createSemanticCache();
      expect(newCache.getConfig().maxSize).toBe(1000);
      expect(newCache.getConfig().enabled).toBe(true);
    });

    it('should create cache with custom config', () => {
      const newCache = createSemanticCache({ maxSize: 50 });
      expect(newCache.getConfig().maxSize).toBe(50);
    });
  });

  describe('withCache wrapper', () => {
    it('should wrap an analyze function with caching', () => {
      let callCount = 0;
      const mockAnalyze = (input: string, language: string): SemanticAnalysisResult => {
        callCount++;
        return mockResult(0.9);
      };

      const testCache = new SemanticCache();
      const cachedAnalyze = withCache(mockAnalyze, testCache);

      // First call - should invoke function
      cachedAnalyze('input', 'en');
      expect(callCount).toBe(1);

      // Second call - should use cache
      cachedAnalyze('input', 'en');
      expect(callCount).toBe(1); // Still 1

      // Different input - should invoke function
      cachedAnalyze('other', 'en');
      expect(callCount).toBe(2);
    });
  });
});

describe('SemanticAnalyzer with Cache', () => {
  // These tests use the actual SemanticAnalyzerImpl
  it('should use cache for repeated inputs', async () => {
    const { createSemanticAnalyzer } = await import('../../src/core-bridge');

    const analyzer = createSemanticAnalyzer();
    analyzer.clearCache();

    // First analysis
    const result1 = analyzer.analyze('toggle .active on #button', 'en');

    // Check cache stats
    const stats1 = analyzer.getCacheStats();
    expect(stats1.misses).toBeGreaterThan(0);

    // Second analysis (should hit cache)
    const result2 = analyzer.analyze('toggle .active on #button', 'en');

    const stats2 = analyzer.getCacheStats();
    expect(stats2.hits).toBeGreaterThan(0);

    // Results should be identical
    expect(result1.confidence).toBe(result2.confidence);
  });

  it('should allow disabling cache', async () => {
    const { createSemanticAnalyzer } = await import('../../src/core-bridge');

    const analyzer = createSemanticAnalyzer({ cache: false });

    analyzer.analyze('toggle .active', 'en');
    analyzer.analyze('toggle .active', 'en');

    const stats = analyzer.getCacheStats();
    expect(stats.enabled).toBe(false);
    expect(stats.hits).toBe(0);
  });

  it('should allow custom cache configuration', async () => {
    const { createSemanticAnalyzer } = await import('../../src/core-bridge');

    const analyzer = createSemanticAnalyzer({
      cache: { maxSize: 10 },
    });

    const stats = analyzer.getCacheStats();
    expect(stats.maxSize).toBe(10);
  });
});
