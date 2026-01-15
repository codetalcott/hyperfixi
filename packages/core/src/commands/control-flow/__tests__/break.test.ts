/**
 * Unit Tests for BreakCommand
 *
 * Tests the break command which exits from the current loop.
 * Uses the ControlFlowSignalBase pattern to throw control flow signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BreakCommand } from '../break';
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

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('BreakCommand', () => {
  let command: BreakCommand;

  beforeEach(() => {
    command = new BreakCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('break');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('loop');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have control-flow side effect', () => {
      expect(command.metadata.sideEffects).toContain('control-flow');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toContain('break');
    });
  });

  describe('parseInput', () => {
    it('should parse with no arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toMatchObject({ signalType: 'break' });
    });

    it('should return signal type', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.signalType).toBe('break');
    });
  });

  describe('execute', () => {
    it('should throw an error with isBreak flag', async () => {
      const context = createMockContext();
      const input = { signalType: 'break' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.isBreak).toBe(true);
    });

    it('should throw error with BREAK_LOOP message', async () => {
      const context = createMockContext();
      const input = { signalType: 'break' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.message).toBe('BREAK_LOOP');
    });

    it('should not modify execution context before throwing', async () => {
      const context = createMockContext();
      const originalIt = { preserved: true };
      context.it = originalIt;
      const input = { signalType: 'break' as const };

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
    it('should parse and execute end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse
      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      // Execute and verify it throws
      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError.isBreak).toBe(true);
      expect(thrownError.message).toBe('BREAK_LOOP');
    });
  });
});
