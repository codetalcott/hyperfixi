/**
 * Unit Tests for ScrollCommand
 *
 * `scroll to <target>` replaces the deprecated `go to the top of X` scroll
 * form in upstream _hyperscript 0.9.90.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScrollCommand } from '../scroll-to';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

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
    evaluate: async (node: ASTNode) => {
      if (valuesToReturn) return valuesToReturn[callCount++];
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

describe('ScrollCommand', () => {
  let command: ScrollCommand;

  beforeEach(() => {
    command = new ScrollCommand();
  });

  describe('metadata', () => {
    it('should have command name "scroll"', () => {
      expect(command.name).toBe('scroll');
    });

    it('should describe itself as scrolling-related', () => {
      expect(command.metadata.sideEffects).toContain('scrolling');
    });
  });

  describe('parseInput', () => {
    it('should throw when no args provided', async () => {
      const context = createMockContext();
      await expect(
        command.parseInput({ args: [], modifiers: {} }, createMockEvaluator(), context)
      ).rejects.toThrow('scroll command requires a target');
    });

    it('should evaluate all args', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(['to', '#foo']);
      const input = await command.parseInput(
        {
          args: [
            { type: 'keyword', value: 'to' } as unknown as ASTNode,
            { type: 'string', value: '#foo' } as unknown as ASTNode,
          ],
          modifiers: {},
        },
        evaluator,
        context
      );
      expect(input.args).toEqual(['to', '#foo']);
    });
  });

  describe('execute', () => {
    it('should scroll to a CSS id selector', async () => {
      const context = createMockContext();
      const element = document.createElement('section');
      element.id = 'target';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ args: ['to', '#target'] }, context);

      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'start', behavior: 'smooth' })
      );
      expect(result.element).toBe(element);
      expect(result.position).toBe('start');
      expect(result.smooth).toBe(true);

      document.body.removeChild(element);
    });

    it('should scroll to bottom of target', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'chat';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ args: ['to', 'bottom', 'of', '#chat'] }, context);

      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'end', behavior: 'smooth' })
      );
      expect(result.position).toBe('end');

      document.body.removeChild(element);
    });

    it('should scroll to middle of target (center)', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'mid';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ args: ['to', 'middle', 'of', '#mid'] }, context);

      expect(result.position).toBe('center');
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));

      document.body.removeChild(element);
    });

    it('should honor `instantly` keyword (non-smooth scroll)', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'now';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ args: ['to', '#now', 'instantly'] }, context);

      expect(result.smooth).toBe(false);
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));

      document.body.removeChild(element);
    });

    it('should resolve `me` to context.me', async () => {
      const context = createMockContext();
      const scrollSpy = vi.fn();
      (context.me as HTMLElement).scrollIntoView = scrollSpy;

      const result = await command.execute({ args: ['to', 'me'] }, context);

      expect(scrollSpy).toHaveBeenCalled();
      expect(result.element).toBe(context.me as HTMLElement);
    });

    it('should throw when target element cannot be found', async () => {
      const context = createMockContext();

      await expect(command.execute({ args: ['to', '#does-not-exist'] }, context)).rejects.toThrow(
        'target element not found'
      );
    });
  });
});
