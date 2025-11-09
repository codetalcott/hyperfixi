/**
 * JS Command Tests
 * Test inline JavaScript execution with parameter passing and return values
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { JSCommand } from './js';
import type { ExecutionContext } from '../../types/core';

describe('JS Command', () => {
  let jsCommand: JSCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    jsCommand = new JSCommand();
    testElement = document.createElement('div');
    testElement.id = 'test-element';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      locals: new Map(),
    };
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }

    // Clean up any test properties on global window
    delete (globalThis as any).testSuccess;
    delete (globalThis as any).testValue;
    delete (globalThis as any).testObject;
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(jsCommand.name).toBe('js');
      expect(jsCommand.isBlocking).toBe(false);
      expect(typeof jsCommand.syntax).toBe('string');
      expect(typeof jsCommand.description).toBe('string');
    });
  });

  describe('Basic JavaScript Execution', () => {
    it('should execute simple JavaScript code', async () => {
      const result = await jsCommand.execute(context, 'globalThis.testSuccess = true');

      expect((globalThis as any).testSuccess).toBe(true);
      expect(result).toBe(undefined); // No return value
    });

    it('should execute JavaScript with return value', async () => {
      const result = await jsCommand.execute(context, 'return "test success"');

      expect(result).toBe('test success');
    });

    it('should execute multi-line JavaScript', async () => {
      const jsCode = `
        let a = 10;
        let b = 20;
        return a + b;
      `;

      const result = await jsCommand.execute(context, jsCode);

      expect(result).toBe(30);
    });

    it('should handle empty code gracefully', async () => {
      const result = await jsCommand.execute(context, '');

      expect(result).toBe(undefined);
    });

    it('should handle code with only whitespace', async () => {
      const result = await jsCommand.execute(context, '   \n  \t  ');

      expect(result).toBe(undefined);
    });
  });

  describe('Parameter Passing', () => {
    it('should execute JavaScript with no parameters', async () => {
      const result = await jsCommand.execute(context, [], 'return 42');

      expect(result).toBe(42);
    });

    it('should pass single parameter to JavaScript', async () => {
      context.locals?.set('testVar', 'hello world');

      const result = await jsCommand.execute(context, ['testVar'], 'return testVar.toUpperCase()');

      expect(result).toBe('HELLO WORLD');
    });

    it('should pass multiple parameters to JavaScript', async () => {
      context.locals?.set('a', 10);
      context.locals?.set('b', 20);

      const result = await jsCommand.execute(context, ['a', 'b'], 'return a * b');

      expect(result).toBe(200);
    });

    it('should handle mixed parameter types', async () => {
      context.locals?.set('str', 'test');
      context.locals?.set('num', 42);
      context.locals?.set('bool', true);
      context.locals?.set('obj', { key: 'value' });

      const result = await jsCommand.execute(
        context,
        ['str', 'num', 'bool', 'obj'],
        'return { str, num, bool, objKey: obj.key }'
      );

      expect(result).toEqual({
        str: 'test',
        num: 42,
        bool: true,
        objKey: 'value',
      });
    });

    it('should handle undefined parameters', async () => {
      const result = await jsCommand.execute(context, ['nonexistent'], 'return typeof nonexistent');

      expect(result).toBe('undefined');
    });

    it('should resolve parameter values from context', async () => {
      context.locals?.set('x', 100);

      const result = await jsCommand.execute(
        context,
        ['x'],
        'globalThis.testValue = x; return x * 2'
      );

      expect(result).toBe(200);
      expect((globalThis as any).testValue).toBe(100);
    });
  });

  describe('Context Access', () => {
    it('should provide access to me element', async () => {
      testElement.id = 'special-element';

      const result = await jsCommand.execute(context, [], 'return me.id');

      expect(result).toBe('special-element');
    });

    it('should provide access to hyperscript context variables', async () => {
      context.locals?.set('contextVar', 'context-value');

      const result = await jsCommand.execute(context, [], 'return locals.get("contextVar")');

      expect(result).toBe('context-value');
    });

    it('should allow modification of DOM through me reference', async () => {
      await jsCommand.execute(
        context,
        [],
        'me.classList.add("js-modified"); me.setAttribute("data-modified", "true")'
      );

      expect(testElement.classList.contains('js-modified')).toBe(true);
      expect(testElement.getAttribute('data-modified')).toBe('true');
    });

    it('should provide access to document and window', async () => {
      const result = await jsCommand.execute(
        context,
        [],
        'return { hasDocument: typeof document !== "undefined", hasWindow: typeof window !== "undefined" }'
      );

      expect(result.hasDocument).toBe(true);
      expect(result.hasWindow).toBe(true);
    });
  });

  describe('Return Value Handling', () => {
    it('should return primitive values', async () => {
      expect(await jsCommand.execute(context, 'return 42')).toBe(42);
      expect(await jsCommand.execute(context, 'return "string"')).toBe('string');
      expect(await jsCommand.execute(context, 'return true')).toBe(true);
      expect(await jsCommand.execute(context, 'return null')).toBe(null);
    });

    it('should return objects and arrays', async () => {
      const objectResult = await jsCommand.execute(context, 'return { a: 1, b: "test" }');
      expect(objectResult).toEqual({ a: 1, b: 'test' });

      const arrayResult = await jsCommand.execute(context, 'return [1, 2, 3]');
      expect(arrayResult).toEqual([1, 2, 3]);
    });

    it('should return DOM elements', async () => {
      const result = await jsCommand.execute(context, 'return me');

      expect(result).toBe(testElement);
    });

    it('should handle async return values', async () => {
      const result = await jsCommand.execute(context, [], 'return Promise.resolve("async-result")');

      expect(result).toBe('async-result');
    });

    it('should handle functions as return values', async () => {
      const result = await jsCommand.execute(
        context,
        'return function() { return "function-result"; }'
      );

      expect(typeof result).toBe('function');
      expect(result()).toBe('function-result');
    });
  });

  describe('Error Handling', () => {
    it('should handle JavaScript syntax errors', async () => {
      await expect(jsCommand.execute(context, 'invalid javascript syntax {')).rejects.toThrow();
    });

    it('should handle JavaScript runtime errors', async () => {
      await expect(jsCommand.execute(context, 'throw new Error("Runtime error")')).rejects.toThrow(
        'Runtime error'
      );
    });

    it('should handle reference errors gracefully', async () => {
      await expect(
        jsCommand.execute(context, 'return nonExistentVariable.property')
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await jsCommand.execute(context, 'return undefinedVar.foo');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/undefinedVar|not defined/i);
      }
    });

    it('should handle missing code argument', async () => {
      await expect(jsCommand.execute(context)).rejects.toThrow(
        'JS command requires JavaScript code to execute'
      );
    });
  });

  describe('Complex Use Cases', () => {
    it('should handle loops and conditions', async () => {
      const jsCode = `
        let sum = 0;
        for (let i = 1; i <= 10; i++) {
          if (i % 2 === 0) {
            sum += i;
          }
        }
        return sum;
      `;

      const result = await jsCommand.execute(context, [], jsCode);

      expect(result).toBe(30); // 2 + 4 + 6 + 8 + 10
    });

    it('should handle array operations', async () => {
      context.locals?.set('numbers', [1, 2, 3, 4, 5]);

      const result = await jsCommand.execute(
        context,
        ['numbers'],
        'return numbers.filter(n => n % 2 === 0).map(n => n * 2)'
      );

      expect(result).toEqual([4, 8]);
    });

    it('should handle object manipulation', async () => {
      context.locals?.set('data', { name: 'John', age: 30 });

      const result = await jsCommand.execute(
        context,
        ['data'],
        `
          data.age += 1;
          data.city = 'New York';
          return data;
        `
      );

      expect(result).toEqual({ name: 'John', age: 31, city: 'New York' });
    });

    it('should handle DOM queries and manipulations', async () => {
      // Add a test element to query
      const childElement = document.createElement('span');
      childElement.className = 'test-child';
      childElement.textContent = 'original';
      testElement.appendChild(childElement);

      await jsCommand.execute(
        context,
        [],
        `
          const child = me.querySelector('.test-child');
          child.textContent = 'modified';
          child.style.color = 'red';
        `
      );

      expect(childElement.textContent).toBe('modified');
      expect(childElement.style.color).toBe('red');
    });

    it('should handle JSON operations', async () => {
      const result = await jsCommand.execute(
        context,
        [],
        `
          const obj = { test: 'data', number: 42 };
          const json = JSON.stringify(obj);
          const parsed = JSON.parse(json);
          return parsed;
        `
      );

      expect(result).toEqual({ test: 'data', number: 42 });
    });
  });

  describe('Validation', () => {
    it('should validate syntax with code only', () => {
      expect(jsCommand.validate(['console.log("test")'])).toBeNull();
    });

    it('should validate syntax with parameters and code', () => {
      expect(jsCommand.validate([['param1', 'param2'], 'return param1 + param2'])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(jsCommand.validate([])).toContain('requires JavaScript code');
      expect(jsCommand.validate([null])).toContain('must be a string');
      expect(jsCommand.validate([123])).toContain('must be a string');
    });

    it('should validate parameter arrays', () => {
      expect(jsCommand.validate([{}, 'code'])).toContain('must be an array');
      expect(jsCommand.validate(['not-array', 'code'])).toContain('must be an array');
    });
  });
});
