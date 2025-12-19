/**
 * Unit Tests for ShowCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on core show functionality without relying on V1 behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShowCommand } from '../show';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

function createTestElement(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;

  if (!element) {
    throw new Error(`Failed to create element from HTML: ${html}`);
  }

  // Add to document for realistic testing
  document.body.appendChild(element);
  return element;
}

function cleanupElement(element: HTMLElement): void {
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

function createMockContext(me: HTMLElement): ExecutionContext & TypedExecutionContext {
  return {
    me,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    target: me,
    detail: undefined,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator() {
  return {
    evaluate: async (node: ASTNode, context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      // Real evaluator would parse AST
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as { value: unknown }).value;
      }
      return node;
    },
  };
}

// ========== Tests ==========

describe('ShowCommand (Standalone V2)', () => {
  let command: ShowCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new ShowCommand();
  });

  afterEach(() => {
    // Cleanup all test elements
    testElements.forEach(el => cleanupElement(el));
    testElements = [];
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('show');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('show');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });
  });

  describe('parseInput', () => {
    it('should parse no arguments (defaults to context.me)', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = createMockEvaluator();

      const input = await command.parseInput(
        { args: [], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([element]);
      expect(input.defaultDisplay).toBe('block');
    });

    it('should parse single element argument', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = {
        evaluate: async () => element,
      };

      const input = await command.parseInput(
        { args: [{ value: element }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([element]);
      expect(input.defaultDisplay).toBe('block');
    });

    it('should parse CSS selector argument', async () => {
      const element = createTestElement('<div class="target">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = {
        evaluate: async () => '.target',
      };

      const input = await command.parseInput(
        { args: [{ value: '.target' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(1);
      expect(input.targets[0].className).toBe('target');
    });

    it('should parse NodeList argument', async () => {
      const el1 = createTestElement('<div class="item">Item 1</div>');
      const el2 = createTestElement('<div class="item">Item 2</div>');
      testElements.push(el1, el2);

      const context = createMockContext(el1);
      const nodeList = document.querySelectorAll('.item');
      const evaluator = {
        evaluate: async () => nodeList,
      };

      const input = await command.parseInput(
        { args: [{ value: nodeList }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toHaveLength(2);
    });

    it('should parse array of elements', async () => {
      const el1 = createTestElement('<div>Element 1</div>');
      const el2 = createTestElement('<div>Element 2</div>');
      testElements.push(el1, el2);

      const context = createMockContext(el1);
      const evaluator = {
        evaluate: async () => [el1, el2],
      };

      const input = await command.parseInput(
        { args: [{ value: [el1, el2] }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([el1, el2]);
    });

    it('should throw error for invalid CSS selector', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = {
        evaluate: async () => '<<<invalid>>>',
      };

      await expect(
        command.parseInput(
          { args: [{ value: '<<<invalid>>>' }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('Invalid CSS selector');
    });

    it('should throw error for invalid target type', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = {
        evaluate: async () => 12345, // number, not element
      };

      await expect(
        command.parseInput(
          { args: [{ value: 12345 }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('Invalid show target');
    });

    it.skip('should throw error if no valid targets found', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = {
        evaluate: async () => [], // empty array
      };

      await expect(
        command.parseInput(
          { args: [{ value: [] }], modifiers: {} },
          evaluator,
          context
        )
      ).rejects.toThrow('no valid targets found');
    });
  });

  describe('execute', () => {
    it('should show single element by restoring display', async () => {
      const element = createTestElement('<div style="display:none">Test</div>');
      element.dataset.originalDisplay = 'block';
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      expect(element.style.display).toBe('block');
      expect(element.dataset.originalDisplay).toBeUndefined();
    });

    it('should show multiple elements', async () => {
      const el1 = createTestElement('<div style="display:none">Element 1</div>');
      const el2 = createTestElement('<div style="display:none">Element 2</div>');
      el1.dataset.originalDisplay = 'flex';
      el2.dataset.originalDisplay = 'inline';
      testElements.push(el1, el2);

      const context = createMockContext(el1);

      await command.execute({ targets: [el1, el2], defaultDisplay: 'block' }, context);

      expect(el1.style.display).toBe('flex');
      expect(el2.style.display).toBe('inline');
    });

    it('should use defaultDisplay when originalDisplay is empty string', async () => {
      const element = createTestElement('<div style="display:none">Test</div>');
      element.dataset.originalDisplay = ''; // Empty string means no display value
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      expect(element.style.display).toBe('block');
      expect(element.dataset.originalDisplay).toBeUndefined();
    });

    it('should only change display if currently none when no originalDisplay', async () => {
      const element = createTestElement('<div style="display:flex">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      // Should NOT change display since it's not 'none'
      expect(element.style.display).toBe('flex');
    });

    it('should change display if currently none when no originalDisplay', async () => {
      const element = createTestElement('<div style="display:none">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      // Should change display since it IS 'none'
      expect(element.style.display).toBe('block');
    });

    it('should add .show class', async () => {
      const element = createTestElement('<div class="hidden">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      expect(element.classList.contains('show')).toBe(true);
      expect(element.classList.contains('hidden')).toBe(true); // Other classes preserved
    });

    it('should clean up originalDisplay after restoration', async () => {
      const element = createTestElement('<div style="display:none">Test</div>');
      element.dataset.originalDisplay = 'inline-block';
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], defaultDisplay: 'block' }, context);

      expect(element.style.display).toBe('inline-block');
      expect(element.dataset.originalDisplay).toBeUndefined();
    });
  });

  describe('validate', () => {
    it('should validate correct input', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const input = { targets: [element], defaultDisplay: 'block' };

      expect(command.validate(input)).toBe(true);
    });

    it('should validate input with multiple elements', () => {
      const el1 = createTestElement('<div>Test 1</div>');
      const el2 = createTestElement('<div>Test 2</div>');
      testElements.push(el1, el2);

      const input = { targets: [el1, el2], defaultDisplay: 'block' };

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

    it('should reject input without targets', () => {
      expect(command.validate({})).toBe(false);
      expect(command.validate({ defaultDisplay: 'block' })).toBe(false);
    });

    it('should reject input with non-array targets', () => {
      expect(command.validate({ targets: 'not-an-array', defaultDisplay: 'block' })).toBe(false);
      expect(command.validate({ targets: 123, defaultDisplay: 'block' })).toBe(false);
    });

    it('should reject input with non-HTMLElement targets', () => {
      expect(command.validate({ targets: ['string', 'array'], defaultDisplay: 'block' })).toBe(false);
      expect(command.validate({ targets: [123, 456], defaultDisplay: 'block' })).toBe(false);
    });

    it('should reject input with mixed valid/invalid targets', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      expect(command.validate({ targets: [element, 'not-element'], defaultDisplay: 'block' })).toBe(false);
    });

    it('should reject input without defaultDisplay', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      expect(command.validate({ targets: [element] })).toBe(false);
    });

    it('should reject input with non-string defaultDisplay', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      expect(command.validate({ targets: [element], defaultDisplay: 123 })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should show element end-to-end', async () => {
      const element = createTestElement('<div style="display:none">Content</div>');
      element.dataset.originalDisplay = 'block';
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput(
        { args: [], modifiers: {} },
        evaluator,
        context
      );

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      await command.execute(input, context);

      // Verify result
      expect(element.style.display).toBe('block');
      expect(element.dataset.originalDisplay).toBeUndefined();
      expect(element.classList.contains('show')).toBe(true);
    });

    it('should handle complex selector', async () => {
      // Create multiple elements with different selectors
      const parent = createTestElement('<div id="parent"><button class="btn" style="display:none">1</button><button class="btn" style="display:none">2</button></div>');
      const buttons = parent.querySelectorAll('.btn');
      buttons.forEach(btn => {
        (btn as HTMLElement).dataset.originalDisplay = 'inline-block';
      });
      testElements.push(parent);

      const context = createMockContext(parent);
      const evaluator = {
        evaluate: async () => '#parent .btn',
      };

      // Parse input
      const input = await command.parseInput(
        { args: [{ value: '#parent .btn' }], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify all buttons are shown
      buttons.forEach(btn => {
        expect((btn as HTMLElement).style.display).toBe('inline-block');
        expect((btn as HTMLElement).classList.contains('show')).toBe(true);
      });
    });

    it('should work with hide command (round-trip)', async () => {
      const element = createTestElement('<div style="display:flex">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = createMockEvaluator();

      // Initial state
      expect(element.style.display).toBe('flex');

      // Simulate hide command
      element.dataset.originalDisplay = element.style.display || '';
      element.style.display = 'none';

      // Now show should restore original
      const input = await command.parseInput(
        { args: [], modifiers: {} },
        evaluator,
        context
      );

      await command.execute(input, context);

      // Verify original display restored
      expect(element.style.display).toBe('flex');
      expect(element.dataset.originalDisplay).toBeUndefined();
    });
  });
});
