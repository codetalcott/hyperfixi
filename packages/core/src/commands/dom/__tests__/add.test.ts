/**
 * Unit Tests for AddCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on CSS class addition without relying on V1 behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AddCommand } from '../add';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// Helper to create mock AST nodes with required type property
function mockNode<T>(value: T): ASTNode {
  return { type: 'literal', value } as ASTNode;
}

// Helper to create inline mock evaluator
function inlineEvaluator<T>(returnValue: T): ExpressionEvaluator {
  return {
    evaluate: async () => returnValue,
  } as unknown as ExpressionEvaluator;
}

// Helper to create sequential mock evaluator that returns different values on each call
function sequentialEvaluator<T>(values: T[]): ExpressionEvaluator {
  let callCount = 0;
  return {
    evaluate: async () => values[callCount++],
  } as unknown as ExpressionEvaluator;
}

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.className = 'initial-class';

  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: meElement,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

// ========== Tests ==========

describe('AddCommand (Standalone V2)', () => {
  let command: AddCommand;

  beforeEach(() => {
    command = new AddCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('add');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('class');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have DOM category and side effects', () => {
      expect(command.metadata.category).toBe('dom');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });
  });

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('add command requires an argument');
    });

    it('should parse single class with leading dot', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('.active');

      const input = await command.parseInput(
        { args: [mockNode('.active')], modifiers: {} },
        evaluator,
        context
      );

      expect(input.type).toBe('classes');
      expect((input as { classes: string[] }).classes).toEqual(['active']);
      expect((input as { targets: HTMLElement[] }).targets).toEqual([context.me]); // Default target
    });

    it('should parse single class without leading dot', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('selected');

      const input = await command.parseInput(
        { args: [mockNode('selected')], modifiers: {} },
        evaluator,
        context
      );

      expect((input as any).classes).toEqual(['selected']);
      expect((input as any).targets).toEqual([context.me]);
    });

    it('should parse multiple classes from space-separated string', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('active selected highlighted');

      const input = await command.parseInput(
        { args: [mockNode('active selected highlighted')], modifiers: {} },
        evaluator,
        context
      );

      expect((input as any).classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should parse multiple classes with leading dots', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('.active .selected .highlighted');

      const input = await command.parseInput(
        { args: [mockNode('.active .selected .highlighted')], modifiers: {} },
        evaluator,
        context
      );

      expect((input as any).classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should parse classes from array', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator(['.active', 'selected', '.highlighted']);

      const input = await command.parseInput(
        { args: [mockNode(['.active', 'selected', '.highlighted'])], modifiers: {} },
        evaluator,
        context
      );

      expect((input as any).classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should filter out invalid class names', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('valid-class 123invalid -also-valid _underscore');

      const input = await command.parseInput(
        { args: [mockNode('valid-class 123invalid -also-valid _underscore')], modifiers: {} },
        evaluator,
        context
      );

      // 123invalid starts with digit (invalid), others are valid
      expect((input as any).classes).toEqual(['valid-class', '-also-valid', '_underscore']);
    });

    it('should throw error when no valid class names found', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('123 456 789'); // All start with digits

      await expect(
        command.parseInput({ args: [mockNode('123 456 789')], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('add command: no valid class names found');
    });

    it('should resolve HTMLElement target', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('button');
      const evaluator = sequentialEvaluator(['active', targetElement]);

      const input = await command.parseInput(
        {
          args: [mockNode('active'), mockNode(targetElement)],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.targets).toEqual([targetElement]);
    });

    it('should resolve CSS selector target', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('div');
      targetElement.id = 'test-target';
      document.body.appendChild(targetElement);

      const evaluator = sequentialEvaluator(['active', '#test-target']);

      const input = await command.parseInput(
        {
          args: [mockNode('active'), mockNode('#test-target')],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.targets).toEqual([targetElement]);

      // Cleanup
      document.body.removeChild(targetElement);
    });

    it('should resolve NodeList targets', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.className = 'test-class';
      el2.className = 'test-class';
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const nodeList = document.querySelectorAll('.test-class');
      const evaluator = sequentialEvaluator(['active', nodeList]);

      const input = await command.parseInput(
        {
          args: [mockNode('active'), mockNode('.test-class')],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.targets).toContain(el1);
      expect(input.targets).toContain(el2);

      // Cleanup
      document.body.removeChild(el1);
      document.body.removeChild(el2);
    });

    it('should throw error for invalid CSS selector', async () => {
      const context = createMockContext();
      const evaluator = sequentialEvaluator(['active', ':::invalid:::']);

      await expect(
        command.parseInput(
          {
            args: [mockNode('active'), mockNode(':::invalid:::')],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow('Invalid CSS selector');
    });

    it.skip('should throw error when no valid targets found', async () => {
      const context = createMockContext();
      const evaluator = sequentialEvaluator(['active', '.nonexistent-element']);

      await expect(
        command.parseInput(
          {
            args: [mockNode('active'), mockNode('.nonexistent-element')],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow('add command: no valid targets found');
    });
  });

  describe('execute', () => {
    it('should add single class to single element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute({ type: 'classes', classes: ['active'], targets: [element] }, context);

      expect(element!.classList.contains('active')).toBe(true);
    });

    it('should add multiple classes to single element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        { type: 'classes', classes: ['active', 'selected', 'highlighted'], targets: [element] },
        context
      );

      expect(element!.classList.contains('active')).toBe(true);
      expect(element!.classList.contains('selected')).toBe(true);
      expect(element!.classList.contains('highlighted')).toBe(true);
    });

    it('should add single class to multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');

      await command.execute(
        { type: 'classes', classes: ['active'], targets: [el1, el2, el3] },
        context
      );

      expect(el1.classList.contains('active')).toBe(true);
      expect(el2.classList.contains('active')).toBe(true);
      expect(el3.classList.contains('active')).toBe(true);
    });

    it('should add multiple classes to multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');

      await command.execute(
        { type: 'classes', classes: ['active', 'selected'], targets: [el1, el2] },
        context
      );

      expect(el1.classList.contains('active')).toBe(true);
      expect(el1.classList.contains('selected')).toBe(true);
      expect(el2.classList.contains('active')).toBe(true);
      expect(el2.classList.contains('selected')).toBe(true);
    });

    it('should not add class if already present', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element!.classList.add('existing');

      const addSpy = vi.spyOn(element!.classList, 'add');

      await command.execute(
        { type: 'classes', classes: ['existing'], targets: [element] },
        context
      );

      // Should check but not add since already present
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('should preserve existing classes', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element!.className = 'existing-1 existing-2';

      await command.execute(
        { type: 'classes', classes: ['new-class'], targets: [element] },
        context
      );

      expect(element!.classList.contains('existing-1')).toBe(true);
      expect(element!.classList.contains('existing-2')).toBe(true);
      expect(element!.classList.contains('new-class')).toBe(true);
    });

    it('should handle elements with no existing classes', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        { type: 'classes', classes: ['first-class'], targets: [element] },
        context
      );

      expect(element!.className).toBe('first-class');
    });
  });

  describe('validate', () => {
    it('should validate correct input with single class and target', () => {
      const element = document.createElement('div');
      const input = { type: 'classes', classes: ['active'], targets: [element] };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct input with multiple classes and targets', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const input = { type: 'classes', classes: ['active', 'selected'], targets: [el1, el2] };
      expect(command.validate(input)).toBe(true);
    });

    it('should reject null input', () => {
      expect(command.validate(null)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(command.validate('not an object')).toBe(false);
      expect(command.validate(123)).toBe(false);
      expect(command.validate(true)).toBe(false);
    });

    it('should reject input without classes', () => {
      const element = document.createElement('div');
      expect(command.validate({ targets: [element] })).toBe(false);
    });

    it('should reject input without targets', () => {
      expect(command.validate({ type: 'classes', classes: ['active'] })).toBe(false);
    });

    it('should reject input with non-array classes', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: 'active', targets: [element] })).toBe(
        false
      );
    });

    it('should reject input with non-array targets', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: ['active'], targets: element })).toBe(
        false
      );
    });

    it('should reject input with empty classes array', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: [], targets: [element] })).toBe(false);
    });

    it('should reject input with empty targets array', () => {
      expect(command.validate({ type: 'classes', classes: ['active'], targets: [] })).toBe(false);
    });

    it('should reject input with non-string class names', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: [123], targets: [element] })).toBe(false);
    });

    it('should reject input with empty string class names', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: [''], targets: [element] })).toBe(false);
    });

    it('should reject input with non-HTMLElement targets', () => {
      expect(
        command.validate({
          type: 'classes',
          classes: ['active'],
          targets: [document.createTextNode('text')],
        })
      ).toBe(false);
    });
  });

  describe('integration', () => {
    it('should add class end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        { args: [mockNode('.active')], modifiers: {} },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      await command.execute(input, context);

      // Verify
      expect(context.me!.classList.contains('active')).toBe(true);
    });

    it('should add multiple classes end-to-end', async () => {
      const context = createMockContext();
      const evaluator = inlineEvaluator('active selected highlighted');

      // Parse input
      const input = await command.parseInput(
        { args: [mockNode('active selected highlighted')], modifiers: {} },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      await command.execute(input, context);

      // Verify
      expect(context.me!.classList.contains('active')).toBe(true);
      expect(context.me!.classList.contains('selected')).toBe(true);
      expect(context.me!.classList.contains('highlighted')).toBe(true);
    });

    it('should add to specific target end-to-end', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('button');
      targetElement.id = 'test-button';
      document.body.appendChild(targetElement);

      const evaluator = sequentialEvaluator(['.active', '#test-button']);

      // Parse input
      const input = await command.parseInput(
        {
          args: [mockNode('.active'), mockNode('#test-button')],
          modifiers: {},
        },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      await command.execute(input, context);

      // Verify
      expect(targetElement.classList.contains('active')).toBe(true);

      // Cleanup
      document.body.removeChild(targetElement);
    });

    it('should preserve existing classes end-to-end', async () => {
      const context = createMockContext();
      context.me!.className = 'existing-1 existing-2';
      const evaluator = inlineEvaluator('.new-class');

      // Parse input
      const input = await command.parseInput(
        { args: [mockNode('.new-class')], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify all classes present
      expect(context.me!.classList.contains('existing-1')).toBe(true);
      expect(context.me!.classList.contains('existing-2')).toBe(true);
      expect(context.me!.classList.contains('new-class')).toBe(true);
    });
  });

  describe('dynamic classes', () => {
    it('should resolve dynamic class from context locals', async () => {
      // Setup: Element with no classes
      const element = document.createElement('div');
      const context = {
        me: element,
        locals: new Map<string, unknown>([['myClass', 'dynamic-active']]),
        globals: new Map<string, unknown>(),
      } as unknown as ExecutionContext & TypedExecutionContext;
      const evaluator = createMockEvaluator();

      // Parse input with dynamic class syntax
      const input = await command.parseInput(
        { args: [mockNode('.{myClass}')], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify dynamic class was resolved and added
      expect(element.classList.contains('dynamic-active')).toBe(true);
    });

    it('should resolve dynamic class from context globals', async () => {
      // Setup: Element with no classes
      const element = document.createElement('div');
      const context = {
        me: element,
        locals: new Map<string, unknown>(),
        globals: new Map<string, unknown>([['globalClass', 'global-style']]),
      } as unknown as ExecutionContext & TypedExecutionContext;
      const evaluator = createMockEvaluator();

      // Parse input with dynamic class syntax
      const input = await command.parseInput(
        { args: [mockNode('.{globalClass}')], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify dynamic class was resolved and added
      expect(element.classList.contains('global-style')).toBe(true);
    });

    it('should not add class when dynamic variable is not found', async () => {
      // Setup: Element with existing class
      const element = document.createElement('div');
      element.classList.add('existing');
      const context = {
        me: element,
        locals: new Map<string, unknown>(),
        globals: new Map<string, unknown>(),
      } as unknown as ExecutionContext & TypedExecutionContext;
      const evaluator = createMockEvaluator();

      // Parse input with dynamic class syntax (variable not set)
      const input = await command.parseInput(
        { args: [mockNode('.{undefinedClass}')], modifiers: {} },
        evaluator,
        context
      );

      // Execute (should warn but not crash)
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await command.execute(input, context);
      consoleSpy.mockRestore();

      // Verify only existing class remains
      expect(element.classList.length).toBe(1);
      expect(element.classList.contains('existing')).toBe(true);
    });
  });
});
