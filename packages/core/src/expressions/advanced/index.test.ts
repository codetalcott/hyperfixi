/**
 * Enhanced Advanced Expression Tests
 * Comprehensive testing of advanced operations with TypeScript integration
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  LambdaExpression,
  PromiseExpression,
  AwaitExpression,
  ErrorExpression,
  TypeofExpression,
  enhancedAdvancedExpressions,
  createLambda,
  createPromise,
  awaitPromise,
  createError,
  getTypeOf,
} from './index';
import type { TypedExecutionContext } from '../../types/command-types';

// Mock context for testing
function createMockContext(): TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: document.createElement('button'),
    it: null,
    locals: new Map<string, unknown>([
      ['x', 10],
      ['y', 5],
      ['user', { name: 'John', age: 30 }],
      ['addFunction', (a: number, b: number) => a + b],
    ]),
    globals: new Map<string, unknown>([
      ['PI', 3.14159],
      ['globalFunc', (x: number) => x * 2],
    ]),
    result: null,
    meta: {
      startTime: Date.now(),
      commandStack: [],
      debugMode: false,
    },
  };
}

describe('Enhanced Lambda Expression', () => {
  let expression: LambdaExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new LambdaExpression();
    context = createMockContext();
  });

  describe('Basic Lambda Creation', () => {
    test.skip('creates simple arithmetic lambda', async () => {
      const result = await expression.evaluate(context, { parameters: ['x', 'y'], body: 'x + y' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('function');
        expect(result.type).toBe('function');

        // Test the lambda function
        const lambdaResult = result.value!(3, 4);
        expect(lambdaResult).toBe(7);
      }
    });

    test.skip('creates property access lambda', async () => {
      const result = await expression.evaluate(context, {
        parameters: ['item'],
        body: 'item.name',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('function');

        // Test the lambda function
        const lambdaResult = result.value!({ name: 'Alice', age: 25 });
        expect(lambdaResult).toBe('Alice');
      }
    });

    test.skip('creates parameterless lambda', async () => {
      const result = await expression.evaluate(context, { parameters: [], body: 'true' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.value).toBe('function');

        // Test the lambda function
        const lambdaResult = result.value!();
        expect(lambdaResult).toBe(true);
      }
    });

    test.skip('handles variable access in lambda', async () => {
      const result = await expression.evaluate(context, { parameters: ['param'], body: 'param' });

      expect(result.success).toBe(true);
      if (result.success) {
        const lambdaResult = result.value!('test-value');
        expect(lambdaResult).toBe('test-value');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles invalid parameters', async () => {
      const result = await expression.evaluate(context, {
        parameters: 'not-array' as unknown as string[],
        body: 'x + y',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('INVALID_PARAMETERS');
      }
    });

    test.skip('handles invalid body', async () => {
      const result = await expression.evaluate(context, {
        parameters: ['x'],
        body: 123 as unknown as string,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('INVALID_BODY');
      }
    });
  });

  describe('Complex Lambda Evaluation', () => {
    test.skip('handles literal values', async () => {
      const tests = [
        { body: 'true', expected: true },
        { body: 'false', expected: false },
        { body: 'null', expected: null },
        { body: '42', expected: 42 },
        { body: 'test', expected: 'test' },
      ];

      for (const { body, expected } of tests) {
        const result = await expression.evaluate(context, { parameters: [], body });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value!()).toBe(expected);
        }
      }
    });
  });
});

describe('Enhanced Promise Expression', () => {
  let expression: PromiseExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new PromiseExpression();
    context = createMockContext();
  });

  describe('Promise Creation', () => {
    test.skip('creates resolving promise', async () => {
      const result = await expression.evaluate(context, 'resolve(42)');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Promise);
        expect(result.type).toBe('object');

        const promiseResult = await result.value;
        expect(promiseResult).toBe(42);
      }
    });

    test('creates rejecting promise', async () => {
      const result = await expression.evaluate(context, 'reject("error message")');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Promise);

        await expect(result.value).rejects.toThrow('error message');
      }
    });

    test('creates timeout promise', async () => {
      const result = await expression.evaluate(context, 'setTimeout(() => resolve("done"), 100)');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Promise);

        const promiseResult = await result.value;
        expect(promiseResult).toBe('done');
      }
    });

    test('handles default resolution', async () => {
      const result = await expression.evaluate(context, 'simple value');

      expect(result.success).toBe(true);
      if (result.success) {
        const promiseResult = await result.value;
        expect(promiseResult).toBe('simple value');
      }
    });
  });

  describe('Value Parsing', () => {
    test('parses string literals', async () => {
      const result = await expression.evaluate(context, 'resolve("hello world")');

      expect(result.success).toBe(true);
      if (result.success) {
        const promiseResult = await result.value;
        expect(promiseResult).toBe('hello world');
      }
    });

    test('parses numbers', async () => {
      const result = await expression.evaluate(context, 'resolve(123.45)');

      expect(result.success).toBe(true);
      if (result.success) {
        const promiseResult = await result.value;
        expect(promiseResult).toBe(123.45);
      }
    });

    test('parses booleans', async () => {
      const resolveTrue = await expression.evaluate(context, 'resolve(true)');
      const resolveFalse = await expression.evaluate(context, 'resolve(false)');

      expect(resolveTrue.success).toBe(true);
      expect(resolveFalse.success).toBe(true);

      if (resolveTrue.success && resolveFalse.success) {
        expect(await resolveTrue.value).toBe(true);
        expect(await resolveFalse.value).toBe(false);
      }
    });

    test('parses null', async () => {
      const result = await expression.evaluate(context, 'resolve(null)');

      expect(result.success).toBe(true);
      if (result.success) {
        const promiseResult = await result.value;
        expect(promiseResult).toBe(null);
      }
    });
  });
});

describe('Enhanced Await Expression', () => {
  let expression: AwaitExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new AwaitExpression();
    context = createMockContext();
  });

  describe('Promise Awaiting', () => {
    test('awaits resolved promise', async () => {
      const promise = Promise.resolve(42);
      const result = await expression.evaluate(context, promise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
        expect(result.type).toBe('number');
      }
    });

    test('handles rejected promise', async () => {
      const promise = Promise.reject(new Error('test error'));
      const result = await expression.evaluate(context, promise);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error!.code).toBe('AWAIT_FAILED');
        expect(result.error!.message).toBe('test error');
      }
    });

    test('handles non-promise values', async () => {
      const result = await expression.evaluate(context, 'not a promise');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('not a promise');
        expect(result.type).toBe('string');
      }
    });

    test('awaits complex promise resolution', async () => {
      const promise = new Promise<string>(resolve => {
        setTimeout(() => resolve('delayed result'), 10);
      });

      const result = await expression.evaluate(context, promise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('delayed result');
      }
    });
  });

  describe('Type Handling', () => {
    test('preserves result types', async () => {
      const tests = [
        { promise: Promise.resolve(42), expectedType: 'number' },
        { promise: Promise.resolve('hello'), expectedType: 'string' },
        { promise: Promise.resolve(true), expectedType: 'boolean' },
        { promise: Promise.resolve(null), expectedType: 'object' }, // typeof null === 'object'
        { promise: Promise.resolve([1, 2, 3]), expectedType: 'object' },
      ];

      for (const { promise, expectedType } of tests) {
        const result = await expression.evaluate(context, promise);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.type).toBe(expectedType);
        }
      }
    });
  });
});

describe('Enhanced Error Expression', () => {
  let expression: ErrorExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new ErrorExpression();
    context = createMockContext();
  });

  describe('Error Creation', () => {
    test.skip('creates basic error', async () => {
      const result = await expression.evaluate(context, 'Something went wrong');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Error);
        expect(result.value!.message).toBe('Something went wrong');
        expect(result.type).toBe('object');
      }
    });

    test('creates error with custom name', async () => {
      const result = await expression.evaluate(context, 'Validation failed', 'ValidationError');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Error);
        expect(result.value!.message).toBe('Validation failed');
        expect(result.value!.name).toBe('ValidationError');
      }
    });

    test('creates error with custom code', async () => {
      const result = await expression.evaluate(context, 'Network timeout', 'NetworkError', 'E001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Error);
        expect(result.value!.message).toBe('Network timeout');
        expect(result.value!.name).toBe('NetworkError');
        expect((result.value as Error & { code: string }).code).toBe('E001');
      }
    });

    test('handles non-string inputs', async () => {
      const result = await expression.evaluate(
        context,
        123 as unknown as string,
        456 as unknown as string,
        789 as unknown as string
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Error);
        expect(result.value!.message).toBe('123');
        expect(result.value!.name).toBe('456');
        expect((result.value as Error & { code: string }).code).toBe('789');
      }
    });
  });

  describe('Error Properties', () => {
    test('maintains error instanceof relationship', async () => {
      const result = await expression.evaluate(context, 'test error');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value instanceof Error).toBe(true);
        expect(result.value instanceof Object).toBe(true);
      }
    });

    test('supports error serialization', async () => {
      const result = await expression.evaluate(
        context,
        'serializable error',
        'TestError',
        'TEST_001'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const error = result.value!;
        expect(error.toString()).toContain('TestError');
        expect(error.toString()).toContain('serializable error');
      }
    });
  });
});

describe('Enhanced Typeof Expression', () => {
  let expression: TypeofExpression;
  let context: TypedExecutionContext;

  beforeEach(() => {
    expression = new TypeofExpression();
    context = createMockContext();
  });

  describe('Basic Type Detection', () => {
    test('detects primitive types', async () => {
      const tests = [
        { value: 42, expected: 'number' },
        { value: 'hello', expected: 'string' },
        { value: true, expected: 'boolean' },
        { value: false, expected: 'boolean' },
        { value: undefined, expected: 'undefined' },
        { value: Symbol('test'), expected: 'symbol' },
      ];

      for (const { value, expected } of tests) {
        const result = await expression.evaluate(context, value);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(expected);
          expect(result.type).toBe('string');
        }
      }
    });

    test('detects null specifically', async () => {
      const result = await expression.evaluate(context, null);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('null');
      }
    });

    test('detects function type', async () => {
      const result = await expression.evaluate(context, () => {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('function');
      }
    });
  });

  describe('Object Type Detection', () => {
    test('detects array type', async () => {
      const result = await expression.evaluate(context, [1, 2, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('array');
      }
    });

    test('detects date type', async () => {
      const result = await expression.evaluate(context, new Date());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('date');
      }
    });

    test('detects error type', async () => {
      const result = await expression.evaluate(context, new Error('test'));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('error');
      }
    });

    test('detects promise type', async () => {
      const result = await expression.evaluate(context, Promise.resolve(42));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('promise');
      }
    });

    test('detects regexp type', async () => {
      const result = await expression.evaluate(context, /test/g);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('regexp');
      }
    });

    test('detects plain object', async () => {
      const result = await expression.evaluate(context, { key: 'value' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('object');
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles circular objects', async () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      const result = await expression.evaluate(context, circular);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('object');
      }
    });

    test('handles complex nested objects', async () => {
      const complex = {
        numbers: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        func: () => 'hello',
        date: new Date(),
      };

      const result = await expression.evaluate(context, complex);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('object');
      }
    });
  });
});

describe('Expression Registry', () => {
  test('exports all enhanced advanced expressions', () => {
    expect(enhancedAdvancedExpressions['lambda']).toBeInstanceOf(LambdaExpression);
    expect(enhancedAdvancedExpressions['promise']).toBeInstanceOf(PromiseExpression);
    expect(enhancedAdvancedExpressions['await']).toBeInstanceOf(AwaitExpression);
    expect(enhancedAdvancedExpressions['error']).toBeInstanceOf(ErrorExpression);
    expect(enhancedAdvancedExpressions['typeof']).toBeInstanceOf(TypeofExpression);
  });
});

describe('Utility Functions', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test('createLambda utility works', async () => {
    const result = await createLambda(['x', 'y'], 'x + y', context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.value).toBe('function');
      expect(result.value!(3, 4)).toBe(7);
    }
  });

  test('createPromise utility works', async () => {
    const result = await createPromise('resolve(42)', context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(Promise);
      expect(await result.value).toBe(42);
    }
  });

  test('awaitPromise utility works', async () => {
    const promise = Promise.resolve('test result');
    const result = await awaitPromise(promise, context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('test result');
    }
  });

  test('createError utility works', async () => {
    const result = await createError('Test error', context, 'TestError', 'T001');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(Error);
      expect(result.value!.message).toBe('Test error');
      expect(result.value!.name).toBe('TestError');
      expect((result.value as Error & { code: string }).code).toBe('T001');
    }
  });

  test('getTypeOf utility works', async () => {
    const result = await getTypeOf([1, 2, 3], context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBe('array');
    }
  });
});

describe('Performance Characteristics', () => {
  let context: TypedExecutionContext;

  beforeEach(() => {
    context = createMockContext();
  });

  test.skip('handles many lambda creations efficiently', async () => {
    const expr = new LambdaExpression();
    const lambdaCount = 100;

    const startTime = performance.now();
    const promises = Array(lambdaCount)
      .fill(0)
      .map((_, i) => expr.evaluate(context, { parameters: ['x'], body: `x + ${i}` }));
    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be very fast
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 100 operations
  });

  test('handles many type checks efficiently', async () => {
    const expr = new TypeofExpression();
    const values = [42, 'string', true, [], {}, null, new Date(), /regex/];
    const iterations = 50;

    const startTime = performance.now();
    const promises = [];

    for (let i = 0; i < iterations; i++) {
      for (const value of values) {
        promises.push(expr.evaluate(context, value));
      }
    }

    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be very fast
    expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 400 operations
  });

  test('handles async operations efficiently', async () => {
    const promiseExpr = new PromiseExpression();
    const awaitExpr = new AwaitExpression();

    const startTime = performance.now();

    // Create and await multiple promises
    const promises = Array(20)
      .fill(0)
      .map(async (_, i) => {
        const promiseResult = await promiseExpr.evaluate(context, `resolve(${i})`);
        if (promiseResult.success) {
          return awaitExpr.evaluate(context, promiseResult.value);
        }
        return promiseResult;
      });

    const results = await Promise.all(promises);
    const endTime = performance.now();

    // All should succeed
    results.forEach(result => {
      expect(result.success).toBe(true);
    });

    // Should be reasonably fast for async operations
    expect(endTime - startTime).toBeLessThan(200); // Less than 200ms for 20 async operations
  });
});
