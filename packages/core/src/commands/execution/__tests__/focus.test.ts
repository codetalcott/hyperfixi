/**
 * Unit Tests for FocusCommand
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FocusCommand } from '../focus';
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

describe('FocusCommand', () => {
  let command: FocusCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new FocusCommand();
  });

  afterEach(() => {
    testElements.forEach(cleanupElement);
    testElements = [];
  });

  describe('metadata', () => {
    it('has correct name', () => {
      expect(command.name).toBe('focus');
    });

    it('has metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('defaults to context.me when no args', async () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      testElements.push(input);

      const result = await command.parseInput(
        { args: [], modifiers: {} },
        inlineEvaluator(null),
        createMockContext(input)
      );

      expect(result.targets).toEqual([input]);
    });

    it('resolves a CSS selector arg', async () => {
      const input = createTestElement('<input class="target"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [mockNode('.target')], modifiers: {} },
        inlineEvaluator('.target'),
        createMockContext(input)
      );

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]).toBe(input);
    });

    it('resolves an element arg directly', async () => {
      const input = createTestElement('<input id="x"/>');
      testElements.push(input);

      const result = await command.parseInput(
        { args: [mockNode(input)], modifiers: {} },
        inlineEvaluator(input),
        createMockContext(input)
      );

      expect(result.targets).toEqual([input]);
    });
  });

  describe('execute', () => {
    it('focuses a single element', async () => {
      const input = createTestElement('<input type="text"/>');
      testElements.push(input);

      await command.execute({ targets: [input] }, createMockContext(input));

      expect(document.activeElement).toBe(input);
    });

    it('focuses the last element when multiple provided', async () => {
      const a = createTestElement('<input type="text" id="a"/>');
      const b = createTestElement('<input type="text" id="b"/>');
      testElements.push(a, b);

      await command.execute({ targets: [a, b] }, createMockContext(a));

      expect(document.activeElement).toBe(b);
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
      expect(command.validate('string')).toBe(false);
      expect(command.validate({})).toBe(false);
    });

    it('rejects non-HTMLElement targets', () => {
      expect(command.validate({ targets: ['not-an-element'] })).toBe(false);
    });
  });
});
