/**
 * Unit Tests for OpenCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenCommand } from '../open';
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

describe('OpenCommand', () => {
  let command: OpenCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new OpenCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('open');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to modal dialog mode', async () => {
      const dialog = createTestElement('<dialog id="d"></dialog>');
      testElements.push(dialog);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(dialog)
      );

      expect(result.dialogMode).toBe('modal');
      expect(result.targets).toEqual([dialog]);
    });

    it('recognises "as non-modal" in modifiers', async () => {
      const dialog = createTestElement('<dialog id="d"></dialog>');
      testElements.push(dialog);

      const result = await command.parseInput(
        { args: [], modifiers: { as: mockNode('non-modal') as any } },
        inlineEvaluator('non-modal'),
        createMockContext(dialog)
      );

      expect(result.dialogMode).toBe('non-modal');
    });

    it('resolves summary to parent details', async () => {
      const details = createTestElement(
        '<details><summary class="sm">Toggle</summary><p>body</p></details>'
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
    it('opens a <dialog> as modal by default', async () => {
      const dialog = createTestElement('<dialog id="d"></dialog>') as HTMLDialogElement;
      testElements.push(dialog);

      if (typeof dialog.showModal !== 'function') {
        dialog.showModal = () => {
          dialog.open = true;
        };
      }

      await command.execute({ targets: [dialog], dialogMode: 'modal' }, createMockContext(dialog));

      expect(dialog.open).toBe(true);
    });

    it('opens a <details> element', async () => {
      const details = createTestElement('<details><p>body</p></details>') as HTMLDetailsElement;
      testElements.push(details);

      expect(details.open).toBe(false);
      await command.execute(
        { targets: [details], dialogMode: 'modal' },
        createMockContext(details)
      );
      expect(details.open).toBe(true);
    });

    it('is idempotent on already-open dialog', async () => {
      const dialog = createTestElement('<dialog id="d" open></dialog>') as HTMLDialogElement;
      testElements.push(dialog);

      // Should not throw or re-open
      await expect(
        command.execute({ targets: [dialog], dialogMode: 'modal' }, createMockContext(dialog))
      ).resolves.toBeUndefined();
      expect(dialog.open).toBe(true);
    });

    it('is a no-op on elements without open semantics', async () => {
      const div = createTestElement('<div>hi</div>');
      testElements.push(div);

      await expect(
        command.execute({ targets: [div], dialogMode: 'modal' }, createMockContext(div))
      ).resolves.toBeUndefined();
    });

    it('calls showPopover for popover elements', async () => {
      const div = createTestElement('<div popover="auto">Popup</div>');
      testElements.push(div);
      let called = false;
      (div as any).showPopover = () => {
        called = true;
      };

      await command.execute({ targets: [div], dialogMode: 'modal' }, createMockContext(div));

      expect(called).toBe(true);
    });
  });

  describe('validate', () => {
    it('accepts valid input', () => {
      const dialog = createTestElement('<dialog></dialog>');
      testElements.push(dialog);
      expect(command.validate({ targets: [dialog], dialogMode: 'modal' })).toBe(true);
    });

    it('rejects null and non-object input', () => {
      expect(command.validate(null)).toBe(false);
      expect(command.validate({})).toBe(false);
    });

    it('rejects invalid dialogMode', () => {
      const dialog = createTestElement('<dialog></dialog>');
      testElements.push(dialog);
      expect(command.validate({ targets: [dialog], dialogMode: 'bogus' })).toBe(false);
    });
  });
});
