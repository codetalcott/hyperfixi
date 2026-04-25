/**
 * Unit Tests for ClearCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClearCommand } from '../clear';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

function identifierNode(name: string): ASTNode {
  return { type: 'identifier', name } as unknown as ASTNode;
}

function literalNode<T>(value: T): ASTNode {
  return { type: 'literal', value } as ASTNode;
}

function inlineEvaluator<T>(returnValue: T): ExpressionEvaluator {
  return { evaluate: async () => returnValue } as unknown as ExpressionEvaluator;
}

function throwingEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async () => {
      throw new Error('undefined variable');
    },
  } as unknown as ExpressionEvaluator;
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

function createMockContext(me: HTMLElement | null): ExecutionContext & TypedExecutionContext {
  return {
    me,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: me,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

describe('ClearCommand', () => {
  let command: ClearCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new ClearCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('clear');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput (variable form)', () => {
    it('returns variable input when identifier does not resolve to element', async () => {
      const el = createTestElement('<div>me</div>');
      testElements.push(el);

      // Identifier "count" isn't a DOM element — eval throws, so we treat as variable
      const result = await command.parseInput(
        { args: [identifierNode('count')], modifiers: {} },
        throwingEvaluator(),
        createMockContext(el)
      );

      expect(result).toEqual({ type: 'variable', name: 'count' });
    });

    it('treats variable identifier (eval returns undefined) as variable', async () => {
      const el = createTestElement('<div/>');
      testElements.push(el);

      const result = await command.parseInput(
        { args: [identifierNode('myVar')], modifiers: {} },
        inlineEvaluator(undefined),
        createMockContext(el)
      );

      expect(result).toEqual({ type: 'variable', name: 'myVar' });
    });
  });

  describe('parseInput (form-field form)', () => {
    it('resolves element when arg is a CSS selector', async () => {
      const input = createTestElement('<input class="target" value="x"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [literalNode('.target')], modifiers: {} },
        inlineEvaluator('.target'),
        createMockContext(input)
      );

      expect(result.type).toBe('form-fields');
      if (result.type === 'form-fields') {
        expect(result.targets).toEqual([input]);
      }
    });

    it('defaults to context.me when no args', async () => {
      const input = createTestElement('<input value="hi"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(input)
      );

      expect(result.type).toBe('form-fields');
      if (result.type === 'form-fields') {
        expect(result.targets).toEqual([input]);
      }
    });
  });

  describe('execute', () => {
    it('sets variable to null in context.locals', async () => {
      const context = createMockContext(createTestElement('<div/>'));
      testElements.push(context.me as HTMLElement);

      context.locals.set('count', 42);
      await command.execute({ type: 'variable', name: 'count' }, context);

      expect(context.locals.get('count')).toBe(null);
    });

    it('clears the value of an <input>', async () => {
      const input = createTestElement('<input value="hello"/>') as HTMLInputElement;
      testElements.push(input);
      expect(input.value).toBe('hello');

      await command.execute({ type: 'form-fields', targets: [input] }, createMockContext(input));

      expect(input.value).toBe('');
    });

    it('clears the value of a <textarea>', async () => {
      const ta = createTestElement('<textarea>hello world</textarea>') as HTMLTextAreaElement;
      testElements.push(ta);

      await command.execute({ type: 'form-fields', targets: [ta] }, createMockContext(ta));

      expect(ta.value).toBe('');
    });

    it('sets selectedIndex to -1 on a <select>', async () => {
      const select = createTestElement(
        '<select><option value="a">A</option><option value="b" selected>B</option></select>'
      ) as HTMLSelectElement;
      testElements.push(select);
      expect(select.selectedIndex).toBe(1);

      await command.execute({ type: 'form-fields', targets: [select] }, createMockContext(select));

      expect(select.selectedIndex).toBe(-1);
    });

    it('is a no-op on non-form-field elements', async () => {
      const div = createTestElement('<div>content</div>');
      testElements.push(div);

      await expect(
        command.execute({ type: 'form-fields', targets: [div] }, createMockContext(div))
      ).resolves.toBeUndefined();
      expect(div.textContent).toBe('content');
    });
  });

  describe('validate', () => {
    it('accepts variable input', () => {
      expect(command.validate({ type: 'variable', name: 'x' })).toBe(true);
    });

    it('accepts form-fields input', () => {
      const input = createTestElement('<input/>');
      testElements.push(input);
      expect(command.validate({ type: 'form-fields', targets: [input] })).toBe(true);
    });

    it('rejects unknown shape', () => {
      expect(command.validate({ type: 'bogus' })).toBe(false);
      expect(command.validate(null)).toBe(false);
      expect(command.validate({ type: 'variable' })).toBe(false);
    });
  });
});
