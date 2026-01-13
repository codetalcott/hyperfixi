/**
 * Unit Tests for WaitCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on core async patterns: time delays and event waiting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaitCommand } from '../wait';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

/** Test context with guaranteed non-null me */
interface TestContext extends ExecutionContext, TypedExecutionContext {
  me: HTMLElement;
}

function createMockContext(): TestContext {
  const meElement = document.createElement('div');
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
  } as unknown as TestContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as ExpressionEvaluator;
}

// ========== Tests ==========

describe('WaitCommand (Standalone V2)', () => {
  let command: WaitCommand;

  beforeEach(() => {
    command = new WaitCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('wait');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('wait');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have async category and side effects', () => {
      expect(command.metadata.category).toBe('async');
      expect(command.metadata.sideEffects).toContain('time');
      expect(command.metadata.sideEffects).toContain('event-listening');
    });
  });

  describe('parseInput - time', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('wait command requires an argument');
    });

    it('should parse number as milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: 100 }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(100);
    });

    it('should parse "2s" as 2000 milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '2s' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(2000);
    });

    it('should parse "500ms" as 500 milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '500ms' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(500);
    });

    it('should parse "1.5s" as 1500 milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '1.5s' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(1500);
    });

    it('should parse "2 seconds" as 2000 milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '2 seconds' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(2000);
    });

    it('should parse "100 milliseconds" as 100 milliseconds', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '100 milliseconds' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('time');
      expect((input as { milliseconds: number }).milliseconds).toBe(100);
    });

    it.skip('should throw error for invalid time format', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          { args: [{ type: 'literal', value: 'invalid' }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('invalid time format');
    });

    it.skip('should throw error for negative time', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          { args: [{ type: 'literal', value: -100 }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('time must be >= 0');
    });
  });

  describe('parseInput - event', () => {
    it('should parse "wait for click"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'placeholder' }],
          modifiers: { for: { type: 'expression', value: 'click' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as unknown as { eventName: string }).eventName).toBe('click');
      expect((input as unknown as { target: HTMLElement }).target).toBe(context.me);
    });

    it('should parse "wait for load"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'placeholder' }],
          modifiers: { for: { type: 'expression', value: 'load' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('load');
    });

    it('should parse "wait for custom:event"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'placeholder' }],
          modifiers: { for: { type: 'expression', value: 'custom:event' } },
        },
        evaluator,
        context
      );

      expect(input.type).toBe('event');
      expect((input as { eventName: string }).eventName).toBe('custom:event');
    });

    it('should throw error if event name is not a string', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput(
          {
            args: [{ type: 'literal', value: 'placeholder' }],
            modifiers: { for: { type: 'expression', value: 123 } },
          },
          evaluator,
          context
        )
      ).rejects.toThrow('event name must be a string');
    });
  });

  describe('execute - time', () => {
    it('should wait for specified milliseconds', async () => {
      const context = createMockContext();
      const startTime = Date.now();

      const output = await command.execute({ type: 'time', milliseconds: 50 }, context);

      const elapsed = Date.now() - startTime;

      expect(output.type).toBe('time');
      expect(output.result).toBe(50);
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
      expect(elapsed).toBeLessThan(100); // But not too much
    });

    it('should return duration in output', async () => {
      const context = createMockContext();

      const output = await command.execute({ type: 'time', milliseconds: 50 }, context);

      expect(output.duration).toBeGreaterThanOrEqual(45);
      expect(output.duration).toBeLessThan(100);
    });

    it('should handle zero wait time', async () => {
      const context = createMockContext();

      const output = await command.execute({ type: 'time', milliseconds: 0 }, context);

      expect(output.type).toBe('time');
      expect(output.result).toBe(0);
    });
  });

  describe('execute - event', () => {
    it('should wait for event', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        { type: 'event', eventName: 'click', target: element },
        context
      );

      // Trigger event after small delay
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 10);

      const output = await waitPromise;

      expect(output.type).toBe('event');
      expect(output.result).toBeInstanceOf(Event);
      expect((output.result as Event).type).toBe('click');
    });

    it('should update context.it with event', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        { type: 'event', eventName: 'click', target: element },
        context
      );

      // Trigger event
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 10);

      await waitPromise;

      expect(context.it).toBeInstanceOf(Event);
      expect((context.it as Event).type).toBe('click');
    });

    it('should return duration for event wait', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        { type: 'event', eventName: 'click', target: element },
        context
      );

      // Trigger event after 50ms
      setTimeout(() => {
        element.dispatchEvent(new Event('click'));
      }, 50);

      const output = await waitPromise;

      expect(output.duration).toBeGreaterThanOrEqual(45);
      expect(output.duration).toBeLessThan(100);
    });

    it('should remove event listener after firing', async () => {
      const context = createMockContext();
      const element = context.me;

      // Start waiting
      const waitPromise = command.execute(
        { type: 'event', eventName: 'click', target: element },
        context
      );

      // Trigger event once
      element.dispatchEvent(new Event('click'));

      await waitPromise;

      // Trigger event again - should not cause issues
      element.dispatchEvent(new Event('click'));

      // If listener wasn't removed, this would cause issues
      // No assertion needed - just verify it doesn't throw
    });

    it.skip('should throw error if no event target', async () => {
      const context = createMockContext();

      await expect(
        command.execute(
          { type: 'event', eventName: 'click', target: null as unknown as HTMLElement },
          context
        )
      ).rejects.toThrow('no event target available');
    });
  });

  // validate method removed in decorator refactor
  // describe('validate', () => {
  //   it('should validate time input', () => {
  //     const input = { type: 'time' as const, milliseconds: 100 };
  //     expect(command.validate(input)).toBe(true);
  //   });

  //   it('should validate event input', () => {
  //     const input = { type: 'event' as const, eventName: 'click' };
  //     expect(command.validate(input)).toBe(true);
  //   });

  //   it('should reject null input', () => {
  //     expect(command.validate(null)).toBe(false);
  //   });

  //   it('should reject non-object input', () => {
  //     expect(command.validate('not an object')).toBe(false);
  //     expect(command.validate(123)).toBe(false);
  //     expect(command.validate(true)).toBe(false);
  //   });

  //   it('should reject input without type', () => {
  //     expect(command.validate({ milliseconds: 100 })).toBe(false);
  //   });

  //   it('should reject input with invalid type', () => {
  //     expect(command.validate({ type: 'invalid', milliseconds: 100 })).toBe(false);
  //   });

  //   it('should reject time input without milliseconds', () => {
  //     expect(command.validate({ type: 'time' })).toBe(false);
  //   });

  //   it('should reject time input with non-number milliseconds', () => {
  //     expect(command.validate({ type: 'time', milliseconds: '100' })).toBe(false);
  //   });

  //   it('should reject time input with negative milliseconds', () => {
  //     expect(command.validate({ type: 'time', milliseconds: -100 })).toBe(false);
  //   });

  //   it('should reject event input without eventName', () => {
  //     expect(command.validate({ type: 'event' })).toBe(false);
  //   });

  //   it('should reject event input with non-string eventName', () => {
  //     expect(command.validate({ type: 'event', eventName: 123 })).toBe(false);
  //   });

  //   it('should reject event input with empty eventName', () => {
  //     expect(command.validate({ type: 'event', eventName: '' })).toBe(false);
  //   });
  // });

  describe('integration', () => {
    it('should wait for time end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const startTime = Date.now();

      // Parse input
      const input = await command.parseInput(
        { args: [{ type: 'literal', value: '50ms' }], modifiers: {} },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute
      const output = await command.execute(input, context);

      // Verify
      const elapsed = Date.now() - startTime;
      expect(output.type).toBe('time');
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it('should wait for event end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ type: 'literal', value: 'placeholder' }],
          modifiers: { for: { type: 'expression', value: 'click' } },
        },
        evaluator,
        context
      );

      // Validate - method removed in decorator refactor
      // expect(command.validate(input)).toBe(true);

      // Execute asynchronously
      const waitPromise = command.execute(input, context);

      // Trigger event
      setTimeout(() => {
        context.me.dispatchEvent(new Event('click'));
      }, 10);

      const output = await waitPromise;

      // Verify
      expect(output.type).toBe('event');
      expect((output.result as Event).type).toBe('click');
      expect(context.it).toBeInstanceOf(Event);
    });

    it('should handle multiple time formats', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const formats = [
        { input: 100, expected: 100 },
        { input: '100', expected: 100 },
        { input: '100ms', expected: 100 },
        { input: '1s', expected: 1000 },
        { input: '1.5s', expected: 1500 },
        { input: '2 seconds', expected: 2000 },
      ];

      for (const { input: timeValue, expected } of formats) {
        const input = await command.parseInput(
          { args: [{ type: 'literal', value: timeValue }], modifiers: {} },
          evaluator,
          context
        );

        expect((input as { milliseconds: number }).milliseconds).toBe(expected);
      }
    });
  });
});
