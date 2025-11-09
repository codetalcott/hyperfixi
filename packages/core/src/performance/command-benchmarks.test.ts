/**
 * Enhanced Command Performance Benchmarks
 * Real performance testing of enhanced TypeScript command implementations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { EnhancedBenchmark, BenchmarkResult } from './benchmarks';
import { HideCommand } from '../commands/dom/hide';
import { ShowCommand } from '../commands/dom/show';
import { AddCommand } from '../commands/dom/add';
import { PutCommand } from '../commands/dom/put';
import { TakeCommand } from '../commands/animation/take';
import { SettleCommand } from '../commands/animation/settle';
import { GoCommand } from '../commands/navigation/go';
import { createMockElement, createTypedExecutionContext } from '../test-utilities';

describe('Enhanced Command Performance Benchmarks', () => {
  let benchmark: EnhancedBenchmark;
  let testElement: HTMLElement;
  let context: ReturnType<typeof createTypedExecutionContext>;

  beforeEach(() => {
    benchmark = new EnhancedBenchmark();
    testElement = createMockElement('div');
    context = createTypedExecutionContext({ me: testElement });
  });

  describe('DOM Manipulation Commands', () => {
    test('HideCommand performance characteristics', async () => {
      const hideCommand = new HideCommand();

      const result = await benchmark.benchmark(
        'HideCommand.execute',
        'command',
        () => hideCommand.execute(context),
        {
          iterations: 1000,
          complexity: 'low',
          operationType: 'dom-manipulation',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(5); // Should be very fast
      expect(result.metadata.validationPassed).toBe(true);
      expect(result.totalTime).toBeGreaterThan(0);
    });

    test('ShowCommand performance characteristics', async () => {
      const showCommand = new ShowCommand();

      const result = await benchmark.benchmark(
        'ShowCommand.execute',
        'command',
        () => showCommand.execute(context),
        {
          iterations: 1000,
          complexity: 'low',
          operationType: 'dom-manipulation',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(5);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('AddCommand performance with class manipulation', async () => {
      const addCommand = new AddCommand();

      const result = await benchmark.benchmark(
        'AddCommand.execute',
        'command',
        () => addCommand.execute(context, 'test-class'),
        {
          iterations: 500,
          complexity: 'medium',
          operationType: 'class-manipulation',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(10);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Content Commands', () => {
    test('PutCommand performance with content insertion', async () => {
      const putCommand = new PutCommand();

      const result = await benchmark.benchmark(
        'PutCommand.execute',
        'command',
        () => putCommand.execute(context, 'Hello World', 'into'),
        {
          iterations: 300,
          complexity: 'medium',
          operationType: 'content-insertion',
          inputSize: 11, // Length of "Hello World"
        }
      );

      expect(result.averageTime).toBeLessThan(15);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('PutCommand performance with HTML content', async () => {
      const putCommand = new PutCommand();
      const htmlContent = '<div><span>Complex HTML</span></div>';

      const result = await benchmark.benchmark(
        'PutCommand.execute.html',
        'command',
        () => putCommand.execute(context, htmlContent, 'into'),
        {
          iterations: 200,
          complexity: 'high',
          operationType: 'html-insertion',
          inputSize: htmlContent.length,
        }
      );

      expect(result.averageTime).toBeLessThan(25);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Animation Commands', () => {
    test('TakeCommand performance with property transfer', async () => {
      const takeCommand = new TakeCommand();
      const sourceElement = createMockElement('div');
      sourceElement.classList.add('source-class');

      const result = await benchmark.benchmark(
        'TakeCommand.execute',
        'command',
        () => takeCommand.execute(context, 'class', 'from', sourceElement),
        {
          iterations: 200,
          complexity: 'high',
          operationType: 'property-transfer',
          inputSize: 3, // Number of arguments
        }
      );

      expect(result.averageTime).toBeLessThan(20);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('SettleCommand performance with timeout', async () => {
      const settleCommand = new SettleCommand();

      const result = await benchmark.benchmark(
        'SettleCommand.execute',
        'command',
        () => settleCommand.execute(context, 'for', 100),
        {
          iterations: 50, // Fewer iterations for settle operations
          complexity: 'high',
          operationType: 'animation-wait',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(150); // Include timeout overhead
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Navigation Commands', () => {
    test('GoCommand performance with URL navigation', async () => {
      const goCommand = new GoCommand();

      const result = await benchmark.benchmark(
        'GoCommand.execute.url',
        'command',
        () => goCommand.execute(context, 'url', 'https://example.com'),
        {
          iterations: 100,
          complexity: 'high',
          operationType: 'url-navigation',
          inputSize: 2,
        }
      );

      expect(result.averageTime).toBeLessThan(30);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('GoCommand performance with history navigation', async () => {
      const goCommand = new GoCommand();

      const result = await benchmark.benchmark(
        'GoCommand.execute.history',
        'command',
        () => goCommand.execute(context, 'back'),
        {
          iterations: 200,
          complexity: 'medium',
          operationType: 'history-navigation',
          inputSize: 1,
        }
      );

      expect(result.averageTime).toBeLessThan(15);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Validation Performance', () => {
    test('Input validation overhead measurement', async () => {
      const hideCommand = new HideCommand();

      const validationResult = await benchmark.benchmark(
        'HideCommand.validate',
        'validation',
        () => hideCommand.validate([]),
        {
          iterations: 2000,
          complexity: 'low',
          operationType: 'input-validation',
          inputSize: 0,
        }
      );

      const executionResult = await benchmark.benchmark(
        'HideCommand.execute.no-validation',
        'command',
        () => hideCommand.execute(context),
        {
          iterations: 2000,
          complexity: 'low',
          operationType: 'execution-only',
          inputSize: 0,
        }
      );

      // Validation should be fast relative to execution
      expect(validationResult.averageTime).toBeLessThan(2);
      expect(executionResult.averageTime).toBeGreaterThan(validationResult.averageTime);
    });

    test('Complex validation performance', async () => {
      const putCommand = new PutCommand();
      const complexArgs = ['<div>Complex HTML</div>', 'into', '#complex-selector'];

      const result = await benchmark.benchmark(
        'PutCommand.validate.complex',
        'validation',
        () => putCommand.validate(complexArgs),
        {
          iterations: 1000,
          complexity: 'medium',
          operationType: 'complex-validation',
          inputSize: complexArgs.length,
        }
      );

      expect(result.averageTime).toBeLessThan(5);
      expect(result.metadata.validationPassed).toBe(true);
    });
  });

  describe('Memory Usage Analysis', () => {
    test('Command instantiation memory overhead', async () => {
      const result = await benchmark.benchmark(
        'Command.instantiation',
        'integration',
        () => {
          // Create multiple command instances to measure memory overhead
          const commands = [
            new HideCommand(),
            new ShowCommand(),
            new AddCommand(),
            new PutCommand(),
            new TakeCommand(),
          ];
          return commands.length;
        },
        {
          iterations: 100,
          complexity: 'medium',
          operationType: 'instantiation',
          inputSize: 5,
        }
      );

      expect(result.memoryUsage?.heapUsed).toBeDefined();
      expect(result.memoryUsage!.heapUsed).toBeLessThan(1024 * 1024); // Less than 1MB
    });

    test('Large dataset processing memory efficiency', async () => {
      const addCommand = new AddCommand();
      const largeClassList = Array.from({ length: 100 }, (_, i) => `class-${i}`);

      const result = await benchmark.benchmark(
        'AddCommand.large-dataset',
        'command',
        () => addCommand.execute(context, ...largeClassList),
        {
          iterations: 50,
          complexity: 'high',
          operationType: 'large-dataset',
          inputSize: largeClassList.length,
        }
      );

      expect(result.memoryUsage?.heapUsed).toBeDefined();
      expect(result.averageTime).toBeLessThan(50); // Should handle large datasets efficiently
    });
  });

  describe('Integration Performance', () => {
    test('Command chaining performance', async () => {
      const hideCommand = new HideCommand();
      const showCommand = new ShowCommand();
      const addCommand = new AddCommand();

      const result = await benchmark.benchmark(
        'Command.chaining',
        'integration',
        async () => {
          await hideCommand.execute(context);
          await addCommand.execute(context, 'processed');
          await showCommand.execute(context);
          return true;
        },
        {
          iterations: 200,
          complexity: 'high',
          operationType: 'command-chaining',
          inputSize: 3,
        }
      );

      expect(result.averageTime).toBeLessThan(30);
      expect(result.metadata.validationPassed).toBe(true);
    });

    test('Error handling performance impact', async () => {
      const putCommand = new PutCommand();

      const successResult = await benchmark.benchmark(
        'PutCommand.success-path',
        'integration',
        () => putCommand.execute(context, 'content', 'into'),
        {
          iterations: 300,
          complexity: 'medium',
          operationType: 'success-path',
        }
      );

      const errorResult = await benchmark.benchmark(
        'PutCommand.error-path',
        'integration',
        () => putCommand.execute(context, 'content', 'invalid-position' as any),
        {
          iterations: 300,
          complexity: 'medium',
          operationType: 'error-path',
        }
      );

      // Error handling should not significantly impact performance
      expect(errorResult.averageTime).toBeLessThan(successResult.averageTime * 2);
    });
  });

  test('Generate comprehensive performance report', async () => {
    // Run a subset of benchmarks to generate a report
    const hideCommand = new HideCommand();
    const putCommand = new PutCommand();

    await benchmark.benchmark('HideCommand.quick', 'command', () => hideCommand.execute(context), {
      iterations: 100,
      operationType: 'dom',
    });

    await benchmark.benchmark(
      'PutCommand.quick',
      'command',
      () => putCommand.execute(context, 'test', 'into'),
      { iterations: 100, operationType: 'content' }
    );

    const suite = benchmark.generateSuite('Enhanced Commands Performance Suite');

    expect(suite.results.length).toBeGreaterThan(0);
    expect(suite.summary.totalTests).toBeGreaterThan(0);
    expect(suite.summary.fastestTest).not.toBe('none');
    expect(suite.summary.slowestTest).not.toBe('none');

    // Verify report formatting
    const report = benchmark.formatResults(suite);
    expect(report).toContain('Performance Benchmark');
    expect(report).toContain('COMMAND Performance');
    expect(report).toContain('Summary');
  });
});
