/**
 * Pseudo-Command Unit Tests
 * Tests for pseudo-command functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PseudoCommand } from './pseudo-command';
import type { TypedExecutionContext } from '../../types/command-types';

describe('PseudoCommand', () => {
  let pseudoCmd: PseudoCommand;
  let mockContext: TypedExecutionContext;
  let mockElement: HTMLElement;
  let mockObject: any;

  beforeEach(() => {
    pseudoCmd = new PseudoCommand();

    // Create mock element
    mockElement = document.createElement('div');
    mockElement.id = 'test-element';
    mockElement.setAttribute('data-test', 'value');
    document.body.appendChild(mockElement);

    // Create mock object with methods
    mockObject = {
      testMethod: vi.fn(() => 'test result'),
      asyncMethod: vi.fn(async () => 'async result'),
      methodWithArgs: vi.fn((a: string, b: number) => `${a}-${b}`),
      nested: {
        method: vi.fn(() => 'nested result'),
      },
    };

    // Create mock context
    mockContext = {
      locals: new Map([
        ['me', mockElement],
        ['testObj', mockObject],
        ['result', undefined],
      ]),
      globals: new Map(),
      variables: new Map(),
      me: mockElement,
      it: undefined,
      commandRegistry: {} as any,
      features: {} as any,
      parser: null as any,
    };
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(pseudoCmd.name).toBe('pseudo-command');
      expect(pseudoCmd.metadata.name).toBe('pseudo-command');
      expect(pseudoCmd.metadata.category).toBe('execution');
      expect(pseudoCmd.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('should validate correct input with method name and target', () => {
      const input = {
        methodName: 'getElementById',
        methodArgs: ['test'],
        targetExpression: 'document',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate input with preposition', () => {
      const input = {
        methodName: 'setAttribute',
        methodArgs: ['foo', 'bar'],
        preposition: 'on' as const,
        targetExpression: 'me',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate input with empty args array', () => {
      const input = {
        methodName: 'reload',
        methodArgs: [],
        targetExpression: 'window.location',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing method name', () => {
      const input = {
        methodArgs: [],
        targetExpression: 'document',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing-argument')).toBe(true);
    });

    it('should reject non-string method name', () => {
      const input = {
        methodName: 123,
        methodArgs: [],
        targetExpression: 'document',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });

    it('should reject non-array method args', () => {
      const input = {
        methodName: 'test',
        methodArgs: 'not-an-array',
        targetExpression: 'testObj',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type-mismatch')).toBe(true);
    });

    it('should reject invalid preposition', () => {
      const input = {
        methodName: 'test',
        methodArgs: [],
        preposition: 'invalid',
        targetExpression: 'testObj',
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'syntax-error')).toBe(true);
    });

    it('should reject missing target expression', () => {
      const input = {
        methodName: 'test',
        methodArgs: [],
      };
      const result = pseudoCmd.validation.validate(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing-argument')).toBe(true);
    });

    it('should reject non-object input', () => {
      const result = pseudoCmd.validation.validate('not an object');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'syntax-error')).toBe(true);
    });

    it('should reject null input', () => {
      const result = pseudoCmd.validation.validate(null);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('syntax-error');
    });
  });

  describe('execute', () => {
    it('should call method on object from context', async () => {
      const input = {
        methodName: 'testMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.testMethod).toHaveBeenCalled();
      expect(output.result).toBe('test result');
      expect(output.methodName).toBe('testMethod');
      expect(output.target).toBe(mockObject);
    });

    it('should call method with arguments', async () => {
      const input = {
        methodName: 'methodWithArgs',
        methodArgs: ['hello', 42],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.methodWithArgs).toHaveBeenCalledWith('hello', 42);
      expect(output.result).toBe('hello-42');
    });

    it('should handle async methods', async () => {
      const input = {
        methodName: 'asyncMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.asyncMethod).toHaveBeenCalled();
      expect(output.result).toBe('async result');
    });

    it('should call method on direct object reference', async () => {
      const input = {
        methodName: 'testMethod',
        methodArgs: [],
        targetExpression: mockObject,
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.testMethod).toHaveBeenCalled();
      expect(output.result).toBe('test result');
    });

    it('should resolve "me" from context', async () => {
      const input = {
        methodName: 'getAttribute',
        methodArgs: ['data-test'],
        targetExpression: 'me',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(output.result).toBe('value');
      expect(output.target).toBe(mockElement);
    });

    it('should store result in context.locals', async () => {
      const input = {
        methodName: 'testMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      await pseudoCmd.execute(input, mockContext);

      expect(mockContext.locals.get('result')).toBe('test result');
    });

    it('should set context.it to result', async () => {
      const input = {
        methodName: 'testMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      await pseudoCmd.execute(input, mockContext);

      expect(mockContext.it).toBe('test result');
    });

    it('should throw error if target is null', async () => {
      const input = {
        methodName: 'test',
        methodArgs: [],
        targetExpression: 'nonexistent',
      };

      await expect(pseudoCmd.execute(input, mockContext)).rejects.toThrow(
        'Target expression resolved to'
      );
    });

    it('should throw error if method not found', async () => {
      const input = {
        methodName: 'nonexistentMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      await expect(pseudoCmd.execute(input, mockContext)).rejects.toThrow(
        'Method "nonexistentMethod" not found'
      );
    });

    it('should throw error if property is not a function', async () => {
      mockObject.notAFunction = 'string value';

      const input = {
        methodName: 'notAFunction',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      await expect(pseudoCmd.execute(input, mockContext)).rejects.toThrow('is not a function');
    });

    it('should handle nested method paths', async () => {
      const input = {
        methodName: 'nested.method',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.nested.method).toHaveBeenCalled();
      expect(output.result).toBe('nested result');
    });

    it('should handle method execution errors', async () => {
      mockObject.errorMethod = vi.fn(() => {
        throw new Error('Method error');
      });

      const input = {
        methodName: 'errorMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      await expect(pseudoCmd.execute(input, mockContext)).rejects.toThrow(
        'Method execution failed'
      );
    });
  });

  describe('target resolution', () => {
    it('should resolve document', async () => {
      const input = {
        methodName: 'querySelector',
        methodArgs: ['#test-element'],
        targetExpression: 'document',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(output.target).toBe(document);
      expect(output.result).toBe(mockElement);
    });

    it('should resolve globals from context', async () => {
      const globalObj = { method: vi.fn(() => 'global result') };
      mockContext.globals.set('globalObj', globalObj);

      const input = {
        methodName: 'method',
        methodArgs: [],
        targetExpression: 'globalObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(globalObj.method).toHaveBeenCalled();
      expect(output.result).toBe('global result');
    });

    it('should resolve from context.variables', async () => {
      const varObj = { method: vi.fn(() => 'var result') };
      mockContext.variables!.set('varObj', varObj);

      const input = {
        methodName: 'method',
        methodArgs: [],
        targetExpression: 'varObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(varObj.method).toHaveBeenCalled();
      expect(output.result).toBe('var result');
    });
  });

  describe('official _hyperscript examples', () => {
    it('should handle "getElementById(id) from the document"', async () => {
      const input = {
        methodName: 'getElementById',
        methodArgs: ['test-element'],
        preposition: 'from' as const,
        targetExpression: 'document',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(output.result).toBe(mockElement);
      expect(output.target).toBe(document);
    });

    it('should handle "setAttribute(name, value) on me"', async () => {
      const input = {
        methodName: 'setAttribute',
        methodArgs: ['data-custom', 'custom-value'],
        preposition: 'on' as const,
        targetExpression: 'me',
      };

      await pseudoCmd.execute(input, mockContext);

      expect(mockElement.getAttribute('data-custom')).toBe('custom-value');
    });

    it('should handle "foo() on me"', async () => {
      (mockElement as any).foo = vi.fn(() => 'element result');

      const input = {
        methodName: 'foo',
        methodArgs: [],
        preposition: 'on' as const,
        targetExpression: 'me',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect((mockElement as any).foo).toHaveBeenCalled();
      expect(output.result).toBe('element result');
    });
  });

  describe('edge cases', () => {
    it('should handle empty method args', async () => {
      const input = {
        methodName: 'testMethod',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(mockObject.testMethod).toHaveBeenCalledWith();
      expect(output.result).toBe('test result');
    });

    it('should handle method returning undefined', async () => {
      mockObject.returnsUndefined = vi.fn(() => undefined);

      const input = {
        methodName: 'returnsUndefined',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(output.result).toBeUndefined();
    });

    it('should handle method returning null', async () => {
      mockObject.returnsNull = vi.fn(() => null);

      const input = {
        methodName: 'returnsNull',
        methodArgs: [],
        targetExpression: 'testObj',
      };

      const output = await pseudoCmd.execute(input, mockContext);

      expect(output.result).toBeNull();
    });

    it('should handle all valid prepositions', async () => {
      const prepositions: Array<'from' | 'on' | 'with' | 'into' | 'at' | 'to'> = [
        'from',
        'on',
        'with',
        'into',
        'at',
        'to',
      ];

      for (const prep of prepositions) {
        const input = {
          methodName: 'testMethod',
          methodArgs: [],
          preposition: prep,
          targetExpression: 'testObj',
        };

        const result = pseudoCmd.validation.validate(input);
        expect(result.isValid).toBe(true);
      }
    });
  });
});
