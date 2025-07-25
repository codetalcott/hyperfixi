/**
 * Tests for CompilationCache - caching system for compiled hyperscript
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompilationCache } from './compilation-cache.js';
import type { CompilationOptions, CompilationResult } from '../types.js';

describe('CompilationCache', () => {
  let cache: CompilationCache;

  beforeEach(() => {
    cache = new CompilationCache();
  });

  describe('Basic Caching', () => {
    it('should cache compilation results', () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      // First set
      cache.set(script, options, result);
      
      // Should retrieve the cached result
      const cached = cache.get(script, options);
      expect(cached).toEqual(result);
    });

    it('should return null for cache miss', () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      
      const cached = cache.get(script, options);
      expect(cached).toBeNull();
    });

    it('should handle multiple cached entries', () => {
      const script1 = 'on click toggle .active';
      const script2 = 'on hover show .tooltip';
      const options: CompilationOptions = { minify: false };
      
      const result1: CompilationResult = {
        compiled: 'compiled script 1',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      const result2: CompilationResult = {
        compiled: 'compiled script 2',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.tooltip'],
          events: ['hover'],
          commands: ['show'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      cache.set(script1, options, result1);
      cache.set(script2, options, result2);
      
      expect(cache.get(script1, options)).toEqual(result1);
      expect(cache.get(script2, options)).toEqual(result2);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache on options change', () => {
      const script = 'on click toggle .active';
      const options1: CompilationOptions = { minify: false };
      const options2: CompilationOptions = { minify: true };
      
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      // Cache with first options
      cache.set(script, options1, result);
      
      // Should not find with different options
      const cached = cache.get(script, options2);
      expect(cached).toBeNull();
    });

    it('should treat different option combinations as separate entries', () => {
      const script = 'on click toggle .active';
      const options1: CompilationOptions = { minify: false, compatibility: 'modern' };
      const options2: CompilationOptions = { minify: true, compatibility: 'modern' };
      const options3: CompilationOptions = { minify: false, compatibility: 'legacy' };
      
      const result1: CompilationResult = {
        compiled: 'unminified modern',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      const result2: CompilationResult = {
        compiled: 'minified modern',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      const result3: CompilationResult = {
        compiled: 'unminified legacy',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      cache.set(script, options1, result1);
      cache.set(script, options2, result2);
      cache.set(script, options3, result3);
      
      expect(cache.get(script, options1)).toEqual(result1);
      expect(cache.get(script, options2)).toEqual(result2);
      expect(cache.get(script, options3)).toEqual(result3);
    });

    it('should handle template variables in cache keys', () => {
      const script = 'on click fetch /api/users/{{userId}}';
      const options1: CompilationOptions = { templateVars: { userId: '123' } };
      const options2: CompilationOptions = { templateVars: { userId: '456' } };
      
      const result1: CompilationResult = {
        compiled: 'compiled with user 123',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: ['click'],
          commands: ['fetch'],
          templateVariables: ['userId']
        },
        warnings: [],
        errors: []
      };

      const result2: CompilationResult = {
        compiled: 'compiled with user 456',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: ['click'],
          commands: ['fetch'],
          templateVariables: ['userId']
        },
        warnings: [],
        errors: []
      };

      cache.set(script, options1, result1);
      cache.set(script, options2, result2);
      
      expect(cache.get(script, options1)).toEqual(result1);
      expect(cache.get(script, options2)).toEqual(result2);
    });
  });

  describe('Cache Size Management', () => {
    it('should enforce maximum cache size', () => {
      const maxSize = 3;
      const limitedCache = new CompilationCache({ maxSize });
      
      const options: CompilationOptions = { minify: false };
      const baseResult: CompilationResult = {
        compiled: 'compiled',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: [],
          commands: [],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      // Add entries up to limit
      for (let i = 0; i < maxSize + 2; i++) {
        limitedCache.set(`script${i}`, options, {
          ...baseResult,
          compiled: `compiled${i}`
        });
      }

      // Should only keep the most recent entries
      expect(limitedCache.get('script0', options)).toBeNull(); // Evicted
      expect(limitedCache.get('script1', options)).toBeNull(); // Evicted
      expect(limitedCache.get('script2', options)).not.toBeNull(); // Kept
      expect(limitedCache.get('script3', options)).not.toBeNull(); // Kept
      expect(limitedCache.get('script4', options)).not.toBeNull(); // Kept
    });

    it('should update LRU order on cache hit', () => {
      const maxSize = 2;
      const limitedCache = new CompilationCache({ maxSize });
      
      const options: CompilationOptions = { minify: false };
      const baseResult: CompilationResult = {
        compiled: 'compiled',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: [],
          commands: [],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      // Add two entries
      limitedCache.set('script1', options, { ...baseResult, compiled: 'compiled1' });
      limitedCache.set('script2', options, { ...baseResult, compiled: 'compiled2' });
      
      // Access first entry to make it recently used
      limitedCache.get('script1', options);
      
      // Add third entry - should evict script2, not script1
      limitedCache.set('script3', options, { ...baseResult, compiled: 'compiled3' });
      
      expect(limitedCache.get('script1', options)).not.toBeNull(); // Should still be cached
      expect(limitedCache.get('script2', options)).toBeNull(); // Should be evicted
      expect(limitedCache.get('script3', options)).not.toBeNull(); // Should be cached
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const ttl = 100; // 100ms
      const ttlCache = new CompilationCache({ ttl });
      
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      ttlCache.set(script, options, result);
      
      // Should be available immediately
      expect(ttlCache.get(script, options)).toEqual(result);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, ttl + 10));
      
      // Should be expired
      expect(ttlCache.get(script, options)).toBeNull();
    });

    it('should not expire entries within TTL', async () => {
      const ttl = 200; // 200ms
      const ttlCache = new CompilationCache({ ttl });
      
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      ttlCache.set(script, options, result);
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should still be available
      expect(ttlCache.get(script, options)).toEqual(result);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit count', () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      cache.set(script, options, result);
      
      // Multiple hits
      cache.get(script, options);
      cache.get(script, options);
      cache.get(script, options);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(0);
    });

    it('should track miss count', () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      
      // Multiple misses
      cache.get(script, options);
      cache.get(script, options);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit ratio', () => {
      const script = 'on click toggle .active';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: ['.active'],
          events: ['click'],
          commands: ['toggle'],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      // 2 misses
      cache.get(script, options);
      cache.get(script, options);
      
      // 1 set + 3 hits
      cache.set(script, options, result);
      cache.get(script, options);
      cache.get(script, options);
      cache.get(script, options);
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio).toBe(0.6); // 3 / (3 + 2)
    });
  });

  describe('Cache Management', () => {
    it('should clear all entries', () => {
      const script1 = 'on click toggle .active';
      const script2 = 'on hover show .tooltip';
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: [],
          commands: [],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      cache.set(script1, options, result);
      cache.set(script2, options, result);
      
      cache.clear();
      
      expect(cache.get(script1, options)).toBeNull();
      expect(cache.get(script2, options)).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should report cache size', () => {
      const options: CompilationOptions = { minify: false };
      const result: CompilationResult = {
        compiled: 'compiled script',
        metadata: {
          complexity: 1,
          dependencies: [],
          selectors: [],
          events: [],
          commands: [],
          templateVariables: []
        },
        warnings: [],
        errors: []
      };

      expect(cache.size()).toBe(0);
      
      cache.set('script1', options, result);
      expect(cache.size()).toBe(1);
      
      cache.set('script2', options, result);
      expect(cache.size()).toBe(2);
    });
  });
});