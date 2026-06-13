/**
 * Unit Tests for HaltCommand
 *
 * Tests the halt command which stops execution of the current command
 * sequence or prevents event defaults (preventDefault + stopPropagation).
 * Supports "halt", "halt the event", and "halt <expression>" syntax.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HaltCommand } from '../halt';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
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

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as any).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

function createMockEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    type: 'click',
  };
}

// ========== Tests ==========

describe('HaltCommand', () => {
  let command: HaltCommand;

  beforeEach(() => {
    command = new HaltCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('halt');
    });

    it('should have description containing stop or halt', () => {
      const desc = command.metadata.description.toLowerCase();
      expect(desc.includes('stop') || desc.includes('halt')).toBe(true);
    });

    it('should have syntax array', () => {
      expect(command.metadata.syntax).toBeInstanceOf(Array);
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
    });

    it('should have examples', () => {
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have both control-flow and event-prevention side effects', () => {
      expect(command.metadata.sideEffects).toContain('control-flow');
      expect(command.metadata.sideEffects).toContain('event-prevention');
    });
  });

  describe('parseInput', () => {
    it('should return empty object when no args provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toEqual({});
    });

    it('should parse "the event" pattern and return context.event as target', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });
      const evaluator = createMockEvaluator();

      const args = [
        { type: 'identifier', name: 'the' },
        { type: 'identifier', name: 'event' },
      ] as unknown as ASTNode[];

      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      expect(input.target).toBe(mockEvent);
    });

    it('should recognize a leading "the" article (identifier) as halt-the-event, event noun dropped', async () => {
      // Cross-language halt-propagation: the i18n transformer leaves the article
      // "the" verbatim and the event noun is often dropped/elsewhere, so a
      // non-en `halt the event` arrives as a single identifier `the` (en arrives
      // as a literal). Both mean prevent-default-and-continue — NOT stop the
      // handler. Without this the article evaluated to undefined and halt threw,
      // swallowing every following command (es/de/ar/ru/… halt-propagation).
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });
      const evaluator = createMockEvaluator();

      const args = [{ type: 'identifier', name: 'the' }] as unknown as ASTNode[];
      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      expect(input.target).toBe(mockEvent);
    });

    it('should recognize a leading "the" literal as halt-the-event (en form)', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });
      const evaluator = createMockEvaluator();

      const args = [{ type: 'literal', value: 'the' }] as unknown as ASTNode[];
      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      expect(input.target).toBe(mockEvent);
    });

    it('should evaluate single arg when not "the event" pattern', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const args = [{ value: 'someValue' }] as unknown as ASTNode[];

      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      expect(input.target).toBe('someValue');
    });

    it('should handle args without matching the event pattern', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Single identifier that is not "the event" pair
      const args = [{ type: 'identifier', name: 'myVar' }] as unknown as ASTNode[];

      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      expect(input.target).toBe('myVar');
    });
  });

  describe('execute - Regular Halt', () => {
    it('should throw Error with message HALT_EXECUTION', async () => {
      const context = createMockContext();

      let thrownError: any;
      try {
        await command.execute({}, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.message).toBe('HALT_EXECUTION');
    });

    it('should throw error with isHalt flag set to true', async () => {
      const context = createMockContext();

      let thrownError: any;
      try {
        await command.execute({}, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.isHalt).toBe(true);
    });

    it('should set context.halted to true if property exists', async () => {
      const context = createMockContext();
      (context as any).halted = false;

      try {
        await command.execute({}, context);
      } catch {
        // Expected to throw
      }

      expect((context as any).halted).toBe(true);
    });

    it('should always throw and never return a value', async () => {
      const context = createMockContext();

      let didReturn = false;
      try {
        await command.execute({}, context);
        didReturn = true;
      } catch {
        // Expected to throw
      }

      expect(didReturn).toBe(false);
    });
  });

  describe('execute - Event Halt', () => {
    it('should call preventDefault on the event', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext();

      await command.execute({ target: mockEvent }, context);

      expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
    });

    it('should call stopPropagation on the event', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext();

      await command.execute({ target: mockEvent }, context);

      expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
    });

    it('should return halted true and eventHalted true', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext();

      const result = await command.execute({ target: mockEvent }, context);

      expect(result.halted).toBe(true);
      expect(result.eventHalted).toBe(true);
    });

    it('should return timestamp as a number', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext();

      const result = await command.execute({ target: mockEvent }, context);

      expect(typeof result.timestamp).toBe('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('execute - Event Resolution', () => {
    it('should resolve string "the" target via context.event', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });

      const result = await command.execute({ target: 'the' }, context);

      expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
      expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
      expect(result.halted).toBe(true);
      expect(result.eventHalted).toBe(true);
    });

    it('should resolve object with target="the" via context.event', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });

      const result = await command.execute({ target: { target: 'the' } }, context);

      expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
      expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
      expect(result.halted).toBe(true);
      expect(result.eventHalted).toBe(true);
    });

    it('should treat non-event objects as regular halt', async () => {
      const context = createMockContext();
      const plainObject = { foo: 'bar' };

      let thrownError: any;
      try {
        await command.execute({ target: plainObject }, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError.isHalt).toBe(true);
      expect(thrownError.message).toBe('HALT_EXECUTION');
    });
  });

  describe('integration', () => {
    it('should parse and execute regular halt end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse with no args
      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      // Execute and verify it throws
      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.isHalt).toBe(true);
      expect(thrownError.message).toBe('HALT_EXECUTION');
    });

    it('should parse and execute event halt end-to-end', async () => {
      const mockEvent = createMockEvent();
      const context = createMockContext({ event: mockEvent as any });
      const evaluator = createMockEvaluator();

      // Parse "halt the event"
      const args = [
        { type: 'identifier', name: 'the' },
        { type: 'identifier', name: 'event' },
      ] as unknown as ASTNode[];

      const input = await command.parseInput({ args, modifiers: {} }, evaluator, context);

      // Execute
      const result = await command.execute(input, context);

      expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
      expect(mockEvent.stopPropagation).toHaveBeenCalledOnce();
      expect(result.halted).toBe(true);
      expect(result.eventHalted).toBe(true);
      expect(typeof result.timestamp).toBe('number');
    });
  });
});
