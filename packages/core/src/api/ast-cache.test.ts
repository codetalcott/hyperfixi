/**
 * AST Cache Tests
 * Validates compilation caching for identical hyperscript code strings.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from './hyperscript-api';

describe('AST Compilation Cache', () => {
  beforeEach(() => {
    hyperscript.clearCache();
  });

  describe('cache hits for identical code', () => {
    it('should return the same CompileResult reference for identical code', () => {
      const result1 = hyperscript.compileSync('on click toggle .active');
      const result2 = hyperscript.compileSync('on click toggle .active');

      expect(result1).toBe(result2); // Same object reference
    });

    it('should return different results for different code', () => {
      const result1 = hyperscript.compileSync('on click toggle .active');
      const result2 = hyperscript.compileSync('on click add .clicked');

      expect(result1).not.toBe(result2);
      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
    });

    it('should cache across many repeated compilations', () => {
      // Simulate the template loop pattern: 114 identical scripts
      const code = 'on click toggle .active on me';
      const results: ReturnType<typeof hyperscript.compileSync>[] = [];

      for (let i = 0; i < 114; i++) {
        results.push(hyperscript.compileSync(code));
      }

      // All should be the same reference
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0]);
      }

      const stats = hyperscript.getCacheStats();
      expect(stats.hits).toBe(113);
      expect(stats.misses).toBe(1);
    });
  });

  describe('cache key includes options', () => {
    it('should cache separately for different traditional flag', () => {
      const resultSemantic = hyperscript.compileSync('toggle .active');
      const resultTraditional = hyperscript.compileSync('toggle .active', { traditional: true });

      // Different options should yield separate cache entries
      expect(resultSemantic).not.toBe(resultTraditional);
    });

    it('should cache separately for different language option', () => {
      const resultEn = hyperscript.compileSync('toggle .active', { language: 'en' });
      const resultEs = hyperscript.compileSync('toggle .active', { language: 'es' });

      // Different languages should be cached separately
      expect(resultEn).not.toBe(resultEs);
    });

    it('should treat undefined language same as default en', () => {
      const result1 = hyperscript.compileSync('toggle .active');
      const result2 = hyperscript.compileSync('toggle .active', { language: 'en' });

      expect(result1).toBe(result2);
    });
  });

  describe('failed compilations are not cached', () => {
    it('should not cache compilation errors', () => {
      const result1 = hyperscript.compileSync('invalid @@ syntax');
      const result2 = hyperscript.compileSync('invalid @@ syntax');

      expect(result1.ok).toBe(false);
      expect(result2.ok).toBe(false);
      // Different object references (re-parsed each time)
      expect(result1).not.toBe(result2);
    });

    it('should report zero cache size after only failed compilations', () => {
      hyperscript.compileSync('invalid @@ syntax');
      hyperscript.compileSync('another @@ bad @@ input');

      const stats = hyperscript.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('clearCache()', () => {
    it('should empty the cache', () => {
      hyperscript.compileSync('on click toggle .active');
      hyperscript.compileSync('on click add .clicked');

      expect(hyperscript.getCacheStats().size).toBe(2);

      hyperscript.clearCache();

      expect(hyperscript.getCacheStats().size).toBe(0);
      expect(hyperscript.getCacheStats().hits).toBe(0);
      expect(hyperscript.getCacheStats().misses).toBe(0);
    });

    it('should cause re-parsing after clear', () => {
      const result1 = hyperscript.compileSync('on click toggle .active');
      hyperscript.clearCache();
      const result2 = hyperscript.compileSync('on click toggle .active');

      // After clearing, result should be a new object (re-parsed)
      expect(result1).not.toBe(result2);
      // But structurally equivalent
      expect(result1.ok).toBe(result2.ok);
    });
  });

  describe('getCacheStats()', () => {
    it('should track hits and misses accurately', () => {
      // First call: miss
      hyperscript.compileSync('toggle .a');
      expect(hyperscript.getCacheStats().misses).toBe(1);
      expect(hyperscript.getCacheStats().hits).toBe(0);

      // Second call with same code: hit
      hyperscript.compileSync('toggle .a');
      expect(hyperscript.getCacheStats().hits).toBe(1);
      expect(hyperscript.getCacheStats().misses).toBe(1);

      // Third call with different code: miss
      hyperscript.compileSync('toggle .b');
      expect(hyperscript.getCacheStats().misses).toBe(2);
    });

    it('should report correct cache size', () => {
      hyperscript.compileSync('toggle .a');
      hyperscript.compileSync('toggle .b');
      hyperscript.compileSync('toggle .c');
      hyperscript.compileSync('toggle .a'); // cache hit, no new entry

      expect(hyperscript.getCacheStats().size).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      hyperscript.compileSync('toggle .a'); // miss
      hyperscript.compileSync('toggle .a'); // hit
      hyperscript.compileSync('toggle .a'); // hit
      hyperscript.compileSync('toggle .a'); // hit

      const stats = hyperscript.getCacheStats();
      expect(stats.hitRate).toBe(0.75); // 3 hits / 4 total
    });

    it('should return 0 hitRate when cache is empty', () => {
      expect(hyperscript.getCacheStats().hitRate).toBe(0);
    });
  });

  describe('async compilation caching', () => {
    it('should cache results from compileAsync for English code', async () => {
      const result1 = await hyperscript.compile('on click toggle .active');
      const result2 = await hyperscript.compile('on click toggle .active');

      // compileAsync for English delegates to compileSync, so cache should work
      expect(result1).toBe(result2);
    });
  });

  describe('LRU eviction', () => {
    it('should grow cache correctly up to capacity', () => {
      const uniqueStrings = 20;
      for (let i = 0; i < uniqueStrings; i++) {
        hyperscript.compileSync(`on click add .class${i}`);
      }
      expect(hyperscript.getCacheStats().size).toBe(uniqueStrings);
    });

    it('caps at 500 entries and evicts the least recently used', () => {
      // Arc 4b step 4: the previous test never crossed the boundary, so the
      // eviction branch had no gate. 500 distinct sources fill the cache;
      // the 501st evicts exactly one; which one is the LRU rule — a `get`
      // moves its entry to the back, so touching #0 right before the overflow
      // keeps it and evicts #1 instead.
      for (let i = 0; i < 500; i++) hyperscript.compileSync(`on click add .c${i}`);
      expect(hyperscript.getCacheStats().size).toBe(500);

      hyperscript.compileSync('on click add .c0'); // hit — #0 is now most recent
      const before = hyperscript.getCacheStats();
      hyperscript.compileSync('on click add .c500'); // overflow: evicts #1
      const after = hyperscript.getCacheStats();
      expect(after.size).toBe(500);
      expect(after.misses).toBe(before.misses + 1);

      hyperscript.compileSync('on click add .c0'); // still cached
      expect(hyperscript.getCacheStats().misses).toBe(after.misses);
      hyperscript.compileSync('on click add .c1'); // evicted — recompiles
      expect(hyperscript.getCacheStats().misses).toBe(after.misses + 1);
      expect(hyperscript.getCacheStats().size).toBe(500);
    });
  });
});
