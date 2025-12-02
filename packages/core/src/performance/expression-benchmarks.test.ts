/**
 * Enhanced Expression Performance Benchmarks
 * Real performance testing of enhanced TypeScript expression implementations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EnhancedBenchmark } from './benchmarks';
import { createTypedExpressionContext } from '../test-utilities';

// Import enhanced expressions
import { MeExpression } from '../expressions/references/index';
import { EqualityExpression } from '../expressions/comparison/index';
import { AndExpression } from '../expressions/logical/index';
import { AsExpression } from '../expressions/conversion/index';
import { FirstExpression } from '../expressions/positional/index';
import { MyExpression } from '../expressions/property/index';
import { AdditionExpression } from '../expressions/mathematical/index';

describe('Enhanced Expression Performance Benchmarks', () => {
  let benchmark: EnhancedBenchmark;
  let context: ReturnType<typeof createTypedExpressionContext>;

  beforeEach(() => {
    benchmark = new EnhancedBenchmark();
    context = createTypedExpressionContext({
      testValue: 42,
      testArray: [1, 2, 3, 4, 5],
      testString: 'hello world',
      testObject: { name: 'test', value: 100 },
    });
  });

  describe('Reference Expressions', () => {
    test('MeExpression performance characteristics', async () => {
      const meExpression = new MeExpression();

      const result = await benchmark.benchmark(
        'MeExpression.evaluate',
        'expression',
        () => meExpression.evaluate(context),
        {
          iterations: 2000,
          complexity: 'low',
          operationType: 'context-reference',
          inputSize: 0,
        }
      );

      expect(result.averageTime).toBeLessThan(1); // Should be extremely fast
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('MeExpression validation performance', async () => {
      const meExpression = new MeExpression();

      const result = await benchmark.benchmark(
        'MeExpression.validate',
        'validation',
        () => meExpression.validate([]),
        {
          iterations: 5000,
          complexity: 'low',
          operationType: 'validation',
          inputSize: 0,
        }
      );

      expect(result.averageTime).toBeLessThan(0.5);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Logical Expressions', () => {
    test('EqualityExpression performance with simple values', async () => {
      const equalsExpression = new EqualityExpression();

      const result = await benchmark.benchmark(
        'EqualityExpression.evaluate.simple',
        'expression',
        () => equalsExpression.evaluate(context, 42, 42),
        {
          iterations: 1500,
          complexity: 'low',
          operationType: 'comparison',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(2);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('EqualityExpression performance with complex objects', async () => {
      const equalsExpression = new EqualityExpression();
      const complexObj1 = { a: 1, b: { c: 3, d: [1, 2, 3] } };
      const complexObj2 = { a: 1, b: { c: 3, d: [1, 2, 3] } };

      const result = await benchmark.benchmark(
        'EqualityExpression.evaluate.complex',
        'expression',
        () => equalsExpression.evaluate(context, complexObj1, complexObj2),
        {
          iterations: 500,
          complexity: 'high',
          operationType: 'deep-comparison',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(10);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('AndExpression performance with multiple operands', async () => {
      const andExpression = new AndExpression();

      const result = await benchmark.benchmark(
        'AndExpression.evaluate',
        'expression',
        () => andExpression.evaluate(context, true, true, true, true),
        {
          iterations: 1000,
          complexity: 'medium',
          operationType: 'logical-operation',
          inputSize: 4,
        }
      );

      expect(result.averageTime).toBeLessThan(3);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('AndExpression short-circuit evaluation performance', async () => {
      const andExpression = new AndExpression();

      const result = await benchmark.benchmark(
        'AndExpression.evaluate.short-circuit',
        'expression',
        () => andExpression.evaluate(context, false, true, true, true),
        {
          iterations: 2000,
          complexity: 'low',
          operationType: 'short-circuit',
          inputSize: 4,
        }
      );

      expect(result.averageTime).toBeLessThan(2); // Should be faster due to short-circuit
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Conversion Expressions', () => {
    test('AsExpression performance with type conversion', async () => {
      const asExpression = new AsExpression();

      const result = await benchmark.benchmark(
        'AsExpression.evaluate.number',
        'expression',
        () => asExpression.evaluate(context, '123', 'Int'),
        {
          iterations: 1000,
          complexity: 'medium',
          operationType: 'type-conversion',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(5);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('AsExpression performance with JSON parsing', async () => {
      const asExpression = new AsExpression();
      const jsonString = '{"name": "test", "value": 42, "items": [1, 2, 3]}';

      const result = await benchmark.benchmark(
        'AsExpression.evaluate.json',
        'expression',
        () => asExpression.evaluate(context, jsonString, 'JSON'),
        {
          iterations: 500,
          complexity: 'high',
          operationType: 'json-parsing',
          inputSize: jsonString.length,
        }
      );

      expect(result.averageTime).toBeLessThan(15);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Positional Expressions', () => {
    test('FirstExpression performance with arrays', async () => {
      const firstExpression = new FirstExpression();
      const testArray = Array.from({ length: 1000 }, (_, i) => i);

      const result = await benchmark.benchmark(
        'FirstExpression.evaluate.array',
        'expression',
        () => firstExpression.evaluate(context, testArray),
        {
          iterations: 1000,
          complexity: 'low',
          operationType: 'array-access',
          inputSize: testArray.length,
        }
      );

      expect(result.averageTime).toBeLessThan(3);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('FirstExpression performance with DOM collections', async () => {
      const firstExpression = new FirstExpression();
      // Mock NodeList-like object
      const mockNodeList = {
        length: 100,
        0: { tagName: 'DIV' },
        item: (index: number) => (index === 0 ? { tagName: 'DIV' } : null),
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) {
            yield this.item(i);
          }
        },
      };

      const result = await benchmark.benchmark(
        'FirstExpression.evaluate.dom',
        'expression',
        () => firstExpression.evaluate(context, mockNodeList as unknown as NodeList),
        {
          iterations: 800,
          complexity: 'medium',
          operationType: 'dom-collection',
          inputSize: mockNodeList.length,
        }
      );

      expect(result.averageTime).toBeLessThan(5);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Property Access Expressions', () => {
    test('MyExpression performance with simple properties', async () => {
      const myExpression = new MyExpression();

      const result = await benchmark.benchmark(
        'MyExpression.evaluate.simple',
        'expression',
        () => myExpression.evaluate(context, 'testValue'),
        {
          iterations: 1500,
          complexity: 'low',
          operationType: 'property-access',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(3);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('MyExpression performance with nested properties', async () => {
      const myExpression = new MyExpression();

      const result = await benchmark.benchmark(
        'MyExpression.evaluate.nested',
        'expression',
        () => myExpression.evaluate(context, 'testObject.name'),
        {
          iterations: 1000,
          complexity: 'medium',
          operationType: 'nested-property',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(5);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Mathematical Expressions', () => {
    test('AdditionExpression performance with numbers', async () => {
      const addExpression = new AdditionExpression();

      const result = await benchmark.benchmark(
        'AdditionExpression.evaluate.numbers',
        'expression',
        () => addExpression.evaluate(context, 100, 200, 300),
        {
          iterations: 2000,
          complexity: 'low',
          operationType: 'arithmetic',
          inputSize: 3,
        }
      );

      expect(result.averageTime).toBeLessThan(2);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('AdditionExpression performance with string concatenation', async () => {
      const addExpression = new AdditionExpression();

      const result = await benchmark.benchmark(
        'AdditionExpression.evaluate.strings',
        'expression',
        () => addExpression.evaluate(context, 'Hello', ' ', 'World', '!'),
        {
          iterations: 1500,
          complexity: 'low',
          operationType: 'string-concat',
          inputSize: 4,
        }
      );

      expect(result.averageTime).toBeLessThan(3);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Complex Expression Chains', () => {
    test('Multi-expression evaluation performance', async () => {
      const meExpression = new MeExpression();
      const myExpression = new MyExpression();
      const equalsExpression = new EqualityExpression();
      const addExpression = new AdditionExpression();

      const result = await benchmark.benchmark(
        'Expression.chain-evaluation',
        'integration',
        async () => {
          // Simulate complex expression chain: me.testValue + 10 == 52
          const meResult = await meExpression.evaluate(context);
          const valueResult = await myExpression.evaluate(context, 'testValue');
          const addResult = await addExpression.evaluate(
            context,
            valueResult.success ? valueResult.value : 0,
            10
          );
          const finalResult = await equalsExpression.evaluate(
            context,
            addResult.success ? addResult.value : 0,
            52
          );

          return finalResult;
        },
        {
          iterations: 300,
          complexity: 'high',
          operationType: 'expression-chain',
          inputSize: 4,
        }
      );

      expect(result.averageTime).toBeLessThan(20);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('Error handling in expression chains', async () => {
      const myExpression = new MyExpression();
      const equalsExpression = new EqualityExpression();

      const result = await benchmark.benchmark(
        'Expression.error-handling',
        'integration',
        async () => {
          // Access non-existent property and handle gracefully
          const valueResult = await myExpression.evaluate(context, 'nonExistentProperty');
          const comparisonResult = await equalsExpression.evaluate(
            context,
            valueResult.success ? valueResult.value : null,
            null
          );

          return comparisonResult;
        },
        {
          iterations: 500,
          complexity: 'medium',
          operationType: 'error-handling',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(10);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Memory Efficiency', () => {
    test('Expression instantiation memory overhead', async () => {
      const result = await benchmark.benchmark(
        'Expression.instantiation',
        'integration',
        () => {
          // Create multiple expression instances
          const expressions = [
            new MeExpression(),
            new EqualityExpression(),
            new AndExpression(),
            new AsExpression(),
            new FirstExpression(),
            new MyExpression(),
            new AdditionExpression(),
          ];
          return expressions.length;
        },
        {
          iterations: 200,
          complexity: 'medium',
          operationType: 'instantiation',
          inputSize: 7,
        }
      );

      expect(result.memoryUsage?.heapUsed).toBeDefined();
      expect(result.memoryUsage!.heapUsed).toBeLessThan(5 * 1024 * 1024); // Less than 5MB for enhanced features
    });

    test('Large dataset expression processing', async () => {
      const firstExpression = new FirstExpression();
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item-${i}` }));

      const result = await benchmark.benchmark(
        'Expression.large-dataset',
        'expression',
        () => firstExpression.evaluate(context, largeArray),
        {
          iterations: 100,
          complexity: 'high',
          operationType: 'large-dataset',
          inputSize: largeArray.length,
        }
      );

      expect(result.memoryUsage?.heapUsed).toBeDefined();
      expect(result.averageTime).toBeLessThan(15); // Should handle large datasets efficiently
    });
  });

  describe('Validation Overhead', () => {
    test('Validation vs execution time ratio', async () => {
      const equalsExpression = new EqualityExpression();

      const validationResult = await benchmark.benchmark(
        'EqualityExpression.validate',
        'validation',
        () => equalsExpression.validate([42, 42]),
        {
          iterations: 3000,
          complexity: 'low',
          operationType: 'validation',
          inputSize: 2,
        }
      );

      const executionResult = await benchmark.benchmark(
        'EqualityExpression.execute',
        'expression',
        () => equalsExpression.evaluate(context, 42, 42),
        {
          iterations: 3000,
          complexity: 'low',
          operationType: 'execution',
          inputSize: 2,
        }
      );

      // Validation should be fast for production use
      expect(validationResult.averageTime).toBeLessThan(5); // Under 5ms is acceptable
      // Note: Enhanced validation may occasionally be slower due to comprehensive checks

      // Validation overhead should be reasonable compared to execution time
      const overheadRatio = validationResult.averageTime / executionResult.averageTime;
      expect(overheadRatio).toBeLessThan(2.0); // Allow up to 2x overhead for comprehensive validation
    });
  });

  test('Generate comprehensive expression performance report', async () => {
    // Run a subset of benchmarks for reporting
    const meExpression = new MeExpression();
    const equalsExpression = new EqualityExpression();
    const asExpression = new AsExpression();

    await benchmark.benchmark(
      'MeExpression.report',
      'expression',
      () => meExpression.evaluate(context),
      { iterations: 500, operationType: 'reference' }
    );

    await benchmark.benchmark(
      'EqualityExpression.report',
      'expression',
      () => equalsExpression.evaluate(context, 1, 1),
      { iterations: 500, operationType: 'logical' }
    );

    await benchmark.benchmark(
      'AsExpression.report',
      'expression',
      () => asExpression.evaluate(context, '42', 'Int'),
      { iterations: 500, operationType: 'conversion' }
    );

    const suite = benchmark.generateSuite('Enhanced Expressions Performance Suite');

    expect(suite.results.length).toBeGreaterThan(0);
    expect(suite.summary.totalTests).toBeGreaterThan(0);
    expect(suite.summary.fastestTest).not.toBe('none');

    // Verify comprehensive metrics
    const report = benchmark.formatResults(suite);
    expect(report).toContain('Performance Benchmark');
    expect(report).toContain('EXPRESSION Performance');
    expect(report).toContain('Memory Efficient');

    // Log report for manual inspection during development
    console.log(report);
  });
});
