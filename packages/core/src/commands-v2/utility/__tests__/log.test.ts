/**
 * Unit Tests for LogCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on core logging functionality without relying on V1 behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LogCommand } from '../log';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/ast';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
  } as any;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      // Real evaluator would parse AST
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      return node;
    },
  };
}

// ========== Tests ==========

describe('LogCommand (Standalone V2)', () => {
  let command: LogCommand;
  let consoleLogSpy: any;

  beforeEach(() => {
    command = new LogCommand();
    // Spy on console.log to verify it's called correctly
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log
    consoleLogSpy.mockRestore();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('log');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('log');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('should parse no arguments (empty log)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.values).toEqual([]);
    });

    it('should parse single string argument', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => 'Hello World',
      };

      const input = await command.parseInput(
        { args: [{ value: 'Hello World' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.values).toEqual(['Hello World']);
    });

    it('should parse single number argument', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => 42,
      };

      const input = await command.parseInput(
        { args: [{ value: 42 } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.values).toEqual([42]);
    });

    it('should parse multiple arguments', async () => {
      const context = createMockContext();
      let callCount = 0;
      const valuesToReturn = ['Result:', 42, true];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      };

      const input = await command.parseInput(
        {
          args: [
            { value: 'Result:' } as any,
            { value: 42 } as any,
            { value: true } as any,
          ],
          modifiers: {},
        },
        evaluator as any,
        context
      );

      expect(input.values).toEqual(['Result:', 42, true]);
    });

    it('should parse object argument', async () => {
      const context = createMockContext();
      const obj = { foo: 'bar', baz: 123 };
      const evaluator = {
        evaluate: async () => obj,
      };

      const input = await command.parseInput(
        { args: [{ value: obj } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.values).toEqual([obj]);
      expect(input.values[0]).toBe(obj); // Same reference
    });

    it('should parse array argument', async () => {
      const context = createMockContext();
      const arr = [1, 2, 3, 4, 5];
      const evaluator = {
        evaluate: async () => arr,
      };

      const input = await command.parseInput(
        { args: [{ value: arr } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.values).toEqual([arr]);
      expect(input.values[0]).toBe(arr); // Same reference
    });

    it('should parse null and undefined', async () => {
      const context = createMockContext();
      let callCount = 0;
      const valuesToReturn = [null, undefined];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      };

      const input = await command.parseInput(
        {
          args: [{ value: null } as any, { value: undefined } as any],
          modifiers: {},
        },
        evaluator as any,
        context
      );

      expect(input.values).toEqual([null, undefined]);
    });
  });

  describe('execute', () => {
    it('should log empty line when no values', async () => {
      const context = createMockContext();

      const output = await command.execute({ values: [] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith();
      expect(output.values).toEqual([]);
      expect(output.loggedAt).toBeInstanceOf(Date);
    });

    it('should log single string value', async () => {
      const context = createMockContext();

      const output = await command.execute({ values: ['Hello World'] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');
      expect(output.values).toEqual(['Hello World']);
      expect(output.loggedAt).toBeInstanceOf(Date);
    });

    it('should log single number value', async () => {
      const context = createMockContext();

      const output = await command.execute({ values: [42] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(42);
      expect(output.values).toEqual([42]);
    });

    it('should log multiple values', async () => {
      const context = createMockContext();

      const output = await command.execute({ values: ['Result:', 42, true] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Result:', 42, true);
      expect(output.values).toEqual(['Result:', 42, true]);
    });

    it('should log object value', async () => {
      const context = createMockContext();
      const obj = { foo: 'bar', baz: 123 };

      const output = await command.execute({ values: [obj] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(obj);
      expect(output.values).toEqual([obj]);
    });

    it('should log array value', async () => {
      const context = createMockContext();
      const arr = [1, 2, 3, 4, 5];

      const output = await command.execute({ values: [arr] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(arr);
      expect(output.values).toEqual([arr]);
    });

    it('should log null and undefined', async () => {
      const context = createMockContext();

      const output = await command.execute({ values: [null, undefined] }, context);

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(null, undefined);
      expect(output.values).toEqual([null, undefined]);
    });

    it('should return timestamp', async () => {
      const context = createMockContext();
      const beforeTime = new Date();

      const output = await command.execute({ values: ['test'] }, context);

      const afterTime = new Date();

      expect(output.loggedAt).toBeInstanceOf(Date);
      expect(output.loggedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(output.loggedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should return all logged values in output', async () => {
      const context = createMockContext();
      const values = ['a', 'b', 'c', 123, true, null];

      const output = await command.execute({ values }, context);

      expect(output.values).toEqual(values);
      expect(output.values).toBe(values); // Same reference
    });
  });

  describe('validate', () => {
    it('should validate correct input with no values', () => {
      const input = { values: [] };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct input with single value', () => {
      const input = { values: ['Hello'] };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct input with multiple values', () => {
      const input = { values: ['a', 123, true, null, undefined, { foo: 'bar' }] };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject null input', () => {
      expect(command.validate(null)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(command.validate('not an object')).toBe(false);
      expect(command.validate(123)).toBe(false);
      expect(command.validate(true)).toBe(false);
    });

    it('should reject input without values', () => {
      expect(command.validate({})).toBe(false);
      expect(command.validate({ other: 'property' })).toBe(false);
    });

    it('should reject input with non-array values', () => {
      expect(command.validate({ values: 'not-an-array' })).toBe(false);
      expect(command.validate({ values: 123 })).toBe(false);
      expect(command.validate({ values: { foo: 'bar' } })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should log value end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: 'Test Message' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('Test Message');

      // Verify output
      expect(output.values).toEqual(['Test Message']);
      expect(output.loggedAt).toBeInstanceOf(Date);
    });

    it('should log multiple values end-to-end', async () => {
      const context = createMockContext();
      let callCount = 0;
      const valuesToReturn = ['X:', 100, 'Y:', 200];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      };

      // Parse input
      const input = await command.parseInput(
        {
          args: [
            { value: 'X:' } as any,
            { value: 100 } as any,
            { value: 'Y:' } as any,
            { value: 200 } as any,
          ],
          modifiers: {},
        },
        evaluator as any,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify console.log was called
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith('X:', 100, 'Y:', 200);

      // Verify output
      expect(output.values).toEqual(['X:', 100, 'Y:', 200]);
    });

    it('should log empty line end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input (no args)
      const input = await command.parseInput(
        { args: [], modifiers: {} },
        evaluator as any,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify console.log was called with no args
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith();

      // Verify output
      expect(output.values).toEqual([]);
    });
  });
});
