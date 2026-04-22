/**
 * Unit Tests for CloseCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CloseCommand } from '../close';
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

describe('CloseCommand', () => {
  let command: CloseCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new CloseCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('close');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to context.me when no args', async () => {
      const dialog = createTestElement('<dialog open></dialog>');
      testElements.push(dialog);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(dialog)
      );

      expect(result.targets).toEqual([dialog]);
    });

    it('resolves summary to parent details', async () => {
      const details = createTestElement(
        '<details open><summary class="sm">X</summary><p>body</p></details>'
      );
      testElements.push(details);
      const summary = details.querySelector('.sm') as HTMLElement;

      const result = await command.parseInput(
        { args: [mockNode(summary)], modifiers: {} },
        inlineEvaluator(summary),
        createMockContext(details)
      );

      expect(result.targets).toEqual([details]);
    });
  });

  describe('execute', () => {
    it('closes an open <dialog>', async () => {
      const dialog = createTestElement('<dialog open></dialog>') as HTMLDialogElement;
      testElements.push(dialog);
      expect(dialog.open).toBe(true);

      await command.execute({ targets: [dialog] }, createMockContext(dialog));

      expect(dialog.open).toBe(false);
    });

    it('closes a <details> element', async () => {
      const details = createTestElement(
        '<details open><p>body</p></details>'
      ) as HTMLDetailsElement;
      testElements.push(details);
      expect(details.open).toBe(true);

      await command.execute({ targets: [details] }, createMockContext(details));

      expect(details.open).toBe(false);
    });

    it('is idempotent on already-closed dialog', async () => {
      const dialog = createTestElement('<dialog></dialog>') as HTMLDialogElement;
      testElements.push(dialog);

      await expect(
        command.execute({ targets: [dialog] }, createMockContext(dialog))
      ).resolves.toBeUndefined();
      expect(dialog.open).toBe(false);
    });

    it('is a no-op on elements without close semantics', async () => {
      const div = createTestElement('<div>hi</div>');
      testElements.push(div);

      await expect(
        command.execute({ targets: [div] }, createMockContext(div))
      ).resolves.toBeUndefined();
    });

    it('calls hidePopover for popover elements', async () => {
      const div = createTestElement('<div popover="auto">Popup</div>');
      testElements.push(div);
      let called = false;
      (div as any).hidePopover = () => {
        called = true;
      };

      await command.execute({ targets: [div] }, createMockContext(div));

      expect(called).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts valid input', () => {
      const dialog = createTestElement('<dialog></dialog>');
      testElements.push(dialog);
      expect(command.validate({ targets: [dialog] })).toBe(true);
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
