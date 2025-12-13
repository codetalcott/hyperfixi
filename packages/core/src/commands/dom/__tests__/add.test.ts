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
  } as any;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      return node;
    },
  };
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

    it.skip('should have DOM category and side effects', () => {
      expect(command.metadata.category).toBe('DOM');
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });
  });

  describe('parseInput', () => {
    it('should throw error when no arguments provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator as any, context)
      ).rejects.toThrow('add command requires an argument');
    });

    it('should parse single class with leading dot', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '.active',
      };

      const input = await command.parseInput(
        { args: [{ value: '.active' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.type).toBe('classes');
      expect((input as any).classes).toEqual(['active']);
      expect((input as any).targets).toEqual([context.me]); // Default target
    });

    it('should parse single class without leading dot', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => 'selected',
      };

      const input = await command.parseInput(
        { args: [{ value: 'selected' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.classes).toEqual(['selected']);
      expect(input.targets).toEqual([context.me]);
    });

    it('should parse multiple classes from space-separated string', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => 'active selected highlighted',
      };

      const input = await command.parseInput(
        { args: [{ value: 'active selected highlighted' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should parse multiple classes with leading dots', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '.active .selected .highlighted',
      };

      const input = await command.parseInput(
        { args: [{ value: '.active .selected .highlighted' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should parse classes from array', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => ['.active', 'selected', '.highlighted'],
      };

      const input = await command.parseInput(
        { args: [{ value: ['.active', 'selected', '.highlighted'] } as any], modifiers: {} },
        evaluator as any,
        context
      );

      expect(input.classes).toEqual(['active', 'selected', 'highlighted']);
    });

    it('should filter out invalid class names', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => 'valid-class 123invalid -also-valid _underscore',
      };

      const input = await command.parseInput(
        { args: [{ value: 'valid-class 123invalid -also-valid _underscore' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      // 123invalid starts with digit (invalid), others are valid
      expect(input.classes).toEqual(['valid-class', '-also-valid', '_underscore']);
    });

    it('should throw error when no valid class names found', async () => {
      const context = createMockContext();
      const evaluator = {
        evaluate: async () => '123 456 789', // All start with digits
      };

      await expect(
        command.parseInput(
          { args: [{ value: '123 456 789' } as any], modifiers: {} },
          evaluator as any,
          context
        )
      ).rejects.toThrow('add command: no valid class names found');
    });

    it('should resolve HTMLElement target', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('button');
      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return 'active';
          }
          return targetElement;
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'active' } as any, { value: targetElement } as any],
          modifiers: {},
        },
        evaluator as any,
        context
      );

      expect(input.targets).toEqual([targetElement]);
    });

    it('should resolve CSS selector target', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('div');
      targetElement.id = 'test-target';
      document.body.appendChild(targetElement);

      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return 'active';
          }
          return '#test-target';
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'active' } as any, { value: '#test-target' } as any],
          modifiers: {},
        },
        evaluator as any,
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

      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return 'active';
          }
          return document.querySelectorAll('.test-class');
        },
      };

      const input = await command.parseInput(
        {
          args: [{ value: 'active' } as any, { value: '.test-class' } as any],
          modifiers: {},
        },
        evaluator as any,
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
      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return 'active';
          }
          return ':::invalid:::';
        },
      };

      await expect(
        command.parseInput(
          {
            args: [{ value: 'active' } as any, { value: ':::invalid:::' } as any],
            modifiers: {},
          },
          evaluator as any,
          context
        )
      ).rejects.toThrow('Invalid CSS selector');
    });

    it.skip('should throw error when no valid targets found', async () => {
      const context = createMockContext();
      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return 'active';
          }
          return '.nonexistent-element';
        },
      };

      await expect(
        command.parseInput(
          {
            args: [{ value: 'active' } as any, { value: '.nonexistent-element' } as any],
            modifiers: {},
          },
          evaluator as any,
          context
        )
      ).rejects.toThrow('add command: no valid targets found');
    });
  });

  describe('execute', () => {
    it('should add single class to single element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      await command.execute(
        { type: 'classes', classes: ['active'], targets: [element] },
        context
      );

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
      expect(command.validate({ type: 'classes', classes: 'active', targets: [element] })).toBe(false);
    });

    it('should reject input with non-array targets', () => {
      const element = document.createElement('div');
      expect(command.validate({ type: 'classes', classes: ['active'], targets: element })).toBe(false);
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
      expect(command.validate({ type: 'classes', classes: ['active'], targets: [document.createTextNode('text')] })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should add class end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const element = document.createElement('div');

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: '.active' } as any], modifiers: {} },
        evaluator as any,
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
      const evaluator = {
        evaluate: async () => 'active selected highlighted',
      };

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: 'active selected highlighted' } as any], modifiers: {} },
        evaluator as any,
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

      let evalCount = 0;
      const evaluator = {
        evaluate: async () => {
          if (evalCount === 0) {
            evalCount++;
            return '.active';
          }
          return '#test-button';
        },
      };

      // Parse input
      const input = await command.parseInput(
        {
          args: [{ value: '.active' } as any, { value: '#test-button' } as any],
          modifiers: {},
        },
        evaluator as any,
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
      const evaluator = {
        evaluate: async () => '.new-class',
      };

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: '.new-class' } as any], modifiers: {} },
        evaluator as any,
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
});
