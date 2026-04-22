/**
 * Unit Tests for BreakpointCommand
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BreakpointCommand } from '../breakpoint';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

function inlineEvaluator(): ExpressionEvaluator {
  return { evaluate: async () => null } as unknown as ExpressionEvaluator;
}

function createMockContext(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
  } as unknown as ExecutionContext & TypedExecutionContext;
}

describe('BreakpointCommand', () => {
  let command: BreakpointCommand;

  beforeEach(() => {
    command = new BreakpointCommand();
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('breakpoint');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('returns empty input regardless of args', async () => {
      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(),
        createMockContext()
      );
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('execute', () => {
    it('resolves without throwing', async () => {
      // The debugger; statement is a no-op when no debugger is attached.
      await expect(command.execute({}, createMockContext())).resolves.toBeUndefined();
    });
  });

  describe('validate', () => {
    it('accepts empty object', () => {
      expect(command.validate({})).toBe(true);
    });

    it('accepts object with extra properties', () => {
      expect(command.validate({ _tag: 'breakpoint' })).toBe(true);
    });

    it('rejects null', () => {
      expect(command.validate(null)).toBe(false);
    });

    it('rejects non-object input', () => {
      expect(command.validate('string')).toBe(false);
      expect(command.validate(123)).toBe(false);
    });
  });
});
