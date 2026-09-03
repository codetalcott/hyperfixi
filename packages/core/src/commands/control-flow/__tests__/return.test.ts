/**
 * Unit Tests for ReturnCommand
 *
 * Tests the return command which returns a value from a command sequence
 * or function, terminating execution with a control flow signal.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReturnCommand } from '../return';
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
    returnValue: undefined,
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

describe('ReturnCommand', () => {
  let command: ReturnCommand;

  beforeEach(() => {
    command = new ReturnCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('return');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('return');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have control-flow and context-mutation side effects', () => {
      expect(command.metadata.sideEffects).toContain('control-flow');
      expect(command.metadata.sideEffects).toContain('context-mutation');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toContain('return');
      expect(command.metadata.syntax).toContain('return <value>');
    });
  });

  describe('parseInput', () => {
    it('should parse with no arguments (return undefined)', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toMatchObject({ value: undefined });
    });

    it('should parse with numeric value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(42);

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 42 }], modifiers: {} },
        evaluator,
        context
      );

      expect(input).toMatchObject({ value: 42 });
    });

    it('should parse with string value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('Hello World');

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 'Hello World' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input).toMatchObject({ value: 'Hello World' });
    });

    it('should parse with object value', async () => {
      const context = createMockContext();
      const obj = { foo: 'bar', nested: { value: 123 } };
      const evaluator = createMockEvaluator(obj);

      const input = await command.parseInput(
        { args: [{ type: 'object', value: obj }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.value).toBe(obj);
    });

    it('should parse with null value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(null);

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: null }], modifiers: {} },
        evaluator,
        context
      );

      expect(input).toMatchObject({ value: null });
    });
  });

  describe('execute', () => {
    it('should return a signal with isReturn flag', async () => {
      const context = createMockContext();
      const input = { value: 42 };

      const signal: any = await command.execute(input, context);

      expect(signal).toBeDefined();
      expect(signal.type).toBe('return');
    });

    it('should return a signal with RETURN_VALUE message', async () => {
      const context = createMockContext();
      const input = { value: 42 };

      const signal: any = await command.execute(input, context);

      expect(signal.type).toBe('return');
    });

    it('should attach returnValue to error', async () => {
      const context = createMockContext();
      const input = { value: 'test value' };

      const signal: any = await command.execute(input, context);

      expect(signal.returnValue).toBe('test value');
    });

    it('should set context.it to return value', async () => {
      const context = createMockContext();
      const input = { value: 123 };

      try {
        await command.execute(input, context);
      } catch (error) {
        // Expected to throw
      }

      expect(context.it).toBe(123);
    });

    it('should set context.returnValue if property exists', async () => {
      const context = createMockContext();
      const input = { value: 'result' };

      try {
        await command.execute(input, context);
      } catch (error) {
        // Expected to throw
      }

      expect((context as any).returnValue).toBe('result');
    });

    it('should handle undefined return value', async () => {
      const context = createMockContext();
      const input = { value: undefined };

      const signal: any = await command.execute(input, context);

      expect(signal.returnValue).toBeUndefined();
      expect(context.it).toBeUndefined();
    });

    it('should handle object return value', async () => {
      const context = createMockContext();
      const obj = { data: 'test', count: 5 };
      const input = { value: obj };

      const signal: any = await command.execute(input, context);

      expect(signal.returnValue).toBe(obj);
      expect(context.it).toBe(obj);
    });
  });

  describe('integration', () => {
    it('should parse and execute end-to-end with value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(42);

      // Parse
      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 42 }], modifiers: {} },
        evaluator,
        context
      );

      // Execute and verify it throws
      const signal: any = await command.execute(input, context);

      expect(signal).toBeDefined();
      expect(signal.type).toBe('return');
      expect(signal.returnValue).toBe(42);
      expect(context.it).toBe(42);
    });

    it('should parse and execute end-to-end without value', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse (no args = return undefined)
      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      // Execute and verify it throws
      const signal: any = await command.execute(input, context);

      expect(signal).toBeDefined();
      expect(signal.type).toBe('return');
      expect(signal.returnValue).toBeUndefined();
      expect(context.it).toBeUndefined();
    });
  });
});
