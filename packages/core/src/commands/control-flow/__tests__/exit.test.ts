/**
 * Unit Tests for ExitCommand
 *
 * Tests the exit command which immediately terminates execution of
 * the current event handler or behavior.
 * Uses the ControlFlowSignalBase pattern to throw control flow signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExitCommand } from '../exit';
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

describe('ExitCommand', () => {
  let command: ExitCommand;

  beforeEach(() => {
    command = new ExitCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('exit');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('terminate');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have control-flow side effect', () => {
      expect(command.metadata.sideEffects).toContain('control-flow');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toContain('exit');
    });
  });

  describe('parseInput', () => {
    it('should parse with no arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toMatchObject({ signalType: 'exit' });
    });

    it('should return signal type', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.signalType).toBe('exit');
    });
  });

  describe('execute', () => {
    it('should throw an error with isExit flag', async () => {
      const context = createMockContext();
      const input = { signalType: 'exit' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.isExit).toBe(true);
    });

    it('should throw error with EXIT_COMMAND message', async () => {
      const context = createMockContext();
      const input = { signalType: 'exit' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.message).toBe('EXIT_COMMAND');
    });

    it('should include returnValue as undefined', async () => {
      const context = createMockContext();
      const input = { signalType: 'exit' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.returnValue).toBeUndefined();
    });

    it('should include timestamp', async () => {
      const context = createMockContext();
      const input = { signalType: 'exit' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.timestamp).toBeDefined();
      expect(typeof thrownError.timestamp).toBe('number');
      expect(thrownError.timestamp).toBeGreaterThan(0);
    });

    it('should not modify execution context before throwing', async () => {
      const context = createMockContext();
      const originalIt = { preserved: true };
      context.it = originalIt;
      const input = { signalType: 'exit' as const };

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
      expect(thrownError.isExit).toBe(true);
      expect(thrownError.message).toBe('EXIT_COMMAND');
      expect(thrownError.returnValue).toBeUndefined();
      expect(thrownError.timestamp).toBeDefined();
    });
  });
});
