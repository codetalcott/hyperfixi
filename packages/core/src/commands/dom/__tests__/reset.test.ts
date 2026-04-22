/**
 * Unit Tests for ResetCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResetCommand } from '../reset';
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

describe('ResetCommand', () => {
  let command: ResetCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new ResetCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('reset');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to context.me when no args', async () => {
      const form = createTestElement('<form><input name="x"/></form>');
      testElements.push(form);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(form)
      );

      expect(result.targets).toEqual([form]);
    });

    it('resolves a CSS selector arg', async () => {
      const form = createTestElement('<form class="f"><input/></form>');
      testElements.push(form);

      const result = await command.parseInput(
        { args: [mockNode('.f')], modifiers: {} },
        inlineEvaluator('.f'),
        createMockContext(form)
      );

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]).toBe(form);
    });
  });

  describe('execute', () => {
    it('calls reset() on a <form>', async () => {
      const form = createTestElement(
        '<form><input name="x" value="initial"/></form>'
      ) as HTMLFormElement;
      testElements.push(form);

      const input = form.querySelector('input') as HTMLInputElement;
      // Modify then reset
      input.value = 'changed';
      expect(input.value).toBe('changed');

      await command.execute({ targets: [form] }, createMockContext(form));

      expect(input.value).toBe('initial');
    });

    it('is a no-op on non-form elements', async () => {
      const div = createTestElement('<div>content</div>');
      testElements.push(div);

      await expect(
        command.execute({ targets: [div] }, createMockContext(div))
      ).resolves.toBeUndefined();
    });

    it('resets multiple forms', async () => {
      const a = createTestElement(
        '<form class="a"><input name="x" value="a1"/></form>'
      ) as HTMLFormElement;
      const b = createTestElement(
        '<form class="b"><input name="y" value="b1"/></form>'
      ) as HTMLFormElement;
      testElements.push(a, b);

      (a.querySelector('input') as HTMLInputElement).value = 'modified-a';
      (b.querySelector('input') as HTMLInputElement).value = 'modified-b';

      await command.execute({ targets: [a, b] }, createMockContext(a));

      expect((a.querySelector('input') as HTMLInputElement).value).toBe('a1');
      expect((b.querySelector('input') as HTMLInputElement).value).toBe('b1');
    });
  });

  describe('validate', () => {
    it('accepts valid input', () => {
      const form = createTestElement('<form/>');
      testElements.push(form);
      expect(command.validate({ targets: [form] })).toBe(true);
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
