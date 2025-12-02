/**
 * Enhanced Function Calls Expression Tests
 * Comprehensive testing of JavaScript function invocation with TypeScript integration
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  EnhancedFunctionCallExpression,
  createFunctionCallExpression,
  callFunction,
} from './index';
import { createTypedExpressionContext } from '../../test-utilities';
import type { TypedExpressionContext } from '../../types/command-types';

describe('Enhanced Function Call Expression', () => {
  let functionCallExpression: EnhancedFunctionCallExpression;
  let context: TypedExpressionContext;

  beforeEach(() => {
    functionCallExpression = new EnhancedFunctionCallExpression();
    context = createTypedExpressionContext();
  });

  afterEach(() => {
    // Clean up any global functions added during tests
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any).testIdentity;
      delete (globalThis as any).testAsync;
      delete (globalThis as any).testObj;
    }
  });

  describe('Input Validation', () => {
    test('validates correct function call input', async () => {
      const result = await functionCallExpression.validate(['testFunction', ['arg1', 'arg2']]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('accepts function without arguments', async () => {
      const result = await functionCallExpression.validate(['testFunction']);
      expect(result.isValid).toBe(true);
    });

    test('accepts direct function reference', async () => {
      const testFunc = () => 'test';
      const result = await functionCallExpression.validate([testFunc, []]);
      expect(result.isValid).toBe(true);
    });

    test('rejects empty function name', async () => {
      const result = await functionCallExpression.validate(['', []]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Function name cannot be empty');
    });

    test('rejects invalid function path', async () => {
      const result = await functionCallExpression.validate(['obj..method', []]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('consecutive dots');
    });

    test('warns about dangerous functions', async () => {
      const result = await functionCallExpression.validate(['eval', ['code']]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('security risks');
    });

    test('rejects invalid arguments format', async () => {
      const result = await functionCallExpression.validate(['testFunc', 'not-an-array']);
      expect(result.isValid).toBe(false);
      // Schema validation catches invalid format before custom validation
      expect(result.errors[0].message).toContain('does not match');
    });
  });

  describe('Global Function Calls', () => {
    test('calls global function with string argument', async () => {
      // Setup global function
      (globalThis as any).testIdentity = (x: string) => x;

      const result = await functionCallExpression.evaluate(context, 'testIdentity', ['hello']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('hello');
        expect(result.type).toBe('string');
      }
    });

    test('calls global function with multiple arguments', async () => {
      // Setup global function
      (globalThis as any).testAdd = (a: number, b: number) => a + b;

      const result = await functionCallExpression.evaluate(context, 'testAdd', [5, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(8);
        expect(result.type).toBe('number');
      }

      delete (globalThis as any).testAdd;
    });

    test('calls function with no arguments', async () => {
      // Setup global function
      (globalThis as any).testNoArgs = () => 'no-args-result';

      const result = await functionCallExpression.evaluate(context, 'testNoArgs', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('no-args-result');
        expect(result.type).toBe('string');
      }

      delete (globalThis as any).testNoArgs;
    });

    test('calls function without arguments parameter', async () => {
      // Setup global function
      (globalThis as any).testNoArgsParam = () => 'no-args-param-result';

      const result = await functionCallExpression.evaluate(context, 'testNoArgsParam');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('no-args-param-result');
        expect(result.type).toBe('string');
      }

      delete (globalThis as any).testNoArgsParam;
    });
  });

  describe('Method Calls on Objects', () => {
    test('calls method on global object', async () => {
      // Setup global object with method
      (globalThis as any).testObj = {
        value: 'test-value',
        getValue() {
          return this.value;
        },
      };

      const result = await functionCallExpression.evaluate(context, 'testObj.getValue', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test-value');
        expect(result.type).toBe('string');
      }
    });

    test('calls method with proper this binding', async () => {
      // Setup global object
      (globalThis as any).testObj = {
        multiplier: 10,
        multiply(value: number) {
          return value * this.multiplier;
        },
      };

      const result = await functionCallExpression.evaluate(context, 'testObj.multiply', [5]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(50);
        expect(result.type).toBe('number');
      }
    });

    test('calls method on context object', async () => {
      const contextObj = {
        prefix: 'Hello',
        greet(name: string) {
          return `${this.prefix}, ${name}!`;
        },
      };

      context.locals.set('contextObj', contextObj);

      const result = await functionCallExpression.evaluate(context, 'contextObj.greet', ['World']);

      if (!result.success) {
        console.log('Error:', result.error);
      }

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('Hello, World!');
        expect(result.type).toBe('string');
      }
    });

    test('calls nested method', async () => {
      (globalThis as any).testObj = {
        utils: {
          format: {
            capitalize(str: string) {
              return str.charAt(0).toUpperCase() + str.slice(1);
            },
          },
        },
      };

      const result = await functionCallExpression.evaluate(
        context,
        'testObj.utils.format.capitalize',
        ['hello']
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('Hello');
      }
    });
  });

  describe('Direct Function Reference', () => {
    test('calls direct function reference', async () => {
      const testFunc = (x: number) => x * 2;

      const result = await functionCallExpression.evaluate(context, testFunc, [21]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
        expect(result.type).toBe('number');
      }
    });

    test('calls arrow function', async () => {
      const arrowFunc = (a: string, b: string) => `${a}-${b}`;

      const result = await functionCallExpression.evaluate(context, arrowFunc, ['foo', 'bar']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('foo-bar');
      }
    });
  });

  describe('Async Function Support', () => {
    test('calls async function and awaits result', async () => {
      const asyncFunc = async (value: string) => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return `async-${value}`;
      };

      (globalThis as any).testAsync = asyncFunc;

      const result = await functionCallExpression.evaluate(context, 'testAsync', ['test']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('async-test');
        expect(result.type).toBe('string');
      }
    });

    test('handles promise arguments', async () => {
      const promiseArg = Promise.resolve(42);
      const testFunc = (x: number) => x + 10;

      (globalThis as any).testPromiseArg = testFunc;

      const result = await functionCallExpression.evaluate(context, 'testPromiseArg', [promiseArg]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(52);
      }
    });

    test('handles multiple promise arguments', async () => {
      const promise1 = Promise.resolve(10);
      const promise2 = Promise.resolve(20);
      const testFunc = (a: number, b: number) => a + b;

      (globalThis as any).testMultiplePromises = testFunc;

      const result = await functionCallExpression.evaluate(context, 'testMultiplePromises', [
        promise1,
        promise2,
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(30);
      }
    });
  });

  describe('Context Resolution', () => {
    test('resolves function from locals', async () => {
      const localFunc = (x: string) => `local-${x}`;
      context.locals.set('localFunc', localFunc);

      const result = await functionCallExpression.evaluate(context, 'localFunc', ['test']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('local-test');
      }
    });

    test('resolves function from variables', async () => {
      const variableFunc = (x: number) => x * 3;
      context.variables.set('variableFunc', variableFunc);

      const result = await functionCallExpression.evaluate(context, 'variableFunc', [7]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(21);
      }
    });

    test('resolves function from meta context', async () => {
      const metaFunc = () => 'meta-result';
      context.meta.set('metaFunc', metaFunc);

      const result = await functionCallExpression.evaluate(context, 'metaFunc', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('meta-result');
      }
    });

    test('prioritizes local context over global', async () => {
      // Set global function
      (globalThis as any).priorityTest = () => 'global';

      // Set local function with same name
      const localFunc = () => 'local';
      context.locals.set('priorityTest', localFunc);

      const result = await functionCallExpression.evaluate(context, 'priorityTest', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('local'); // Should prefer local
      }

      delete (globalThis as any).priorityTest;
    });
  });

  describe('Constructor Calls', () => {
    test('validates constructor call input', async () => {
      const result = await functionCallExpression.validate(['new', 'Date', []]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validates constructor call without arguments', async () => {
      const result = await functionCallExpression.validate(['new', 'Date']);
      expect(result.isValid).toBe(true);
    });

    test('rejects empty constructor name', async () => {
      const result = await functionCallExpression.validate(['new', '', []]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Constructor name cannot be empty');
    });

    test('warns about dangerous constructors', async () => {
      const result = await functionCallExpression.validate(['new', 'Function', ['code']]);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('security risks');
    });

    test('calls Date constructor', async () => {
      const result = await functionCallExpression.evaluate(context, 'new', 'Date', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Date);
        expect(result.type).toBe('object');
      }
    });

    test('calls Array constructor with arguments', async () => {
      const result = await functionCallExpression.evaluate(context, 'new', 'Array', [5]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.value)).toBe(true);
        expect((result.value as Array<any>).length).toBe(5);
        expect(result.type).toBe('array');
      }
    });

    test('handles constructor not found', async () => {
      const result = await functionCallExpression.evaluate(
        context,
        'new',
        'NonExistentConstructor'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('ConstructorNotFoundError');
        expect(result.error.message).toContain('not found');
      }
    });

    test('handles constructor execution errors', async () => {
      const errorConstructor = function () {
        throw new Error('Constructor error');
      };

      (globalThis as any).ErrorConstructor = errorConstructor;

      const result = await functionCallExpression.evaluate(context, 'new', 'ErrorConstructor');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('ConstructorExecutionError');
        expect(result.error.message).toContain('Constructor error');
      }

      delete (globalThis as any).ErrorConstructor;
    });
  });

  describe('Built-in Functions', () => {
    test('calls Math functions', async () => {
      const result = await functionCallExpression.evaluate(context, 'Math.max', [1, 5, 3]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(5);
        expect(result.type).toBe('number');
      }
    });

    test('calls Array methods', async () => {
      const testArray = [1, 2, 3];
      context.locals.set('testArray', testArray);

      const result = await functionCallExpression.evaluate(context, 'testArray.join', ['-']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('1-2-3');
        expect(result.type).toBe('string');
      }
    });

    test('calls String methods', async () => {
      const testString = 'hello world';
      context.locals.set('testString', testString);

      const result = await functionCallExpression.evaluate(context, 'testString.toUpperCase', []);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('HELLO WORLD');
        expect(result.type).toBe('string');
      }
    });
  });

  describe('Error Handling', () => {
    test('handles function not found', async () => {
      const result = await functionCallExpression.evaluate(context, 'nonExistentFunction', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('FunctionNotFoundError');
        expect(result.error.message).toContain('not found');
      }
    });

    test('handles function execution errors', async () => {
      const errorFunc = () => {
        throw new Error('Test error');
      };

      (globalThis as any).errorFunc = errorFunc;

      const result = await functionCallExpression.evaluate(context, 'errorFunc', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('FunctionExecutionError');
        expect(result.error.message).toContain('Test error');
      }

      delete (globalThis as any).errorFunc;
    });

    test('handles validation errors', async () => {
      const result = await functionCallExpression.evaluate(context, '', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('FunctionCallValidationError');
        expect(result.error.message).toContain('validation failed');
      }
    });

    test('handles invalid object path', async () => {
      const result = await functionCallExpression.evaluate(context, 'nonExistent.method', []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe('FunctionNotFoundError');
      }
    });
  });

  describe('Type Inference', () => {
    test('correctly infers return types', async () => {
      // String function
      (globalThis as any).stringFunc = () => 'string';
      let result = await functionCallExpression.evaluate(context, 'stringFunc', []);
      expect(result.success && result.type).toBe('string');

      // Number function
      (globalThis as any).numberFunc = () => 42;
      result = await functionCallExpression.evaluate(context, 'numberFunc', []);
      expect(result.success && result.type).toBe('number');

      // Boolean function
      (globalThis as any).boolFunc = () => true;
      result = await functionCallExpression.evaluate(context, 'boolFunc', []);
      expect(result.success && result.type).toBe('boolean');

      // Array function
      (globalThis as any).arrayFunc = () => [1, 2, 3];
      result = await functionCallExpression.evaluate(context, 'arrayFunc', []);
      expect(result.success && result.type).toBe('array');

      // Object function
      (globalThis as any).objectFunc = () => ({ key: 'value' });
      result = await functionCallExpression.evaluate(context, 'objectFunc', []);
      expect(result.success && result.type).toBe('object');

      // Cleanup
      delete (globalThis as any).stringFunc;
      delete (globalThis as any).numberFunc;
      delete (globalThis as any).boolFunc;
      delete (globalThis as any).arrayFunc;
      delete (globalThis as any).objectFunc;
    });
  });

  describe('Utility Functions', () => {
    test('createFunctionCallExpression factory works', () => {
      const expr = createFunctionCallExpression();
      expect(expr).toBeInstanceOf(EnhancedFunctionCallExpression);
    });

    test('callFunction utility works', async () => {
      const testFunc = (x: string) => `utility-${x}`;
      (globalThis as any).utilityTest = testFunc;

      const result = await callFunction('utilityTest', ['test'], context);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('utility-test');
      }

      delete (globalThis as any).utilityTest;
    });

    test('getMetadata provides comprehensive information', () => {
      const metadata = functionCallExpression.getMetadata();

      expect(metadata.name).toBe('FunctionCallExpression');
      expect(metadata.category).toBe('interoperability');
      expect(metadata.supportedFeatures).toContain('async functions');
      expect(metadata.capabilities.supportsAsync).toBe(true);
      expect(metadata.capabilities.sideEffects).toBe(true);
    });
  });

  describe('LLM Documentation', () => {
    test('provides comprehensive documentation', () => {
      const docs = functionCallExpression.documentation;

      expect(docs.summary).toContain('JavaScript functions');
      expect(docs.parameters).toHaveLength(2);
      expect(docs.parameters[0].name).toBe('functionReference');
      expect(docs.examples).toHaveLength(6);
      expect(docs.tags).toContain('function');
      expect(docs.tags).toContain('interoperability');
    });
  });

  describe('Performance Characteristics', () => {
    test('handles multiple concurrent calls efficiently', async () => {
      const testFunc = (x: number) => x * 2;
      (globalThis as any).perfTest = testFunc;

      const startTime = performance.now();

      // Make multiple concurrent calls
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(functionCallExpression.evaluate(context, 'perfTest', [i]));
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();

      // All should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe(index * 2);
        }
      });

      // Should be reasonably fast
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms for 50 calls

      delete (globalThis as any).perfTest;
    });
  });
});
