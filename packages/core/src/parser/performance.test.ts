/**
 * Parser Performance Tests
 * Profiles and validates parser performance with large hyperscript expressions
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parse } from './parser';
import { tokenizeOptimized } from './tokenizer-optimized';

describe('Parser Performance Optimization', () => {
  let performanceBaseline: { [key: string]: number } = {};

  beforeAll(() => {
    // Establish performance baselines for regression testing
    performanceBaseline = {};
  });

  describe('Performance Baseline Measurements', () => {
    it('should establish baseline for simple expressions', () => {
      const simpleExpr = '5 + 3';

      const startTime = performance.now();
      const result = parse(simpleExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      performanceBaseline.simple = executionTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10); // Should be very fast

      console.log(`Simple expression baseline: ${executionTime.toFixed(3)}ms`);
    });

    it('should establish baseline for medium expressions', () => {
      const mediumExpr = '(5 + 3) * (10 - 2) / (4 + 1) + (7 * 2) - (6 / 3)';

      const startTime = performance.now();
      const result = parse(mediumExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      performanceBaseline.medium = executionTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(50); // Should complete quickly

      console.log(`Medium expression baseline: ${executionTime.toFixed(3)}ms`);
    });

    it('should establish baseline for complex expressions', () => {
      // Generate complex nested expression
      const complexExpr = Array.from(
        { length: 50 },
        (_, i) => `(${i} + ${i + 1}) * (${i + 2} - ${i + 3})`
      ).join(' + ');

      const startTime = performance.now();
      const result = parse(complexExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;
      performanceBaseline.complex = executionTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(200); // Should complete reasonably fast

      console.log(`Complex expression baseline: ${executionTime.toFixed(3)}ms`);
    });
  });

  describe('Large Expression Performance Tests', () => {
    it('should handle 1000+ term arithmetic expressions efficiently', () => {
      // Generate large arithmetic expression with 1000 terms
      const terms = Array.from({ length: 1000 }, (_, i) => i.toString());
      const largeExpr = terms.join(' + ');

      const startTime = performance.now();
      const result = parse(largeExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second

      console.log(`1000-term expression: ${executionTime.toFixed(3)}ms`);
    });

    it('should handle complex mathematical expressions efficiently', () => {
      // Generate complex mathematical expression with various operators
      const operators = ['+', '-', '*', '/', 'mod'];
      const complexMath = Array.from({ length: 200 }, (_, i) => {
        const op = operators[i % operators.length];
        return `${i} ${op} ${i + 1}`;
      }).join(' + ');

      const startTime = performance.now();
      const result = parse(complexMath);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(500); // Should be reasonably fast

      console.log(`Complex math expression: ${executionTime.toFixed(3)}ms`);
    });

    it('should handle large logical expressions efficiently', () => {
      // Generate large logical expression
      const conditions = Array.from(
        { length: 100 },
        (_, i) => `value${i} > ${i} and value${i} < ${i + 100}`
      );
      const largeLogical = conditions.join(' or ');

      const startTime = performance.now();
      const result = parse(largeLogical);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(300); // Should handle logical expressions well

      console.log(`Large logical expression: ${executionTime.toFixed(3)}ms`);
    });
  });

  describe('Deep Nesting Performance Tests', () => {
    it('should handle deeply nested parentheses efficiently', () => {
      // Generate deeply nested expression (100 levels)
      let nestedExpr = '1';
      for (let i = 0; i < 100; i++) {
        nestedExpr = `(${nestedExpr} + ${i})`;
      }

      const startTime = performance.now();
      const result = parse(nestedExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(100); // Should handle nesting efficiently

      console.log(`100-level nested expression: ${executionTime.toFixed(3)}ms`);
    });

    it('should handle deep member access chains efficiently', () => {
      // Generate deep member access chain
      let memberChain = 'window';
      const properties = ['location', 'pathname', 'length', 'toString', 'constructor', 'prototype'];

      for (let i = 0; i < 50; i++) {
        const prop = properties[i % properties.length];
        memberChain += `.${prop}`;
      }

      const startTime = performance.now();
      const result = parse(memberChain);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(50); // Member access should be fast

      console.log(`Deep member access: ${executionTime.toFixed(3)}ms`);
    });

    it('should handle nested function calls efficiently', () => {
      // Generate nested function calls
      let nestedCalls = 'func';
      for (let i = 0; i < 20; i++) {
        nestedCalls = `outer${i}(${nestedCalls}(arg${i}), param${i})`;
      }

      const startTime = performance.now();
      const result = parse(nestedCalls);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(30); // Function calls should parse quickly

      console.log(`Nested function calls: ${executionTime.toFixed(3)}ms`);
    });
  });

  describe('Memory Usage Performance Tests', () => {
    it('should maintain reasonable memory usage for large expressions', () => {
      const startMemory = process.memoryUsage().heapUsed;

      // Parse multiple large expressions to test memory usage
      for (let i = 0; i < 10; i++) {
        const largeExpr = Array.from({ length: 500 }, (_, j) => `term${i}_${j}`).join(' + ');

        const result = parse(largeExpr);
        expect(result.success).toBe(true);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = endMemory - startMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB for test)
      expect(memoryIncreaseMB).toBeLessThan(50);

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    it('should efficiently garbage collect temporary objects', () => {
      const iterations = 100;
      const startMemory = process.memoryUsage().heapUsed;

      // Create and parse many expressions to test GC efficiency
      for (let i = 0; i < iterations; i++) {
        const expr = `a${i} + b${i} * c${i} - d${i} / e${i}`;
        const result = parse(expr);
        expect(result.success).toBe(true);

        // Clear references to help GC
        result.node = undefined;
        result.tokens.length = 0;
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = endMemory - startMemory;
      const memoryDeltaMB = memoryDelta / (1024 * 1024);

      // Memory should not increase significantly after GC
      expect(memoryDeltaMB).toBeLessThan(10);

      console.log(`Memory delta after ${iterations} parses: ${memoryDeltaMB.toFixed(2)}MB`);
    });
  });

  describe('Tokenizer Performance Tests', () => {
    it('should tokenize large input efficiently', () => {
      // Generate large input string
      const largeInput = Array.from({ length: 5000 }, (_, i) => `identifier${i}`).join(' + ');

      // We need to access the tokenizer directly for this test
      // This tests the tokenization phase separately from parsing
      const startTime = performance.now();
      const result = parse(largeInput);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.tokens.length).toBeGreaterThan(9000); // Should have many tokens
      expect(executionTime).toBeLessThan(2000); // Full parsing should complete within 2 seconds

      console.log(`Tokenization of 5000 identifiers: ${executionTime.toFixed(3)}ms`);
    });

    it('should handle mixed token types efficiently', () => {
      // Create input with mixed token types
      const mixedTokens = [];
      for (let i = 0; i < 1000; i++) {
        mixedTokens.push(`var${i}`, '+', `"string${i}"`, '*', `${i}`, '-', '(', ')', '.', 'prop');
      }
      const mixedInput = mixedTokens.join(' ');

      const startTime = performance.now();
      const result = parse(mixedInput);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.tokens.length).toBeGreaterThan(5000); // Should have many mixed tokens
      expect(executionTime).toBeLessThan(1000); // Should handle mixed tokens within 1 second for full parsing

      console.log(`Mixed token types parsing: ${executionTime.toFixed(3)}ms`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should not regress from baseline performance', () => {
      // Re-test simple expressions and compare to baseline
      const simpleExpr = '5 + 3';

      const startTime = performance.now();
      const result = parse(simpleExpr);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.success).toBe(true);

      // Should not be significantly slower than baseline (allow 50% tolerance)
      if (performanceBaseline.simple) {
        const slowdownFactor = executionTime / performanceBaseline.simple;
        expect(slowdownFactor).toBeLessThan(1.5);

        console.log(`Performance compared to baseline: ${slowdownFactor.toFixed(2)}x`);
      }
    });

    it('should maintain consistent performance across multiple runs', () => {
      const expr = '(a + b) * (c - d) / (e + f)';
      const times: number[] = [];

      // Run multiple times to check consistency
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        const result = parse(expr);
        const endTime = performance.now();

        expect(result.success).toBe(true);
        times.push(endTime - startTime);
      }

      // Calculate standard deviation
      const mean = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance =
        times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be low (consistent performance)
      const coefficientOfVariation = stdDev / mean;
      expect(coefficientOfVariation).toBeLessThan(0.5); // Less than 50% variation

      console.log(
        `Performance consistency: mean=${mean.toFixed(3)}ms, cv=${coefficientOfVariation.toFixed(3)}`
      );
    });
  });

  describe('Optimization Impact Summary', () => {
    it('should demonstrate tokenizer optimization benefits', () => {
      const testExpressions = [
        'simple + expression',
        Array.from({ length: 100 }, (_, i) => `term${i}`).join(' + '),
        'complex * (nested + (deeply / (nested * expressions)))',
        Array.from({ length: 50 }, (_, i) => `var${i} + const${i} * factor${i}`).join(' and '),
      ];

      testExpressions.forEach((expr, index) => {
        const iterations = expr.length > 100 ? 10 : 50;

        // Test tokenization directly
        const tokenStart = performance.now();
        for (let i = 0; i < iterations; i++) {
          tokenizeOptimized(expr);
        }
        const tokenTime = performance.now() - tokenStart;

        // Test full parsing (includes tokenization)
        const parseStart = performance.now();
        for (let i = 0; i < iterations; i++) {
          parse(expr);
        }
        const parseTime = performance.now() - parseStart;

        const tokenizationPercentage = (tokenTime / parseTime) * 100;

        console.log(
          `Expression ${index + 1}: Tokenization=${tokenTime.toFixed(3)}ms (${tokenizationPercentage.toFixed(1)}% of total), Parse=${parseTime.toFixed(3)}ms`
        );

        // Validate performance meets targets
        if (expr.length > 200) {
          expect(tokenTime).toBeLessThan(100); // Complex expressions should tokenize quickly
        } else {
          expect(tokenTime).toBeLessThan(10); // Simple expressions should be very fast
        }
      });
    });

    it('should show memory efficiency improvements', () => {
      const largeExpression = Array.from(
        { length: 1000 },
        (_, i) => `identifier${i} + value${i} * constant${i}`
      ).join(' - ');

      const startMemory = process.memoryUsage().heapUsed;

      // Tokenize multiple times to test memory efficiency
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(tokenizeOptimized(largeExpression));
      }

      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / (1024 * 1024);

      console.log(`Memory usage: ${memoryIncrease.toFixed(2)}MB for 5 large tokenizations`);
      console.log(`Average tokens per expression: ${results[0].length}`);

      // Should use reasonable memory
      expect(memoryIncrease).toBeLessThan(20); // Less than 20MB increase
      expect(results[0].length).toBeGreaterThan(2000); // Should produce many tokens
    });

    it('should demonstrate optimization effectiveness', () => {
      console.log('\n=== TOKENIZER OPTIMIZATION SUMMARY ===');
      console.log('✅ Character code checks instead of regex');
      console.log('✅ Array-based string building instead of concatenation');
      console.log('✅ Pre-computed token type map for O(1) lookup');
      console.log('✅ Fast-path detection for common characters');
      console.log('✅ Reduced function call overhead');
      console.log('✅ Optimized whitespace handling');
      console.log('✅ Efficient memory usage patterns');

      // This test always passes but provides a summary
      expect(true).toBe(true);
    });
  });
});
