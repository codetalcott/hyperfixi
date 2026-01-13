/**
 * Unit Tests for HideCommand (Standalone V2)
 *
 * Tests the standalone V2 implementation with no V1 dependencies.
 * Focuses on core hide functionality without relying on V1 behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HideCommand } from '../hide';
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
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      // Simple mock - returns the node value directly
      // Real evaluator would parse AST
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('HideCommand (Standalone V2)', () => {
  let command: HideCommand;
  let testElements: HTMLElement[] = [];

  beforeEach(() => {
    command = new HideCommand();
  });

  afterEach(() => {
    // Cleanup all test elements
    testElements.forEach(el => cleanupElement(el));
    testElements = [];
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('hide');
    });

    it('should have metadata with examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('hide');
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

      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      expect(input.targets).toEqual([element]);
    });

    it('should parse single element argument', async () => {
      const element = createTestElement('<div id="test">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = inlineEvaluator(element);

      const input = await command.parseInput(
        { args: [mockNode(element)], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([element]);
    });

    it('should parse CSS selector argument', async () => {
      const element = createTestElement('<div class="target">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = inlineEvaluator('.target');

      const input = await command.parseInput(
        { args: [mockNode('.target')], modifiers: {} },
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
      const evaluator = inlineEvaluator(nodeList);

      const input = await command.parseInput(
        { args: [mockNode(nodeList)], modifiers: {} },
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
      const evaluator = inlineEvaluator([el1, el2]);

      const input = await command.parseInput(
        { args: [mockNode([el1, el2])], modifiers: {} },
        evaluator,
        context
      );

      expect(input.targets).toEqual([el1, el2]);
    });

    it('should throw error for invalid CSS selector', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = inlineEvaluator('<<<invalid>>>');

      await expect(
        command.parseInput({ args: [mockNode('<<<invalid>>>')], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('Invalid CSS selector');
    });

    it('should throw error for invalid target type', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = inlineEvaluator(12345); // number, not element

      await expect(
        command.parseInput({ args: [mockNode(12345)], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('Invalid hide target');
    });

    it.skip('should throw error if no valid targets found', async () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = inlineEvaluator([]); // empty array

      await expect(
        command.parseInput({ args: [mockNode([])], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('no valid targets found');
    });
  });

  describe('execute', () => {
    it('should hide single element by setting display:none', async () => {
      const element = createTestElement('<div style="display:block">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], mode: 'hide' }, context);

      expect(element.style.display).toBe('none');
    });

    it('should hide multiple elements', async () => {
      const el1 = createTestElement('<div>Element 1</div>');
      const el2 = createTestElement('<div>Element 2</div>');
      testElements.push(el1, el2);

      const context = createMockContext(el1);

      await command.execute({ targets: [el1, el2], mode: 'hide' }, context);

      expect(el1.style.display).toBe('none');
      expect(el2.style.display).toBe('none');
    });

    it('should preserve original display value in dataset', async () => {
      const element = createTestElement('<div style="display:flex">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], mode: 'hide' }, context);

      expect(element.dataset.originalDisplay).toBe('flex');
      expect(element.style.display).toBe('none');
    });

    it('should not overwrite existing originalDisplay value', async () => {
      const element = createTestElement('<div style="display:block">Test</div>');
      element.dataset.originalDisplay = 'inline';
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], mode: 'hide' }, context);

      expect(element.dataset.originalDisplay).toBe('inline'); // Unchanged
      expect(element.style.display).toBe('none');
    });

    it('should remove .show class', async () => {
      const element = createTestElement('<div class="show visible">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], mode: 'hide' }, context);

      expect(element.classList.contains('show')).toBe(false);
      expect(element.classList.contains('visible')).toBe(true); // Other classes preserved
      expect(element.style.display).toBe('none');
    });

    it('should store empty string for elements already hidden', async () => {
      const element = createTestElement('<div style="display:none">Test</div>');
      testElements.push(element);

      const context = createMockContext(element);

      await command.execute({ targets: [element], mode: 'hide' }, context);

      expect(element.dataset.originalDisplay).toBe('');
      expect(element.style.display).toBe('none');
    });
  });

  describe('validate', () => {
    it('should validate correct input', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      const input = { targets: [element] };

      expect(command.validate(input)).toBe(true);
    });

    it('should validate input with multiple elements', () => {
      const el1 = createTestElement('<div>Test 1</div>');
      const el2 = createTestElement('<div>Test 2</div>');
      testElements.push(el1, el2);

      const input = { targets: [el1, el2] };

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
      expect(command.validate({ other: 'property' })).toBe(false);
    });

    it('should reject input with non-array targets', () => {
      expect(command.validate({ targets: 'not-an-array' })).toBe(false);
      expect(command.validate({ targets: 123 })).toBe(false);
    });

    it('should reject input with non-HTMLElement targets', () => {
      expect(command.validate({ targets: ['string', 'array'] })).toBe(false);
      expect(command.validate({ targets: [123, 456] })).toBe(false);
    });

    it('should reject input with mixed valid/invalid targets', () => {
      const element = createTestElement('<div>Test</div>');
      testElements.push(element);

      expect(command.validate({ targets: [element, 'not-element'] })).toBe(false);
    });
  });

  describe('integration', () => {
    it('should hide element end-to-end', async () => {
      const element = createTestElement('<div style="display:block">Content</div>');
      testElements.push(element);

      const context = createMockContext(element);
      const evaluator = createMockEvaluator();

      // Parse input
      const input = await command.parseInput({ args: [], modifiers: {} }, evaluator, context);

      // Validate
      expect(command.validate(input)).toBe(true);

      // Execute
      await command.execute(input, context);

      // Verify result
      expect(element.style.display).toBe('none');
      expect(element.dataset.originalDisplay).toBe('block');
    });

    it('should handle complex selector', async () => {
      // Create multiple elements with different selectors
      const parent = createTestElement(
        '<div id="parent"><button class="btn">1</button><button class="btn">2</button></div>'
      );
      testElements.push(parent);

      const context = createMockContext(parent);
      const evaluator = inlineEvaluator('#parent .btn');

      // Parse input
      const input = await command.parseInput(
        { args: [mockNode('#parent .btn')], modifiers: {} },
        evaluator,
        context
      );

      // Execute
      await command.execute(input, context);

      // Verify all buttons are hidden
      const buttons = parent.querySelectorAll('.btn');
      buttons.forEach(btn => {
        expect((btn as HTMLElement).style.display).toBe('none');
      });
    });
  });
});
