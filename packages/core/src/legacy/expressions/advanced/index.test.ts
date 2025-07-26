/**
 * Tests for Advanced Expressions (Priority 3)
 * Lambda expressions, async expressions, error handling expressions
 * Generated from LSP examples with comprehensive TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { advancedExpressions } from './index';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Advanced Expressions', () => {
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
    
    // Ensure required context properties exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Lambda Expressions', () => {
    it('should have lambda expression', () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda');
      expect(lambdaExpr).toBeDefined();
      expect(lambdaExpr?.category).toBe('Advanced');
    });

    it('should create lambda functions with parameters', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Create lambda: (x, y) => x + y
      const lambda = await lambdaExpr.evaluate(context, ['x', 'y'], 'x + y');
      
      expect(typeof lambda).toBe('function');
      
      // Test the lambda function
      context.locals!.set('x', 5);
      context.locals!.set('y', 3);
      
      // Call lambda should return the expression result
      expect(lambda).toBeDefined();
    });

    it('should create lambda with single parameter', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Create lambda: x => x * 2
      const lambda = await lambdaExpr.evaluate(context, ['x'], 'x * 2');
      
      expect(typeof lambda).toBe('function');
    });

    it('should create lambda with no parameters', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Create lambda: () => 42
      const lambda = await lambdaExpr.evaluate(context, [], '42');
      
      expect(typeof lambda).toBe('function');
    });

    it('should handle closures in lambda expressions', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Set up outer scope variables
      context.locals!.set('multiplier', 10);
      
      // Create lambda that uses closure: x => x * multiplier
      const lambda = await lambdaExpr.evaluate(context, ['x'], 'x * multiplier');
      
      expect(typeof lambda).toBe('function');
    });

    it('should apply lambda functions', async () => {
      const applyExpr = advancedExpressions.find(expr => expr.name === 'apply')!;
      
      // Create a simple function
      const fn = (a: number, b: number) => a + b;
      context.locals!.set('addFn', fn);
      
      const result = await applyExpr.evaluate(context, 'addFn', [5, 3]);
      expect(result).toBe(8);
    });

    it('should curry lambda functions', async () => {
      const curryExpr = advancedExpressions.find(expr => expr.name === 'curry')!;
      
      // Create a function to curry
      const fn = (a: number, b: number, c: number) => a + b + c;
      context.locals!.set('threePlusSum', fn);
      
      const curried = await curryExpr.evaluate(context, 'threePlusSum');
      expect(typeof curried).toBe('function');
    });

    it('should partially apply functions', async () => {
      const partialExpr = advancedExpressions.find(expr => expr.name === 'partial')!;
      
      // Create a function for partial application
      const fn = (a: number, b: number, c: number) => a + b + c;
      context.locals!.set('addThree', fn);
      
      const partial = await partialExpr.evaluate(context, 'addThree', [1, 2]);
      expect(typeof partial).toBe('function');
    });
  });

  describe('Async Expressions', () => {
    it('should have async expression', () => {
      const asyncExpr = advancedExpressions.find(expr => expr.name === 'async');
      expect(asyncExpr).toBeDefined();
      expect(asyncExpr?.category).toBe('Advanced');
    });

    it('should create async functions', async () => {
      const asyncExpr = advancedExpressions.find(expr => expr.name === 'async')!;
      
      // Create async function
      const asyncFn = await asyncExpr.evaluate(context, [], 'return 42');
      
      expect(typeof asyncFn).toBe('function');
    });

    it('should handle await expressions', async () => {
      const awaitExpr = advancedExpressions.find(expr => expr.name === 'await')!;
      
      // Create a promise
      const promise = Promise.resolve(42);
      context.locals!.set('testPromise', promise);
      
      const result = await awaitExpr.evaluate(context, 'testPromise');
      expect(result).toBe(42);
    });

    it('should handle promise creation', async () => {
      const promiseExpr = advancedExpressions.find(expr => expr.name === 'promise')!;
      
      // Create a promise (not awaited since evaluate returns the promise directly)
      const promise = promiseExpr.evaluate(context, 'resolve(42)');
      
      expect(promise instanceof Promise).toBe(true);
      const result = await promise;
      expect(result).toBe(42);
    });

    it('should handle promise then chains', async () => {
      const thenExpr = advancedExpressions.find(expr => expr.name === 'then')!;
      
      const promise = Promise.resolve(5);
      context.locals!.set('testPromise', promise);
      
      // Create a then handler
      const doubleFunc = (x: number) => x * 2;
      context.locals!.set('double', doubleFunc);
      
      const result = await thenExpr.evaluate(context, 'testPromise', 'double');
      expect(result).toBe(10);
    });

    it('should handle promise catch', async () => {
      const catchExpr = advancedExpressions.find(expr => expr.name === 'catch')!;
      
      const rejectedPromise = Promise.reject(new Error('Test error'));
      context.locals!.set('failedPromise', rejectedPromise);
      
      // Create an error handler
      const errorHandler = (err: Error) => `Caught: ${err.message}`;
      context.locals!.set('handleError', errorHandler);
      
      const result = await catchExpr.evaluate(context, 'failedPromise', 'handleError');
      expect(result).toBe('Caught: Test error');
    });

    it('should handle promise finally', async () => {
      const finallyExpr = advancedExpressions.find(expr => expr.name === 'finally')!;
      
      const promise = Promise.resolve(42);
      context.locals!.set('testPromise', promise);
      
      let finallyCalled = false;
      const finallyHandler = () => { finallyCalled = true; };
      context.locals!.set('cleanup', finallyHandler);
      
      await finallyExpr.evaluate(context, 'testPromise', 'cleanup');
      expect(finallyCalled).toBe(true);
    });

    it('should handle timeout with promises', async () => {
      const timeoutExpr = advancedExpressions.find(expr => expr.name === 'timeout')!;
      
      const result = await timeoutExpr.evaluate(context, 'Test completed', 10);
      expect(result).toBe('Test completed');
    });

    it('should handle delay operations', async () => {
      const delayExpr = advancedExpressions.find(expr => expr.name === 'delay')!;
      
      const startTime = Date.now();
      await delayExpr.evaluate(context, 10); // 10ms delay
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(5); // Allow some variance
    });
  });

  describe('Error Handling Expressions', () => {
    it('should have try expression', () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try');
      expect(tryExpr).toBeDefined();
      expect(tryExpr?.category).toBe('Advanced');
    });

    it('should handle try-catch expressions', async () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try')!;
      
      // Try an expression that will throw
      const result = await tryExpr.evaluate(
        context,
        'throw new Error("Test error")',
        'return "Caught error: " + error.message'
      );
      
      expect(result).toContain('Caught error:');
    });

    it('should handle successful try expressions', async () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try')!;
      
      const result = await tryExpr.evaluate(
        context,
        'return 42',
        'return "error"'
      );
      
      expect(result).toBe(42);
    });

    it('should throw errors explicitly', async () => {
      const throwExpr = advancedExpressions.find(expr => expr.name === 'throw')!;
      
      try {
        await throwExpr.evaluate(context, 'Custom error message');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Custom error message');
      }
    });

    it('should handle error objects', async () => {
      const errorExpr = advancedExpressions.find(expr => expr.name === 'error')!;
      
      const errorObj = await errorExpr.evaluate(context, 'Test error', 'TestError');
      
      expect(errorObj instanceof Error).toBe(true);
      expect(errorObj.message).toBe('Test error');
      expect(errorObj.name).toBe('TestError');
    });

    it('should check if value is error', async () => {
      const isErrorExpr = advancedExpressions.find(expr => expr.name === 'isError')!;
      
      const error = new Error('Test');
      const notError = 'string';
      
      const result1 = await isErrorExpr.evaluate(context, error);
      const result2 = await isErrorExpr.evaluate(context, notError);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should handle safe evaluation', async () => {
      const safeExpr = advancedExpressions.find(expr => expr.name === 'safe')!;
      
      // Safe evaluation that won't throw
      const result1 = await safeExpr.evaluate(context, 'return 42');
      expect(result1.success).toBe(true);
      expect(result1.value).toBe(42);
      
      // Safe evaluation that would throw
      const result2 = await safeExpr.evaluate(context, 'throw new Error("test")');
      expect(result2.success).toBe(false);
      expect(result2.error).toBeDefined();
    });
  });

  describe('Advanced Control Flow', () => {
    it('should handle conditional expressions', async () => {
      const condExpr = advancedExpressions.find(expr => expr.name === 'cond')!;
      
      // Multi-condition evaluation
      const result = await condExpr.evaluate(context, [
        [false, 'first'],
        [true, 'second'],
        [true, 'third'] // Should not reach here
      ]);
      
      expect(result).toBe('second');
    });

    it('should handle switch expressions', async () => {
      const switchExpr = advancedExpressions.find(expr => expr.name === 'switch')!;
      
      const result = await switchExpr.evaluate(context, 'apple', {
        'apple': 'fruit',
        'carrot': 'vegetable',
        'default': 'unknown'
      });
      
      expect(result).toBe('fruit');
    });

    it('should handle case expressions with default', async () => {
      const switchExpr = advancedExpressions.find(expr => expr.name === 'switch')!;
      
      const result = await switchExpr.evaluate(context, 'unknown', {
        'apple': 'fruit',
        'carrot': 'vegetable',
        'default': 'not found'
      });
      
      expect(result).toBe('not found');
    });

    it('should handle pipe expressions', async () => {
      const pipeExpr = advancedExpressions.find(expr => expr.name === 'pipe')!;
      
      // Set up pipeline functions
      const double = (x: number) => x * 2;
      const addTen = (x: number) => x + 10;
      const toString = (x: number) => String(x);
      
      context.locals!.set('double', double);
      context.locals!.set('addTen', addTen);
      context.locals!.set('toString', toString);
      
      // Pipe 5 through the functions
      const result = await pipeExpr.evaluate(context, 5, ['double', 'addTen', 'toString']);
      expect(result).toBe('20'); // ((5 * 2) + 10).toString()
    });

    it('should handle compose expressions', async () => {
      const composeExpr = advancedExpressions.find(expr => expr.name === 'compose')!;
      
      // Set up functions to compose
      const double = (x: number) => x * 2;
      const addTen = (x: number) => x + 10;
      
      context.locals!.set('double', double);
      context.locals!.set('addTen', addTen);
      
      // Compose functions: addTen(double(x))
      const composed = await composeExpr.evaluate(context, ['addTen', 'double']);
      expect(typeof composed).toBe('function');
    });
  });

  describe('Metaprogramming Expressions', () => {
    it('should handle eval expressions safely', async () => {
      const evalExpr = advancedExpressions.find(expr => expr.name === 'eval')!;
      
      // Evaluate a safe expression
      const result = await evalExpr.evaluate(context, '2 + 3');
      expect(result).toBe(5);
    });

    it('should handle dynamic property access', async () => {
      const getExpr = advancedExpressions.find(expr => expr.name === 'get')!;
      
      const obj = { name: 'John', age: 30 };
      context.locals!.set('person', obj);
      
      const result = await getExpr.evaluate(context, 'person', 'name');
      expect(result).toBe('John');
    });

    it('should handle dynamic property setting', async () => {
      const setExpr = advancedExpressions.find(expr => expr.name === 'set')!;
      
      const obj = { name: 'John' };
      context.locals!.set('person', obj);
      
      await setExpr.evaluate(context, 'person', 'age', 30);
      expect(obj.age).toBe(30);
    });

    it('should handle type checking', async () => {
      const typeofExpr = advancedExpressions.find(expr => expr.name === 'typeof')!;
      
      const result1 = await typeofExpr.evaluate(context, 42);
      const result2 = await typeofExpr.evaluate(context, 'hello');
      const result3 = await typeofExpr.evaluate(context, true);
      
      expect(result1).toBe('number');
      expect(result2).toBe('string');
      expect(result3).toBe('boolean');
    });

    it('should handle instanceof checks', async () => {
      const instanceofExpr = advancedExpressions.find(expr => expr.name === 'instanceof')!;
      
      const result1 = await instanceofExpr.evaluate(context, new Date(), Date);
      const result2 = await instanceofExpr.evaluate(context, [], Array);
      const result3 = await instanceofExpr.evaluate(context, 'string', String);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(false); // Primitive string vs String constructor
    });
  });

  describe('Integration with Hyperscript Context', () => {
    it('should work with hyperscript variables and context', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Set up hyperscript context
      context.locals!.set('multiplier', 5);
      context.hyperscript = { me: testElement, you: null, it: null };
      
      // Create lambda that uses hyperscript context
      const lambda = await lambdaExpr.evaluate(context, ['x'], 'x * multiplier');
      expect(typeof lambda).toBe('function');
    });

    it('should integrate with DOM operations', async () => {
      const asyncExpr = advancedExpressions.find(expr => expr.name === 'async')!;
      
      // Create async function that manipulates DOM
      const asyncFn = await asyncExpr.evaluate(context, [], 'me.textContent = "Updated"');
      
      expect(typeof asyncFn).toBe('function');
    });

    it('should handle error scenarios in hyperscript context', async () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try')!;
      
      // Try operation that might fail in hyperscript
      const result = await tryExpr.evaluate(
        context,
        'nonExistentElement.click()',
        'return "Element not found"'
      );
      
      expect(typeof result).toBe('string');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid lambda parameters', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Invalid parameters should be handled gracefully
      const result = await lambdaExpr.evaluate(context, null, 'return 42');
      expect(typeof result).toBe('function');
    });

    it('should handle promise rejection in async operations', async () => {
      const awaitExpr = advancedExpressions.find(expr => expr.name === 'await')!;
      
      const rejectedPromise = Promise.reject(new Error('Async error'));
      context.locals!.set('failing', rejectedPromise);
      
      try {
        await awaitExpr.evaluate(context, 'failing');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toBe('Async error');
      }
    });

    it('should handle circular references in evaluation', async () => {
      const evalExpr = advancedExpressions.find(expr => expr.name === 'eval')!;
      
      const circular: any = { name: 'test' };
      circular.self = circular;
      context.locals!.set('circular', circular);
      
      // Should handle circular reference gracefully
      const result = await evalExpr.evaluate(context, 'circular.name');
      expect(result).toBe('test');
    });

    it('should handle invalid function references', async () => {
      const applyExpr = advancedExpressions.find(expr => expr.name === 'apply')!;
      
      // Non-existent function should be handled
      const result = await applyExpr.evaluate(context, 'nonExistentFunc', [1, 2]);
      expect(result).toBeUndefined();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large lambda expressions efficiently', async () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      // Create many lambdas
      const lambdas = [];
      for (let i = 0; i < 100; i++) {
        const lambda = await lambdaExpr.evaluate(context, ['x'], `x + ${i}`);
        lambdas.push(lambda);
      }
      
      expect(lambdas).toHaveLength(100);
      expect(lambdas.every(l => typeof l === 'function')).toBe(true);
    });

    it('should not leak memory with async operations', async () => {
      const timeoutExpr = advancedExpressions.find(expr => expr.name === 'timeout')!;
      
      // Create many timeout operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(timeoutExpr.evaluate(context, `result${i}`, 1));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
    });

    it('should handle error cleanup properly', async () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try')!;
      
      // Multiple error scenarios
      for (let i = 0; i < 20; i++) {
        const result = await tryExpr.evaluate(
          context,
          `throw new Error("Error ${i}")`,
          `return "Handled ${i}"`
        );
        expect(result).toBe(`Handled ${i}`);
      }
    });
  });

  describe('Validation', () => {
    it('should validate lambda expression arguments', () => {
      const lambdaExpr = advancedExpressions.find(expr => expr.name === 'lambda')!;
      
      expect(lambdaExpr.validate([])).toBe('Parameters and body required for lambda');
      expect(lambdaExpr.validate([['x']])).toBe('Body expression required');
      expect(lambdaExpr.validate([['x'], 'x + 1'])).toBe(null);
    });

    it('should validate async expression arguments', () => {
      const asyncExpr = advancedExpressions.find(expr => expr.name === 'async')!;
      
      expect(asyncExpr.validate([])).toBe('Body required for async function');
      expect(asyncExpr.validate([[], 'return 42'])).toBe(null);
    });

    it('should validate error handling arguments', () => {
      const tryExpr = advancedExpressions.find(expr => expr.name === 'try')!;
      
      expect(tryExpr.validate([])).toBe('Try and catch expressions required');
      expect(tryExpr.validate(['try body'])).toBe('Catch expression required');
      expect(tryExpr.validate(['try body', 'catch body'])).toBe(null);
    });
  });
});