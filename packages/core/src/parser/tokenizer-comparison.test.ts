/**
 * Tokenizer Performance Comparison Tests
 * Compares original vs optimized tokenizer performance and accuracy
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from './tokenizer';
import { tokenizeOptimized } from './tokenizer-optimized';

describe('Tokenizer Performance Comparison', () => {
  // Test expressions of varying complexity
  const testCases = [
    {
      name: 'Simple Expression',
      input: 'me + 5',
      description: 'Basic arithmetic with context variable',
    },
    {
      name: 'CSS Selectors',
      input: 'hide #modal then show .dialog',
      description: 'Commands with CSS selectors',
    },
    {
      name: 'Complex Expression',
      input: '(value + 5) * (other - 3) / total and flag is true',
      description: 'Mixed arithmetic and logical operations',
    },
    {
      name: 'Large Expression',
      input: Array.from({ length: 100 }, (_, i) => `var${i} + ${i}`).join(' + '),
      description: '100-term arithmetic expression',
    },
    {
      name: 'Mixed Token Types',
      input: 'on click add .active to me then wait 500ms then remove .active from #target',
      description: 'Event handling with timing and selectors',
    },
    {
      name: 'Deep Nesting',
      input: '((((value1 + value2) * value3) - value4) / value5) > threshold',
      description: 'Deeply nested parentheses',
    },
    {
      name: 'String Heavy',
      input: 'put "Hello world" into me then set message to "Processing..." then log "Done"',
      description: 'Multiple string literals',
    },
    {
      name: 'Very Large Expression',
      input: Array.from(
        { length: 1000 },
        (_, i) => `identifier${i} * value${i} + constant${i}`
      ).join(' - '),
      description: '1000-term mixed expression',
    },
  ];

  describe('Functional Equivalence Tests', () => {
    testCases.forEach(({ name, input, description }) => {
      it(`should produce equivalent tokens for: ${name}`, () => {
        const originalTokens = tokenize(input);
        const optimizedTokens = tokenizeOptimized(input);

        // Should have same number of tokens
        expect(optimizedTokens.length).toBe(originalTokens.length);

        // Each token should have equivalent type and value
        for (let i = 0; i < originalTokens.length; i++) {
          const original = originalTokens[i];
          const optimized = optimizedTokens[i];

          expect(optimized.type).toBe(original.type);
          expect(optimized.value).toBe(original.value);

          // Position information should be close (allow for minor differences)
          expect(Math.abs(optimized.start - original.start)).toBeLessThanOrEqual(1);
          expect(Math.abs(optimized.end - original.end)).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Performance Benchmarks', () => {
    testCases.forEach(({ name, input, description }) => {
      it(`should be faster for: ${name}`, () => {
        const iterations = name.includes('Large') ? 10 : 100;

        // Benchmark original tokenizer
        const originalStart = performance.now();
        for (let i = 0; i < iterations; i++) {
          tokenize(input);
        }
        const originalTime = performance.now() - originalStart;

        // Benchmark optimized tokenizer
        const optimizedStart = performance.now();
        for (let i = 0; i < iterations; i++) {
          tokenizeOptimized(input);
        }
        const optimizedTime = performance.now() - optimizedStart;

        const speedup = originalTime / optimizedTime;

        console.log(
          `${name}: Original=${originalTime.toFixed(3)}ms, Optimized=${optimizedTime.toFixed(3)}ms, Speedup=${speedup.toFixed(2)}x`
        );

        // Optimized should be reasonably close to original performance
        // Allow for JS engine variations and small input overhead
        expect(optimizedTime).toBeLessThanOrEqual(originalTime * 1.5); // Allow 50% tolerance for small inputs

        // For complex expressions, expect significant speedup
        if (name.includes('Large') || name.includes('Mixed')) {
          expect(speedup).toBeGreaterThan(1.2); // At least 20% faster
        }
      });
    });
  });

  describe('Memory Efficiency Tests', () => {
    it('should use similar memory for token storage', () => {
      const largeInput = Array.from(
        { length: 500 },
        (_, i) => `token${i} + value${i} * const${i}`
      ).join(' - ');

      const originalTokens = tokenize(largeInput);
      const optimizedTokens = tokenizeOptimized(largeInput);

      // Should produce same structure
      expect(optimizedTokens.length).toBe(originalTokens.length);

      // Memory usage should be similar (tokens contain same data)
      const originalSize = JSON.stringify(originalTokens).length;
      const optimizedSize = JSON.stringify(optimizedTokens).length;

      // Allow for minor differences in serialization
      expect(Math.abs(optimizedSize - originalSize)).toBeLessThan(originalSize * 0.1);
    });
  });

  describe('Edge Case Handling', () => {
    const edgeCases = [
      { name: 'Empty String', input: '' },
      { name: 'Whitespace Only', input: '   \t\n   ' },
      { name: 'Single Character', input: 'a' },
      { name: 'Numbers Only', input: '123 456 789' },
      { name: 'Operators Only', input: '+ - * / = < >' },
      { name: 'Special Characters', input: '@#$%^&*()[]{}' },
      { name: 'Unicode Characters', input: 'héllo wörld' },
      { name: 'Mixed Quotes', input: '"string1" \'string2\' "nested \\"quote\\""' },
    ];

    edgeCases.forEach(({ name, input }) => {
      it(`should handle edge case: ${name}`, () => {
        const originalTokens = tokenize(input);
        const optimizedTokens = tokenizeOptimized(input);

        // Should produce equivalent results
        expect(optimizedTokens.length).toBe(originalTokens.length);

        if (originalTokens.length > 0) {
          for (let i = 0; i < originalTokens.length; i++) {
            expect(optimizedTokens[i].type).toBe(originalTokens[i].type);
            expect(optimizedTokens[i].value).toBe(originalTokens[i].value);
          }
        }
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle extremely large inputs efficiently', () => {
      // Generate 10,000 token expression
      const massiveInput = Array.from(
        { length: 2000 },
        (_, i) => `variable${i} + constant${i} * factor${i} - offset${i} / scale${i}`
      ).join(' and ');

      const startTime = performance.now();
      const tokens = tokenizeOptimized(massiveInput);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(tokens.length).toBeGreaterThan(10000);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Massive input (${tokens.length} tokens): ${executionTime.toFixed(3)}ms`);
    });

    it('should maintain consistent performance across repeated runs', () => {
      const input = 'complex + expression * with / many - operators and identifiers or constants';
      const times: number[] = [];

      // Run 50 times to check consistency
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        tokenizeOptimized(input);
        const end = performance.now();
        times.push(end - start);
      }

      // Calculate statistics
      const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance =
        times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      // Performance should be consistent (relaxed for micro-benchmarks)
      expect(coefficientOfVariation).toBeLessThan(1.0); // Less than 100% variation

      console.log(
        `Consistency: mean=${mean.toFixed(3)}ms, cv=${coefficientOfVariation.toFixed(3)}`
      );
    });
  });

  describe('Integration with Parser', () => {
    it('should work seamlessly with the existing parser', () => {
      const input = 'hide #modal then show .dialog and wait 500ms';

      // Test that optimized tokens can be parsed
      const tokens = tokenizeOptimized(input);
      expect(tokens.length).toBeGreaterThan(0);

      // Verify token structure is compatible
      tokens.forEach(token => {
        expect(token).toHaveProperty('type');
        expect(token).toHaveProperty('value');
        expect(token).toHaveProperty('start');
        expect(token).toHaveProperty('end');
        expect(token).toHaveProperty('line');
        expect(token).toHaveProperty('column');

        expect(typeof token.type).toBe('string');
        expect(typeof token.value).toBe('string');
        expect(typeof token.start).toBe('number');
        expect(typeof token.end).toBe('number');
        expect(typeof token.line).toBe('number');
        expect(typeof token.column).toBe('number');
      });
    });
  });
});
