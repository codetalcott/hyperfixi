/**
 * Unit Tests for SelectCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelectCommand } from '../select';
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

describe('SelectCommand', () => {
  let command: SelectCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new SelectCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('select');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to context.me when no args', async () => {
      const input = createTestElement('<input type="text" value="hello"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(input)
      );

      expect(result.targets).toEqual([input]);
    });

    it('resolves a CSS selector arg', async () => {
      const input = createTestElement('<input class="target" type="text" value="x"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [mockNode('.target')], modifiers: {} },
        inlineEvaluator('.target'),
        createMockContext(input)
      );

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]).toBe(input);
    });
  });

  describe('execute', () => {
    it('calls .select() on an <input>', async () => {
      const input = createTestElement('<input type="text" value="hello"/>') as HTMLInputElement;
      testElements.push(input);

      let called = false;
      const originalSelect = input.select.bind(input);
      input.select = () => {
        called = true;
        originalSelect();
      };

      await command.execute({ targets: [input] }, createMockContext(input));

      expect(called).toBe(true);
    });

    it('calls .select() on a <textarea>', async () => {
      const textarea = createTestElement('<textarea>hello world</textarea>') as HTMLTextAreaElement;
      testElements.push(textarea);

      let called = false;
      textarea.select = () => {
        called = true;
      };

      await command.execute({ targets: [textarea] }, createMockContext(textarea));

      expect(called).toBe(true);
    });

    it('uses Selection API for non-text-field elements', async () => {
      const p = createTestElement('<p>hello world</p>');
      testElements.push(p);

      await command.execute({ targets: [p] }, createMockContext(p));

      const selection = window.getSelection?.();
      if (!selection) {
        // Environment without Selection API — at least we didn't throw
        return;
      }
      expect(selection.rangeCount).toBeGreaterThanOrEqual(1);
    });

    it('is a no-op when no targets provided', async () => {
      const el = createTestElement('<p>x</p>');
      testElements.push(el);

      await expect(
        command.execute({ targets: [] }, createMockContext(el))
      ).resolves.toBeUndefined();
    });
  });

  describe('validate', () => {
    it('accepts valid input', () => {
      const input = createTestElement('<input/>');
      testElements.push(input);
      expect(command.validate({ targets: [input] })).toBe(true);
    });

    it('rejects null and non-object input', () => {
      expect(command.validate(null)).toBe(false);
      expect(command.validate({})).toBe(false);
    });

    it('rejects non-HTMLElement targets', () => {
      expect(command.validate({ targets: [42] })).toBe(false);
    });
  });
});
