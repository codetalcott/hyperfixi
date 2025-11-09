/**
 * Tests for call command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallCommand } from './call';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Call Command', () => {
  let command: CallCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new CallCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('call');
      expect(command.syntax).toBe('call <expression>\nget <expression>');
      expect(command.description).toBe(
        'The call command allows you evaluate an expression.\nThe value of this expression will be put into the it variable.\nget is an alias for call and can be used if it more clearly expresses the meaning of the code.'
      );
    });
  });

  describe('Basic Expression Evaluation', () => {
    it('should evaluate simple expressions and set it variable', async () => {
      const expression = () => 'hello world';

      await command.execute(context, expression);

      expect(context.it).toBe('hello world');
    });

    it('should evaluate function expressions', async () => {
      const mockFunction = vi.fn().mockReturnValue(42);

      await command.execute(context, mockFunction);

      expect(mockFunction).toHaveBeenCalled();
      expect(context.it).toBe(42);
    });

    it('should handle literal values', async () => {
      await command.execute(context, 'literal string');

      expect(context.it).toBe('literal string');
    });

    it('should handle numeric values', async () => {
      await command.execute(context, 123);

      expect(context.it).toBe(123);
    });

    it('should handle boolean values', async () => {
      await command.execute(context, true);

      expect(context.it).toBe(true);
    });
  });

  describe('JavaScript Function Calls', () => {
    it('should call JavaScript functions and capture return value', async () => {
      // Mock global function
      (global as any).myJavascriptFunction = vi.fn().mockReturnValue('function result');

      const functionCall = () => (global as any).myJavascriptFunction();

      await command.execute(context, functionCall);

      expect((global as any).myJavascriptFunction).toHaveBeenCalled();
      expect(context.it).toBe('function result');

      // Cleanup
      delete (global as any).myJavascriptFunction;
    });

    it('should handle functions with parameters', async () => {
      const mockMath = vi.fn((a, b) => a + b);
      const functionCall = () => mockMath(5, 3);

      await command.execute(context, functionCall);

      expect(mockMath).toHaveBeenCalledWith(5, 3);
      expect(context.it).toBe(8);
    });

    it('should handle DOM API calls', async () => {
      const mockPrompt = vi.fn().mockReturnValue('user input');
      (global as any).prompt = mockPrompt;

      const promptCall = () => (global as any).prompt('Enter your age');

      await command.execute(context, promptCall);

      expect(mockPrompt).toHaveBeenCalledWith('Enter your age');
      expect(context.it).toBe('user input');

      // Cleanup
      delete (global as any).prompt;
    });
  });

  describe('Async Function Handling', () => {
    it('should handle async functions', async () => {
      const asyncFunction = async () => {
        return new Promise(resolve => setTimeout(() => resolve('async result'), 10));
      };

      await command.execute(context, asyncFunction);

      expect(context.it).toBe('async result');
    });

    it('should handle Promise values', async () => {
      const promise = Promise.resolve('promise result');

      await command.execute(context, promise);

      expect(context.it).toBe('promise result');
    });

    it('should handle rejected promises', async () => {
      const rejectedPromise = Promise.reject(new Error('promise error'));

      await expect(async () => {
        await command.execute(context, rejectedPromise);
      }).rejects.toThrow('promise error');
    });
  });

  describe('Object Method Calls', () => {
    it('should call object methods', async () => {
      const obj = {
        getValue: vi.fn().mockReturnValue('method result'),
      };
      const methodCall = () => obj.getValue();

      await command.execute(context, methodCall);

      expect(obj.getValue).toHaveBeenCalled();
      expect(context.it).toBe('method result');
    });

    it('should handle method chaining', async () => {
      const secondMethod = vi.fn().mockReturnValue('chained result');
      const obj = {
        first: () => ({
          second: secondMethod,
        }),
      };
      const chainCall = () => obj.first().second();

      await command.execute(context, chainCall);

      expect(secondMethod).toHaveBeenCalled();
      expect(context.it).toBe('chained result');
    });

    it('should handle this context in methods', async () => {
      const obj = {
        value: 'context value',
        getValue: function () {
          return this.value;
        },
      };
      const boundMethodCall = () => obj.getValue();

      await command.execute(context, boundMethodCall);

      expect(context.it).toBe('context value');
    });
  });

  describe('Error Handling', () => {
    it('should handle function execution errors', async () => {
      const errorFunction = () => {
        throw new Error('Function execution error');
      };

      await expect(async () => {
        await command.execute(context, errorFunction);
      }).rejects.toThrow('Function execution error');
    });

    it('should handle null/undefined expressions', async () => {
      await command.execute(context, null);
      expect(context.it).toBe(null);

      await command.execute(context, undefined);
      expect(context.it).toBe(undefined);
    });

    it('should handle non-callable expressions gracefully', async () => {
      const nonFunction = { not: 'a function' };

      await command.execute(context, nonFunction);

      expect(context.it).toBe(nonFunction);
    });
  });

  describe('Context Integration', () => {
    it('should preserve previous it value if expression fails', async () => {
      context.it = 'previous value';

      const errorFunction = () => {
        throw new Error('Expression error');
      };

      await expect(async () => {
        await command.execute(context, errorFunction);
      }).rejects.toThrow('Expression error');

      // it should remain unchanged on error
      expect(context.it).toBe('previous value');
    });

    it('should work with context variables', async () => {
      context.locals.set('multiplier', 3);

      const expression = () => {
        const multiplier = context.locals.get('multiplier');
        return 5 * (multiplier as number);
      };

      await command.execute(context, expression);

      expect(context.it).toBe(15);
    });

    it('should handle expressions that use element context', async () => {
      testElement.textContent = 'element text';

      const expression = () => testElement.textContent;

      await command.execute(context, expression);

      expect(context.it).toBe('element text');
    });
  });

  describe('Validation', () => {
    it('should validate basic call syntax', () => {
      const error = command.validate([() => 'test']);
      expect(error).toBe(null);
    });

    it('should require at least one argument', () => {
      const error = command.validate([]);
      expect(error).toBe('Call command requires an expression to evaluate');
    });

    it('should accept any expression type', () => {
      const error1 = command.validate(['string']);
      expect(error1).toBe(null);

      const error2 = command.validate([42]);
      expect(error2).toBe(null);

      const error3 = command.validate([true]);
      expect(error3).toBe(null);

      const error4 = command.validate([{}]);
      expect(error4).toBe(null);
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: JavaScript function call', async () => {
      // From LSP: call myJavascriptFunction()
      const mockFunction = vi.fn().mockReturnValue('clicked');
      (global as any).myJavascriptFunction = mockFunction;

      const functionExpression = () => (global as any).myJavascriptFunction();

      await command.execute(context, functionExpression);

      expect(mockFunction).toHaveBeenCalled();
      expect(context.it).toBe('clicked');

      // Cleanup
      delete (global as any).myJavascriptFunction;
    });

    it('should handle LSP example 2: prompt with result usage', async () => {
      // From LSP: get prompt('Enter your age') then put 'You entered: $it' into my.innerHTML
      const mockPrompt = vi.fn().mockReturnValue('25');
      (global as any).prompt = mockPrompt;

      const promptExpression = () => (global as any).prompt('Enter your age');

      await command.execute(context, promptExpression);

      expect(mockPrompt).toHaveBeenCalledWith('Enter your age');
      expect(context.it).toBe('25');

      // Simulate the follow-up put command behavior
      testElement.innerHTML = `You entered: ${context.it}`;
      expect(testElement.innerHTML).toBe('You entered: 25');

      // Cleanup
      delete (global as any).prompt;
    });
  });

  describe('Get Alias Support', () => {
    it('should support get as alias for call', async () => {
      const getCommand = new CallCommand();
      getCommand.name = 'get'; // Test alias behavior

      const expression = () => 'get result';

      await getCommand.execute(context, expression);

      expect(context.it).toBe('get result');
    });

    it('should handle get with same validation as call', () => {
      const getCommand = new CallCommand();
      getCommand.name = 'get';

      const error = getCommand.validate([]);
      expect(error).toBe('Call command requires an expression to evaluate');
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle mathematical expressions', async () => {
      const mathExpression = () => Math.sqrt(16) + Math.pow(2, 3);

      await command.execute(context, mathExpression);

      expect(context.it).toBe(12); // sqrt(16) + pow(2,3) = 4 + 8 = 12
    });

    it('should handle array operations', async () => {
      const arrayExpression = () => [1, 2, 3, 4].filter(x => x % 2 === 0);

      await command.execute(context, arrayExpression);

      expect(context.it).toEqual([2, 4]);
    });

    it('should handle string operations', async () => {
      const stringExpression = () => 'hello world'.toUpperCase().replace('WORLD', 'HYPERSCRIPT');

      await command.execute(context, stringExpression);

      expect(context.it).toBe('HELLO HYPERSCRIPT');
    });
  });
});
