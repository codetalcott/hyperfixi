/**
 * Unit Tests for EmptyCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmptyCommand } from '../empty';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

function mockNode<T>(value: T): ASTNode {
  return { type: 'literal', value } as ASTNode;
}

function inlineEvaluator<T>(returnValue: T): ExpressionEvaluator {
  return { evaluate: async () => returnValue } as unknown as ExpressionEvaluator;
}

function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;
  document.body.appendChild(element);
  return element;
}

function cleanupElement(element: HTMLElement): void {
  element.parentNode?.removeChild(element);
}

function createMockContext(me: HTMLElement): ExecutionContext & TypedExecutionContext {
  return {
    me,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: me,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

describe('EmptyCommand', () => {
  let command: EmptyCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new EmptyCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('empty');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to context.me when no args', async () => {
      const el = createTestElement('<div><span>child</span></div>');
      testElements.push(el);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(el)
      );

      expect(result.targets).toEqual([el]);
    });

    it('resolves a CSS selector arg', async () => {
      const el = createTestElement('<ul class="list"><li>a</li></ul>');
      testElements.push(el);

      const result = await command.parseInput(
        { args: [mockNode('.list')], modifiers: {} },
        inlineEvaluator('.list'),
        createMockContext(el)
      );

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]).toBe(el);
    });
  });

  describe('execute', () => {
    it('removes all children from an element', async () => {
      const el = createTestElement('<ul><li>a</li><li>b</li><li>c</li></ul>');
      testElements.push(el);

      expect(el.children.length).toBe(3);

      await command.execute({ targets: [el] }, createMockContext(el));

      expect(el.children.length).toBe(0);
      expect(el.innerHTML).toBe('');
    });

    it('clears text content too', async () => {
      const el = createTestElement('<p>hello world</p>');
      testElements.push(el);

      await command.execute({ targets: [el] }, createMockContext(el));

      expect(el.textContent).toBe('');
    });

    it('handles multiple targets', async () => {
      const a = createTestElement('<div class="x"><span>a</span></div>');
      const b = createTestElement('<div class="x"><span>b</span></div>');
      testElements.push(a, b);

      await command.execute({ targets: [a, b] }, createMockContext(a));

      expect(a.children.length).toBe(0);
      expect(b.children.length).toBe(0);
    });

    it('is a no-op on already-empty elements', async () => {
      const el = createTestElement('<div></div>');
      testElements.push(el);

      await command.execute({ targets: [el] }, createMockContext(el));

      expect(el.innerHTML).toBe('');
    });
  });

  describe('validate', () => {
    it('accepts valid input', () => {
      const el = createTestElement('<div/>');
      testElements.push(el);
      expect(command.validate({ targets: [el] })).toBe(true);
    });

    it('rejects null and non-object input', () => {
      expect(command.validate(null)).toBe(false);
      expect(command.validate({})).toBe(false);
    });

    it('rejects non-HTMLElement targets', () => {
      expect(command.validate({ targets: ['not-an-element'] })).toBe(false);
    });
  });
});
