/**
 * Unit Tests for ContinueCommand
 *
 * Tests the continue command which skips to the next iteration of a loop.
 * Uses the ControlFlowSignalBase pattern to throw control flow signals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContinueCommand } from '../continue';
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

describe('ContinueCommand', () => {
  let command: ContinueCommand;

  beforeEach(() => {
    command = new ContinueCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('continue');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('iteration');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have control-flow side effect', () => {
      expect(command.metadata.sideEffects).toContain('control-flow');
    });

    it('should have correct syntax', () => {
      expect(command.metadata.syntax).toContain('continue');
    });
  });

  describe('parseInput', () => {
    it('should parse with no arguments', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input).toMatchObject({ signalType: 'continue' });
    });

    it('should return signal type', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.signalType).toBe('continue');
    });
  });

  describe('execute', () => {
    it('should throw an error with isContinue flag', async () => {
      const context = createMockContext();
      const input = { signalType: 'continue' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError).toBeDefined();
      expect(thrownError).toBeInstanceOf(Error);
      expect(thrownError.isContinue).toBe(true);
    });

    it('should throw error with CONTINUE_LOOP message', async () => {
      const context = createMockContext();
      const input = { signalType: 'continue' as const };

      let thrownError: any;
      try {
        await command.execute(input, context);
      } catch (error) {
        thrownError = error;
      }

      expect(thrownError.message).toBe('CONTINUE_LOOP');
    });

    it('should not modify execution context before throwing', async () => {
      const context = createMockContext();
      const originalIt = { preserved: true };
      context.it = originalIt;
      const input = { signalType: 'continue' as const };

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
      expect(thrownError.isContinue).toBe(true);
      expect(thrownError.message).toBe('CONTINUE_LOOP');
    });
  });
});
