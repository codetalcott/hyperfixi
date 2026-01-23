/**
 * Unit Tests for DecrementCommand (Standalone V2)
 *
 * Adapted from V1 tests - comprehensive coverage of all decrement behaviors
 * Fixed to use correct args format (not modifiers)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NumericModifyCommand as DecrementCommand } from '../increment';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('input');
  meElement.id = 'test-element';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      return node;
    },
  } as ExpressionEvaluator;
}

// ========== Tests ==========

describe('DecrementCommand (Standalone V2)', () => {
  let command: DecrementCommand;
  let context: ExecutionContext & TypedExecutionContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    command = new DecrementCommand();
    context = createMockContext();
    evaluator = createMockEvaluator();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('increment');
    });

    it('should have metadata with description', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('modify');
    });

    it('should have syntax examples', () => {
      expect(command.metadata.syntax).toBeInstanceOf(Array);
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
    });

    it('should have usage examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.some(ex => ex.includes('decrement'))).toBe(true);
    });

    it('should have correct side effects', () => {
      expect(command.metadata.sideEffects).toContain('data-mutation');
      expect(command.metadata.sideEffects).toContain('context-modification');
    });
  });

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('requires a target');
    });

    it('should parse variable name from identifier', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      expect(input.target).toBe('counter');
      expect(input.amount).toBe(1); // default
      expect(input.operation).toBe('decrement');
    });

    it('should parse amount from args', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      expect(input.target).toBe('counter');
      expect(input.amount).toBe(5);
      expect(input.operation).toBe('decrement');
    });

    it('should detect operation as decrement', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      expect(input.operation).toBe('decrement');
    });
  });

  describe('execute - Basic Variable Decrement', () => {
    it('should decrement local variable by 1 (default)', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('counter')).toBe(4);
    });

    it('should decrement local variable by specified amount', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 2 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('counter')).toBe(3);
    });

    it('should decrement global variable by 1 (default)', async () => {
      context.globals.set('globalCounter', 10);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'globalCounter', scope: 'global' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.globals.get('globalCounter')).toBe(9);
    });

    it('should decrement global variable by specified amount', async () => {
      context.globals.set('globalCounter', 20);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'globalCounter', scope: 'global' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.globals.get('globalCounter')).toBe(15);
    });
  });

  describe('execute - Null/Undefined Variable Handling', () => {
    it('should initialize null variable to 0 then decrement by 1', async () => {
      context.locals.set('nullVar', null);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'nullVar' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('nullVar')).toBe(-1);
    });

    it('should initialize undefined variable to 0 then decrement by 1', async () => {
      context.locals.set('undefinedVar', undefined);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'undefinedVar' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('undefinedVar')).toBe(-1);
    });

    it('should initialize new variable to 0 then decrement by 1', async () => {
      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'newVariable' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('newVariable')).toBe(-1);
    });

    it('should initialize null variable to 0 then decrement by specified amount', async () => {
      context.locals.set('nullVar', null);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'nullVar' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('nullVar')).toBe(-5);
    });

    it('should initialize new variable to 0 then decrement by specified amount', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'newVariable' } as any,
            { type: 'literal', value: 7 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('newVariable')).toBe(-7);
    });
  });

  describe('execute - Decimal and Negative Values', () => {
    it('should handle decimal decrement amounts', async () => {
      context.locals.set('value', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: 2.5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(7.5);
    });

    it('should handle negative decrement (becomes addition)', async () => {
      context.locals.set('value', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: -3 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(13);
    });

    it('should handle decrementing into negative value', async () => {
      context.locals.set('value', 3);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(-2);
    });

    it('should handle zero decrement', async () => {
      context.locals.set('value', 5);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'value' } as any,
            { type: 'literal', value: 0 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('value')).toBe(5);
    });
  });

  describe('execute - Context Updates', () => {
    it('should set context.it to the new value', async () => {
      context.locals.set('counter', 5);

      const input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'counter' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.it).toBe(4);
    });

    it('should return the new value', async () => {
      context.locals.set('counter', 10);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 3 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(7);
    });
  });

  describe('execute - Variable Scope Resolution', () => {
    it('should prefer local variables over global', async () => {
      context.locals.set('counter', 10);
      context.globals.set('counter', 100);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 2 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('counter')).toBe(8);
      expect(context.globals.get('counter')).toBe(100); // unchanged
    });

    it('should decrement global variable when local not found', async () => {
      context.globals.set('counter', 30);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'counter' } as any,
            { type: 'literal', value: 5 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.globals.get('counter')).toBe(25);
      expect(context.locals.has('counter')).toBe(false);
    });

    it('should create new local variable when neither local nor global exists', async () => {
      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'newCounter' } as any,
            { type: 'literal', value: 8 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      await command.execute(input, context);

      expect(context.locals.get('newCounter')).toBe(-8);
      expect(context.globals.has('newCounter')).toBe(false);
    });
  });

  describe('integration', () => {
    it('should work end-to-end for local variable', async () => {
      context.locals.set('myCounter', 100);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'myCounter' } as any,
            { type: 'literal', value: 25 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(75);
      expect(context.locals.get('myCounter')).toBe(75);
      expect(context.it).toBe(75);
    });

    it('should work end-to-end for global variable', async () => {
      context.globals.set('score', 500);

      const input = await command.parseInput(
        {
          args: [
            { type: 'identifier', name: 'score', scope: 'global' } as any,
            { type: 'literal', value: 100 } as any,
          ],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );

      const result = await command.execute(input, context);

      expect(result).toBe(400);
      expect(context.globals.get('score')).toBe(400);
    });

    it('should handle countdown to zero and beyond', async () => {
      context.locals.set('timer', 3);

      // Countdown: 3 -> 2
      let input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'timer' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );
      await command.execute(input, context);
      expect(context.locals.get('timer')).toBe(2);

      // 2 -> 1
      input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'timer' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );
      await command.execute(input, context);
      expect(context.locals.get('timer')).toBe(1);

      // 1 -> 0
      input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'timer' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );
      await command.execute(input, context);
      expect(context.locals.get('timer')).toBe(0);

      // 0 -> -1
      input = await command.parseInput(
        {
          args: [{ type: 'identifier', name: 'timer' } as any],
          modifiers: {},
          commandName: 'decrement',
        },
        evaluator,
        context
      );
      await command.execute(input, context);
      expect(context.locals.get('timer')).toBe(-1);
    });
  });
});
