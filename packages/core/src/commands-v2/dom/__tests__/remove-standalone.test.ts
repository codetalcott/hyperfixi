/**
 * Unit Tests for RemoveCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on CSS class removal without relying on V1 behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemoveCommand } from '../remove-standalone';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/ast';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  meElement.className = 'initial-class active selected';

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

describe('RemoveCommand (Standalone V2)', () => {
  let command: RemoveCommand;

  beforeEach(() => {
    command = new RemoveCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('remove');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('class');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have DOM category and side effects', () => {
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
      ).rejects.toThrow('remove command requires class names');
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

      expect(input.classes).toEqual(['active']);
      expect(input.targets).toEqual([context.me]); // Default target
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
      ).rejects.toThrow('remove command: no valid class names found');
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

    it('should throw error when no valid targets found', async () => {
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
      ).rejects.toThrow('remove command: no valid targets found');
    });
  });

  describe('execute', () => {
    it('should remove single class from single element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.className = 'active selected';

      await command.execute(
        { classes: ['active'], targets: [element] },
        context
      );

      expect(element.classList.contains('active')).toBe(false);
      expect(element.classList.contains('selected')).toBe(true); // Preserved
    });

    it('should remove multiple classes from single element', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.className = 'active selected highlighted';

      await command.execute(
        { classes: ['active', 'selected', 'highlighted'], targets: [element] },
        context
      );

      expect(element.classList.contains('active')).toBe(false);
      expect(element.classList.contains('selected')).toBe(false);
      expect(element.classList.contains('highlighted')).toBe(false);
    });

    it('should remove single class from multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const el3 = document.createElement('div');
      el1.className = 'active';
      el2.className = 'active';
      el3.className = 'active';

      await command.execute(
        { classes: ['active'], targets: [el1, el2, el3] },
        context
      );

      expect(el1.classList.contains('active')).toBe(false);
      expect(el2.classList.contains('active')).toBe(false);
      expect(el3.classList.contains('active')).toBe(false);
    });

    it('should remove multiple classes from multiple elements', async () => {
      const context = createMockContext();
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.className = 'active selected';
      el2.className = 'active selected';

      await command.execute(
        { classes: ['active', 'selected'], targets: [el1, el2] },
        context
      );

      expect(el1.classList.contains('active')).toBe(false);
      expect(el1.classList.contains('selected')).toBe(false);
      expect(el2.classList.contains('active')).toBe(false);
      expect(el2.classList.contains('selected')).toBe(false);
    });

    it('should safely handle removing non-existent class', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.className = 'existing';

      // Should not throw error
      await command.execute(
        { classes: ['nonexistent'], targets: [element] },
        context
      );

      // Existing class should remain
      expect(element.classList.contains('existing')).toBe(true);
    });

    it('should preserve other classes when removing specific class', async () => {
      const context = createMockContext();
      const element = document.createElement('div');
      element.className = 'keep-1 remove-me keep-2';

      await command.execute(
        { classes: ['remove-me'], targets: [element] },
        context
      );

      expect(element.classList.contains('keep-1')).toBe(true);
      expect(element.classList.contains('keep-2')).toBe(true);
      expect(element.classList.contains('remove-me')).toBe(false);
    });

    it('should handle elements with no classes', async () => {
      const context = createMockContext();
      const element = document.createElement('div');

      // Should not throw error
      await command.execute(
        { classes: ['active'], targets: [element] },
        context
      );

      expect(element.className).toBe('');
    });
  });

  describe('validate', () => {
    it('should validate correct input with single class and target', () => {
      const element = document.createElement('div');
      const input = { classes: ['active'], targets: [element] };
      expect(command.validate(input)).toBe(true);
    });

    it('should validate correct input with multiple classes and targets', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      const input = { classes: ['active', 'selected'], targets: [el1, el2] };
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
      expect(command.validate({ classes: ['active'] })).toBe(false);
    });

    it('should reject input with non-array classes', () => {
      const element = document.createElement('div');
      expect(command.validate({ classes: 'active', targets: [element] })).toBe(false);
    });

    it('should reject input with non-array targets', () => {
      const element = document.createElement('div');
      expect(command.validate({ classes: ['active'], targets: element })).toBe(false);
    });

    it('should reject input with empty classes array', () => {
      const element = document.createElement('div');
      expect(command.validate({ classes: [], targets: [element] })).toBe(false);
    });

    it('should reject input with empty targets array', () => {
      expect(command.validate({ classes: ['active'], targets: [] })).toBe(false);
    });

    it('should reject input with non-string class names', () => {
      const element = document.createElement('div');
      expect(command.validate({ classes: [123], targets: [element] })).toBe(false);
    });

    it('should reject input with empty string class names', () => {
      const element = document.createElement('div');
      expect(command.validate({ classes: [''], targets: [element] })).toBe(false);
    });

    it('should reject input with non-HTMLElement targets', () => {
      expect(command.validate({ classes: ['active'], targets: [document.createTextNode('text')] })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should remove class end-to-end', async () => {
      const context = createMockContext();
      context.me.className = 'active selected';
      const evaluator = createMockEvaluator();

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
      expect(context.me.classList.contains('active')).toBe(false);
      expect(context.me.classList.contains('selected')).toBe(true); // Preserved
    });

    it('should remove multiple classes end-to-end', async () => {
      const context = createMockContext();
      context.me.className = 'active selected highlighted';
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

      // Verify all removed
      expect(context.me.classList.contains('active')).toBe(false);
      expect(context.me.classList.contains('selected')).toBe(false);
      expect(context.me.classList.contains('highlighted')).toBe(false);
    });

    it('should remove from specific target end-to-end', async () => {
      const context = createMockContext();
      const targetElement = document.createElement('button');
      targetElement.id = 'test-button';
      targetElement.className = 'active loading';
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
      expect(targetElement.classList.contains('active')).toBe(false);
      expect(targetElement.classList.contains('loading')).toBe(true); // Preserved

      // Cleanup
      document.body.removeChild(targetElement);
    });

    it('should preserve unrelated classes end-to-end', async () => {
      const context = createMockContext();
      context.me.className = 'keep-1 remove-me keep-2';
      const evaluator = {
        evaluate: async () => '.remove-me',
      };

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: '.remove-me' } as any], modifiers: {} },
        evaluator as any,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify preserved classes
      expect(context.me.classList.contains('keep-1')).toBe(true);
      expect(context.me.classList.contains('keep-2')).toBe(true);
      expect(context.me.classList.contains('remove-me')).toBe(false);
    });
  });
});
