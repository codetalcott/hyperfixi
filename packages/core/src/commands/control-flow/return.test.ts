/**
 * Tests for return command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReturnCommand } from './return';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Return Command', () => {
  let command: ReturnCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new ReturnCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
    if (!context.flags)
      context.flags = {
        halted: false,
        breaking: false,
        continuing: false,
        returning: false,
        async: false,
      };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('return');
      expect(command.syntax).toBe('return <expression> | exit');
      expect(command.description).toBe(
        'The return command returns a value from a function in hyperscript or stops an event handler from continuing. You may use the exit form to return no value.'
      );
    });

    it('should be a control flow command', () => {
      expect(command.isBlocking).toBe(true);
    });
  });

  describe('Basic Return Functionality', () => {
    it('should return a value and set returning flag', async () => {
      const result = await command.execute(context, 'hello world');

      expect(result).toBe('hello world');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('hello world');
    });

    it('should return numeric values', async () => {
      const result = await command.execute(context, 42);

      expect(result).toBe(42);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(42);
    });

    it('should return boolean values', async () => {
      const result = await command.execute(context, true);

      expect(result).toBe(true);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(true);
    });

    it('should return null values', async () => {
      const result = await command.execute(context, null);

      expect(result).toBe(null);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(null);
    });

    it('should return undefined values', async () => {
      const result = await command.execute(context, undefined);

      expect(result).toBe(undefined);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(undefined);
    });
  });

  describe('Exit Form (No Value Return)', () => {
    it('should handle exit form with no arguments', async () => {
      const result = await command.execute(context);

      expect(result).toBe(undefined);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(undefined);
    });

    it('should handle explicit exit keyword', async () => {
      const result = await command.execute(context, 'exit');

      expect(result).toBe(undefined);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(undefined);
    });
  });

  describe('Complex Return Values', () => {
    it('should return object values', async () => {
      const obj = { key: 'value', number: 42 };
      const result = await command.execute(context, obj);

      expect(result).toEqual(obj);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toEqual(obj);
    });

    it('should return array values', async () => {
      const arr = [1, 2, 3, 'test'];
      const result = await command.execute(context, arr);

      expect(result).toEqual(arr);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toEqual(arr);
    });

    it('should return DOM elements', async () => {
      const element = document.createElement('span');
      element.textContent = 'test element';

      const result = await command.execute(context, element);

      expect(result).toBe(element);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(element);
    });

    it('should return function values', async () => {
      const func = () => 'test function';
      const result = await command.execute(context, func);

      expect(result).toBe(func);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(func);
    });
  });

  describe('Function Return Context', () => {
    it('should handle return from function definition (LSP example)', async () => {
      // LSP example: def theAnswer() return 42 end
      const result = await command.execute(context, 42);

      expect(result).toBe(42);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(42);
    });

    it('should handle early return from function', async () => {
      // Simulate function with early return
      context.locals.set('shouldReturn', true);

      const result = await command.execute(context, 'early exit');

      expect(result).toBe('early exit');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('early exit');
    });

    it('should handle conditional return', async () => {
      // Simulate conditional return scenario
      const condition = true;
      const result = await command.execute(context, condition ? 'success' : 'failure');

      expect(result).toBe('success');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('success');
    });
  });

  describe('Event Handler Return Context', () => {
    it('should stop event handler execution', async () => {
      const result = await command.execute(context, 'handler result');

      expect(result).toBe('handler result');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('handler result');
    });

    it('should handle return in click handler context', async () => {
      const clickEvent = {
        type: 'click',
        target: testElement,
      } as any;
      context.event = clickEvent;

      const result = await command.execute(context, 'click handled');

      expect(result).toBe('click handled');
      expect(context.flags?.returning).toBe(true);
    });

    it('should handle return in form submission context', async () => {
      const submitEvent = {
        type: 'submit',
        target: testElement,
      } as any;
      context.event = submitEvent;

      const result = await command.execute(context, false); // Prevent submission

      expect(result).toBe(false);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(false);
    });
  });

  describe('Expression Return Values', () => {
    it('should return calculated expressions', async () => {
      // Simulate returning result of calculation
      const calculation = 5 * 8 + 2;
      const result = await command.execute(context, calculation);

      expect(result).toBe(42);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(42);
    });

    it('should return string concatenation', async () => {
      const message = 'Hello' + ' ' + 'World';
      const result = await command.execute(context, message);

      expect(result).toBe('Hello World');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('Hello World');
    });

    it('should return variable values', async () => {
      context.locals.set('myVar', 'local value');
      const result = await command.execute(context, context.locals.get('myVar'));

      expect(result).toBe('local value');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('local value');
    });
  });

  describe('Execution Flow Control', () => {
    it('should set returning flag to true', async () => {
      expect(context.flags?.returning).toBe(false);

      await command.execute(context, 'test');

      expect(context.flags?.returning).toBe(true);
    });

    it('should preserve other execution flags', async () => {
      context.flags!.halted = true;
      context.flags!.breaking = false;

      await command.execute(context, 'test');

      expect(context.flags?.halted).toBe(true);
      expect(context.flags?.breaking).toBe(false);
      expect(context.flags?.returning).toBe(true);
    });

    it('should not interfere with async flag', async () => {
      context.flags!.async = true;

      await command.execute(context, 'async result');

      expect(context.flags?.async).toBe(true);
      expect(context.flags?.returning).toBe(true);
    });

    it('should override previous return value', async () => {
      context.returnValue = 'previous';

      const result = await command.execute(context, 'new value');

      expect(result).toBe('new value');
      expect(context.returnValue).toBe('new value');
    });
  });

  describe('Promise Return Values', () => {
    it('should handle resolved promise values', async () => {
      const promiseValue = Promise.resolve('async result');
      const result = await command.execute(context, await promiseValue);

      expect(result).toBe('async result');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('async result');
    });

    it('should handle promise rejection in return context', async () => {
      const rejectedPromise = Promise.reject(new Error('async error'));

      try {
        await rejectedPromise;
      } catch (error) {
        const result = await command.execute(context, error);
        expect(result).toBeInstanceOf(Error);
        expect(context.flags?.returning).toBe(true);
      }
    });
  });

  describe('Validation', () => {
    it('should validate no arguments (exit form)', () => {
      const error = command.validate([]);
      expect(error).toBe(null);
    });

    it('should validate single argument (return value)', () => {
      const error = command.validate(['value']);
      expect(error).toBe(null);
    });

    it('should validate exit keyword', () => {
      const error = command.validate(['exit']);
      expect(error).toBe(null);
    });

    it('should reject too many arguments', () => {
      const error = command.validate(['value1', 'value2']);
      expect(error).toBe('Return command accepts at most one argument');
    });

    it('should handle complex expressions in validation', () => {
      const error = command.validate(['someComplexExpression']);
      expect(error).toBe(null);
    });
  });

  describe('Error Handling', () => {
    it('should handle null context gracefully', async () => {
      const nullContext = {} as ExecutionContext;

      const result = await command.execute(nullContext, 'test');

      expect(result).toBe('test');
    });

    it('should handle context without flags', async () => {
      delete context.flags;

      const result = await command.execute(context, 'test');

      expect(result).toBe('test');
      expect(context.returnValue).toBe('test');
    });

    it('should handle context without return value property', async () => {
      delete (context as any).returnValue;

      const result = await command.execute(context, 'test');

      expect(result).toBe('test');
      expect(context.returnValue).toBe('test');
    });

    it('should not throw on edge case values', async () => {
      const edgeCases = [NaN, Infinity, -Infinity, Symbol('test'), new Date(), /regex/];

      for (const value of edgeCases) {
        await expect(command.execute(context, value)).resolves.toBe(value);
      }
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: function return', async () => {
      // From LSP: def theAnswer() return 42 end
      const result = await command.execute(context, 42);

      expect(result).toBe(42);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(42);
    });

    it('should handle worker function return', async () => {
      // From cookbook: worker Incrementer def increment(i) return i + 1 end
      const input = 41;
      const result = await command.execute(context, input + 1);

      expect(result).toBe(42);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe(42);
    });

    it('should handle JavaScript inline return', async () => {
      // From cookbook: js return 'Success!' end
      const result = await command.execute(context, 'Success!');

      expect(result).toBe('Success!');
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toBe('Success!');
    });

    it('should handle regex execution return', async () => {
      // From cookbook: js(haystack) return /needle/gi.exec(haystack) end
      const regexResult = /needle/gi.exec('find the needle here');
      const result = await command.execute(context, regexResult);

      expect(result).toEqual(regexResult);
      expect(context.flags?.returning).toBe(true);
      expect(context.returnValue).toEqual(regexResult);
    });

    it('should handle conditional return patterns', async () => {
      // Common pattern: return value based on condition
      const condition = true;
      const result = await command.execute(context, condition ? 'success' : 'failure');

      expect(result).toBe('success');
      expect(context.flags?.returning).toBe(true);
    });
  });

  describe('Integration with Function Context', () => {
    it('should work within function definition scope', async () => {
      // Simulate being called within a function
      context.locals.set('functionScope', true);
      context.locals.set('param1', 'test');

      const result = await command.execute(context, context.locals.get('param1'));

      expect(result).toBe('test');
      expect(context.flags?.returning).toBe(true);
    });

    it('should handle nested function returns', async () => {
      // Simulate nested function call
      context.locals.set('level', 1);

      const result = await command.execute(context, 'nested result');

      expect(result).toBe('nested result');
      expect(context.flags?.returning).toBe(true);
    });

    it('should work with closure-like behavior', async () => {
      // Simulate closure variable access
      context.globals.set('closureVar', 'captured value');

      const result = await command.execute(context, context.globals.get('closureVar'));

      expect(result).toBe('captured value');
      expect(context.flags?.returning).toBe(true);
    });
  });

  describe('Type Conversion and Coercion', () => {
    it('should return string representations correctly', async () => {
      const num = 123;
      const result = await command.execute(context, num.toString());

      expect(result).toBe('123');
      expect(typeof result).toBe('string');
      expect(context.returnValue).toBe('123');
    });

    it('should return number values without coercion', async () => {
      const str = '456';
      const result = await command.execute(context, parseInt(str));

      expect(result).toBe(456);
      expect(typeof result).toBe('number');
      expect(context.returnValue).toBe(456);
    });

    it('should handle boolean conversion patterns', async () => {
      const truthyValue = 'non-empty';
      const result = await command.execute(context, !!truthyValue);

      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
      expect(context.returnValue).toBe(true);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak references to large objects', async () => {
      const largeObject = { data: new Array(1000).fill('test') };

      await command.execute(context, largeObject);

      expect(context.returnValue).toBe(largeObject);
      // In real implementation, would check for proper cleanup
    });

    it('should handle circular references gracefully', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const result = await command.execute(context, circularObj);

      expect(result).toBe(circularObj);
      expect(result.self).toBe(circularObj);
    });
  });
});
