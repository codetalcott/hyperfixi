/**
 * Unit Tests for PickCommand
 *
 * Tests the pick command which selects a random element from a collection.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PickCommand } from '../pick';
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

function createMockEvaluator(valuesToReturn?: unknown[]) {
  let callCount = 0;
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (valuesToReturn) {
        return valuesToReturn[callCount++];
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('PickCommand', () => {
  let command: PickCommand;

  beforeEach(() => {
    command = new PickCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('pick');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('random');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have random-selection side effect', () => {
      expect(command.metadata.sideEffects).toContain('random-selection');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
      expect(command.metadata.syntax.some((s: string) => s.includes('pick'))).toBe(true);
    });
  });

  describe('parseInput', () => {
    it('should parse multiple items', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['red', 'green', 'blue']);

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'red' },
            { type: 'literal', value: 'green' },
            { type: 'literal', value: 'blue' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.items).toEqual(['red', 'green', 'blue']);
      expect(input.array).toBeUndefined();
    });

    it('should parse from array modifier', async () => {
      const context = createMockContext();
      const colors = ['red', 'green', 'blue'];
      const evaluator = createMockEvaluator([colors]);

      const input = await command.parseInput(
        {
          args: [],
          modifiers: { from: { type: 'variable', name: 'colors' } },
        },
        evaluator,
        context
      );

      expect(input.array).toEqual(colors);
      expect(input.items).toBeUndefined();
    });

    it('should throw if from modifier is not an array', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['not-an-array']);

      await expect(
        command.parseInput(
          {
            args: [],
            modifiers: { from: { type: 'variable', name: 'notArray' } },
          },
          evaluator,
          context
        )
      ).rejects.toThrow('pick from requires an array');
    });

    it('should throw if from array is empty', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator([[]]);

      await expect(
        command.parseInput(
          {
            args: [],
            modifiers: { from: { type: 'variable', name: 'emptyArray' } },
          },
          evaluator,
          context
        )
      ).rejects.toThrow('Cannot pick from empty array');
    });

    it('should throw if no items provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('pick command requires items to choose from');
    });

    it('should parse single item', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator([42]);

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 42 }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.items).toEqual([42]);
    });

    it('should parse mixed types', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['text', 42, true, null]);

      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'text' },
            { type: 'literal', value: 42 },
            { type: 'literal', value: true },
            { type: 'literal', value: null },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.items).toEqual(['text', 42, true, null]);
    });
  });

  describe('execute', () => {
    it('should select item from items array', async () => {
      const context = createMockContext();
      const input = { items: ['a', 'b', 'c'] };

      const output = await command.execute(input, context);

      expect(output.selectedItem).toBeDefined();
      expect(['a', 'b', 'c']).toContain(output.selectedItem);
      expect(output.sourceType).toBe('items');
      expect(output.sourceLength).toBe(3);
    });

    it('should select item from array', async () => {
      const context = createMockContext();
      const input = { array: [1, 2, 3, 4, 5] };

      const output = await command.execute(input, context);

      expect(output.selectedItem).toBeDefined();
      expect([1, 2, 3, 4, 5]).toContain(output.selectedItem);
      expect(output.sourceType).toBe('array');
      expect(output.sourceLength).toBe(5);
    });

    it('should set context.it to selected item', async () => {
      const context = createMockContext();
      const input = { items: ['x', 'y', 'z'] };

      await command.execute(input, context);

      expect(context.it).toBeDefined();
      expect(['x', 'y', 'z']).toContain(context.it);
    });

    it('should return valid selectedIndex', async () => {
      const context = createMockContext();
      const input = { items: ['a', 'b', 'c'] };

      const output = await command.execute(input, context);

      expect(output.selectedIndex).toBeGreaterThanOrEqual(0);
      expect(output.selectedIndex).toBeLessThan(3);
      expect(output.selectedItem).toBe(input.items![output.selectedIndex]);
    });

    it('should handle single-item array', async () => {
      const context = createMockContext();
      const input = { items: ['only'] };

      const output = await command.execute(input, context);

      expect(output.selectedItem).toBe('only');
      expect(output.selectedIndex).toBe(0);
      expect(output.sourceLength).toBe(1);
      expect(context.it).toBe('only');
    });

    it('should work with Math.random mock', async () => {
      const context = createMockContext();
      const input = { items: ['first', 'second', 'third'] };

      // Mock Math.random to always return 0.5 (should select middle item)
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.5);

      const output = await command.execute(input, context);

      expect(output.selectedIndex).toBe(1); // 0.5 * 3 = 1.5, floor = 1
      expect(output.selectedItem).toBe('second');

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should work with Math.random mock for first item', async () => {
      const context = createMockContext();
      const input = { items: ['first', 'second', 'third'] };

      // Mock Math.random to return 0 (should select first item)
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0);

      const output = await command.execute(input, context);

      expect(output.selectedIndex).toBe(0);
      expect(output.selectedItem).toBe('first');

      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should work with Math.random mock for last item', async () => {
      const context = createMockContext();
      const input = { items: ['first', 'second', 'third'] };

      // Mock Math.random to return 0.999 (should select last item)
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.999);

      const output = await command.execute(input, context);

      expect(output.selectedIndex).toBe(2); // 0.999 * 3 = 2.997, floor = 2
      expect(output.selectedItem).toBe('third');

      // Restore Math.random
      Math.random = originalRandom;
    });
  });

  describe('integration', () => {
    it('should parse and execute end-to-end with items', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['red', 'green', 'blue']);

      // Parse
      const input = await command.parseInput(
        {
          args: [
            { type: 'literal', value: 'red' },
            { type: 'literal', value: 'green' },
            { type: 'literal', value: 'blue' },
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(output.selectedItem).toBeDefined();
      expect(['red', 'green', 'blue']).toContain(output.selectedItem);
      expect(context.it).toBe(output.selectedItem);
      expect(output.sourceType).toBe('items');
      expect(output.sourceLength).toBe(3);
    });

    it('should parse and execute end-to-end with from modifier', async () => {
      const context = createMockContext();
      const numbers = [1, 2, 3, 4, 5];
      const evaluator = createMockEvaluator([numbers]);

      // Parse
      const input = await command.parseInput(
        {
          args: [],
          modifiers: { from: { type: 'variable', name: 'numbers' } },
        },
        evaluator,
        context
      );

      // Execute
      const output = await command.execute(input, context);

      expect(output.selectedItem).toBeDefined();
      expect(numbers).toContain(output.selectedItem);
      expect(context.it).toBe(output.selectedItem);
      expect(output.sourceType).toBe('array');
      expect(output.sourceLength).toBe(5);
    });
  });
});
