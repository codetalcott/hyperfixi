import { describe, it, expect, beforeEach } from 'vitest';
import { hyperscript } from './hyperscript-api';

/**
 * Performance benchmarks comparing API v1 vs v2.
 *
 * These tests measure overhead of the new API to ensure it doesn't
 * introduce performance regressions.
 */

describe('API Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  const WARMUP_ITERATIONS = 100;

  // Sample hyperscript codes of varying complexity
  const samples = {
    simple: 'toggle .active',
    medium: 'add .loading then wait 100ms then remove .loading',
    complex: 'if .visible is not in me then add .visible then wait 500ms then add .ready end',
  };

  beforeEach(() => {
    // Warmup JIT
    for (let i = 0; i < WARMUP_ITERATIONS; i++) {
      hyperscript.compileSync(samples.simple);
    }
  });

  describe('Compilation Performance', () => {
    it('v1 compile() vs v2 compileSync() - simple code', () => {
      // V1 API (deprecated)
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compile(samples.simple);
      }
      const v1Time = performance.now() - v1Start;

      // V2 API
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compileSync(samples.simple);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      // V2 should not be more than 10% slower
      expect(overhead).toBeLessThan(10);
    });

    it('v1 compile() vs v2 compileSync() - medium code', () => {
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compile(samples.medium);
      }
      const v1Time = performance.now() - v1Start;

      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compileSync(samples.medium);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      expect(overhead).toBeLessThan(10);
    });

    it('v1 compile() vs v2 compileSync() - complex code', () => {
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compile(samples.complex);
      }
      const v1Time = performance.now() - v1Start;

      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.compileSync(samples.complex);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      expect(overhead).toBeLessThan(10);
    });
  });

  describe('Result Object Access Performance', () => {
    it('v1 .success vs v2 .ok access', () => {
      const code = samples.simple;

      // V1
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const result = hyperscript.compile(code);
        if (result.success) {
          const ast = result.ast;
        }
      }
      const v1Time = performance.now() - v1Start;

      // V2
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const result = hyperscript.compileSync(code);
        if (result.ok) {
          const ast = result.ast;
        }
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      expect(overhead).toBeLessThan(15); // Allow slightly more overhead for property access
    });

    it('metadata access overhead', () => {
      const code = samples.simple;

      // V1 (flat structure)
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const result = hyperscript.compile(code);
        const time = result.compilationTime;
      }
      const v1Time = performance.now() - v1Start;

      // V2 (nested meta object)
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        const result = hyperscript.compileSync(code);
        const time = result.meta.timeMs;
        const parser = result.meta.parser;
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      // Nested access should have minimal overhead
      expect(overhead).toBeLessThan(20);
    });
  });

  describe('Compile-and-Execute Performance', () => {
    it('v1 run() vs v2 eval() - without context', async () => {
      const code = '5 + 3';

      // V1
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await hyperscript.run(code);
      }
      const v1Time = performance.now() - v1Start;

      // V2
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await hyperscript.eval(code);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      expect(overhead).toBeLessThan(10);
    });

    it('v1 run() vs v2 eval() - with context', async () => {
      const code = 'me.textContent';
      const element = document.createElement('div');
      element.textContent = 'test';
      const ctx = hyperscript.createContext(element);

      // V1
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await hyperscript.run(code, ctx);
      }
      const v1Time = performance.now() - v1Start;

      // V2
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await hyperscript.eval(code, ctx);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      expect(overhead).toBeLessThan(10);
    });
  });

  describe('Validation Performance', () => {
    it('v1 isValidHyperscript() vs v2 validate()', async () => {
      const code = samples.simple;

      // V1
      const v1Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        hyperscript.isValidHyperscript(code);
      }
      const v1Time = performance.now() - v1Start;

      // V2
      const v2Start = performance.now();
      for (let i = 0; i < ITERATIONS; i++) {
        await hyperscript.validate(code);
      }
      const v2Time = performance.now() - v2Start;

      const avgV1 = v1Time / ITERATIONS;
      const avgV2 = v2Time / ITERATIONS;
      const overhead = ((avgV2 - avgV1) / avgV1) * 100;

      console.log(`  V1 avg: ${avgV1.toFixed(3)}ms`);
      console.log(`  V2 avg: ${avgV2.toFixed(3)}ms`);
      console.log(`  Overhead: ${overhead > 0 ? '+' : ''}${overhead.toFixed(1)}%`);

      // V2 is async and returns structured data, so allow more overhead
      expect(overhead).toBeLessThan(50);
    });
  });

  describe('Memory Usage (Relative)', () => {
    it('v2 result objects should not use significantly more memory', () => {
      const code = samples.medium;
      const v1Results: any[] = [];
      const v2Results: any[] = [];

      // Collect V1 results
      for (let i = 0; i < 100; i++) {
        v1Results.push(hyperscript.compile(code));
      }

      // Collect V2 results
      for (let i = 0; i < 100; i++) {
        v2Results.push(hyperscript.compileSync(code));
      }

      // Rough memory estimate based on property count
      const v1PropCount = Object.keys(v1Results[0]).length;
      const v2PropCount = Object.keys(v2Results[0]).length + Object.keys(v2Results[0].meta).length;

      console.log(`  V1 properties: ${v1PropCount}`);
      console.log(`  V2 properties: ${v2PropCount}`);

      // V2 has more metadata for debugging (meta.parser, meta.confidence, etc.)
      // This is intentional and provides better developer experience
      // Allow up to 10 additional properties for enhanced metadata
      expect(v2PropCount - v1PropCount).toBeLessThan(10);
    });
  });
});
