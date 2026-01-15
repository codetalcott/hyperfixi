/**
 * Unit Tests for ThrowCommand
 *
 * Tests the throw command which throws an error with a specified message,
 * terminating execution.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThrowCommand } from '../throw';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

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
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(returnValue?: unknown) {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (returnValue !== undefined) {
        return returnValue;
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('ThrowCommand', () => {
  let command: ThrowCommand;

  beforeEach(() => {
    command = new ThrowCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('throw');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('throw');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have error-throwing and execution-termination side effects', () => {
      expect(command.metadata.sideEffects).toContain('error-throwing');
      expect(command.metadata.sideEffects).toContain('execution-termination');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toContain('throw <message>');
    });
  });

  describe('parseInput', () => {
    it('should parse string message', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('Error message');

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 'Error message' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input).toMatchObject({ message: 'Error message' });
    });

    it('should parse Error object', async () => {
      const context = createMockContext();
      const error = new Error('Custom error');
      const evaluator = createMockEvaluator(error);

      const input = await command.parseInput(
        { args: [{ type: 'object', value: error }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.message).toBe(error);
    });

    it('should parse non-string value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(42);

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 42 }], modifiers: {} },
        evaluator,
        context
      );

      expect(input).toMatchObject({ message: 42 });
    });

    it('should throw if no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('throw command requires a message or error object');
    });
  });

  describe('execute', () => {
    it('should throw Error with string message', async () => {
      const context = createMockContext();
      const input = { message: 'Test error' };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('Test error');
    });

    it('should throw Error object directly when message is Error', async () => {
      const context = createMockContext();
      const customError = new Error('Custom error');
      customError.name = 'CustomError';
      const input = { message: customError };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBe(customError);
      expect(thrownError.message).toBe('Custom error');
      expect(thrownError.name).toBe('CustomError');
    });

    it('should convert non-string, non-Error message to string', async () => {
      const context = createMockContext();
      const input = { message: 42 };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('42');
    });

    it('should convert object to string', async () => {
      const context = createMockContext();
      const obj = { toString: () => 'Custom object error' };
      const input = { message: obj };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('Custom object error');
    });

    it('should convert null to string', async () => {
      const context = createMockContext();
      const input = { message: null };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('null');
    });

    it('should convert undefined to string', async () => {
      const context = createMockContext();
      const input = { message: undefined };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('undefined');
    });

    it('should not modify context before throwing', async () => {
      const context = createMockContext();
      const originalIt = { preserved: true };
      context.it = originalIt;
      const input = { message: 'Error' };

      try {
        await command.execute(input, context);
      } catch (error) {
        // Expected to throw
      }

      // Context should remain unchanged
      expect(context.it).toBe(originalIt);
    });
  });

  describe('integration', () => {
    it('should parse and execute end-to-end with string', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('Validation failed');

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 'Validation failed' }], modifiers: {} },
        evaluator,
        context
      );

      // Execute and verify it throws
      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('Validation failed');
    });

    it('should parse and execute end-to-end with Error object', async () => {
      const context = createMockContext();
      const customError = new TypeError('Type mismatch');
      const evaluator = createMockEvaluator(customError);

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'object', value: customError }], modifiers: {} },
        evaluator,
        context
      );

      // Execute and verify it throws
      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBe(customError);
      expect(thrownError).toBeInstanceOf(TypeError);
      expect(thrownError.message).toBe('Type mismatch');
    });
  });
});
