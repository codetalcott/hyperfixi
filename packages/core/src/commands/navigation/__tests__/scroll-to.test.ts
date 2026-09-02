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
import { parse } from '../../../parser/parser';
import { assertNodeOfKind } from '../../../ast/guards';

/** The element a selector names — execute takes the RESOLVED target (parseInput resolves it). */
function sel(selector: string): HTMLElement {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`test target not found: ${selector}`);
  return el as HTMLElement;
}

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
    it('should throw when no target is given', async () => {
      const context = createMockContext();
      await expect(
        command.parseInput({ args: [], modifiers: {} }, createMockEvaluator(), context)
      ).rejects.toThrow('scroll command requires a target');
    });

    it('resolves the slots the parser emits', async () => {
      const context = createMockContext();
      const chat = document.createElement('div');
      chat.id = 'chat';
      document.body.appendChild(chat);
      const node = assertNodeOfKind(parse('scroll to bottom of #chat smoothly').node, 'command');
      const input = await command.parseInput(
        { args: node.args as unknown as ASTNode[], modifiers: node.modifiers as never },
        createMockEvaluator(['#chat', 'bottom', 'smooth']),
        context
      );
      expect(input).toEqual({ target: chat, position: 'bottom', behavior: 'smooth' });
      chat.remove();
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

      const result = await command.execute({ target: sel('#target') }, context);

      // Exact options: no adverb means NO `behavior` key — upstream leaves it
      // to the browser default (`auto`); forcing `smooth` was a divergence.
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
      expect(result.element).toBe(element);
      expect(result.position).toBe('start');
      expect(result.smooth).toBe(false);

      document.body.removeChild(element);
    });

    it('should scroll to bottom of target', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'chat';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ target: sel('#chat'), position: 'bottom' }, context);

      expect(scrollSpy).toHaveBeenCalledWith({ block: 'end', inline: 'nearest' });
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

      const result = await command.execute({ target: sel('#mid'), position: 'middle' }, context);

      expect(result.position).toBe('center');
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });

      document.body.removeChild(element);
    });

    it('maps horizontal words to `inline` (upstream inlineMap), not `block`', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'wide';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      await command.execute({ target: sel('#wide'), position: 'right' }, context);
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'start', inline: 'end' });

      // `center` is upstream's HORIZONTAL word (`middle` is the vertical one).
      await command.execute({ target: sel('#wide'), position: 'center' }, context);
      expect(scrollSpy).toHaveBeenLastCalledWith({ block: 'start', inline: 'center' });

      document.body.removeChild(element);
    });

    it('should honor `smoothly` keyword', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'soft';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ target: sel('#soft'), behavior: 'smooth' }, context);

      expect(result.smooth).toBe(true);
      expect(scrollSpy).toHaveBeenCalledWith({
        block: 'start',
        inline: 'nearest',
        behavior: 'smooth',
      });

      document.body.removeChild(element);
    });

    it('should honor `instantly` keyword (non-smooth scroll)', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.id = 'now';
      document.body.appendChild(element);
      const scrollSpy = vi.fn();
      element.scrollIntoView = scrollSpy;

      const result = await command.execute({ target: sel('#now'), behavior: 'instant' }, context);

      expect(result.smooth).toBe(false);
      expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));

      document.body.removeChild(element);
    });

    it('should resolve `me` to context.me', async () => {
      const context = createMockContext();
      const scrollSpy = vi.fn();
      (context.me as HTMLElement).scrollIntoView = scrollSpy;

      const result = await command.execute({ target: context.me as HTMLElement }, context);

      expect(scrollSpy).toHaveBeenCalled();
      expect(result.element).toBe(context.me as HTMLElement);
    });

    it('should throw when target element cannot be found', async () => {
      const context = createMockContext();

      const missing = assertNodeOfKind(parse('scroll to #does-not-exist').node, 'command');
      await expect(
        command.parseInput(
          { args: missing.args as unknown as ASTNode[], modifiers: missing.modifiers as never },
          createMockEvaluator(['#does-not-exist']),
          context
        )
      ).rejects.toThrow('target element not found');
    });
  });
});
