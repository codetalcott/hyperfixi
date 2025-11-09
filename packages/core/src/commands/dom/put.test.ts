/**
 * Tests for put command
 * Enhanced command pattern with full type safety
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PutCommand } from './put';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import type { TypedExecutionContext } from '../../types/command-types';

describe('Put Command', () => {
  let command: PutCommand;
  let context: TypedExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new PutCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as TypedExecutionContext;
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('put');
      expect(command.syntax).toBe(
        'put <content> (into | before | after | at start of | at end of) <target>'
      );
      expect(command.description).toBe(
        'Inserts content into DOM elements or properties with validation'
      );
    });
  });

  describe('Core Functionality', () => {
    it('should put text content into element', async () => {
      // Test: put 'Hello World' into me
      const result = await command.execute(context, 'Hello World', 'into', testElement);

      expect(result.success).toBe(true);
      expect(result.type).toBe('element');
      expect(result.value).toBe(testElement);
      expect(testElement.innerHTML).toBe('Hello World');
    });

    it('should put HTML content into element', async () => {
      // Test: put '<em>Clicked!</em>' into me
      const result = await command.execute(context, '<em>Clicked!</em>', 'into', testElement);

      expect(result.success).toBe(true);
      expect(result.value).toBe(testElement);
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
      expect(testElement.querySelector('em')).toBeTruthy();
      expect(testElement.querySelector('em')?.textContent).toBe('Clicked!');
    });

    it('should handle CSS selector targets', async () => {
      const targetElement = createTestElement('<div id="target">Target</div>');
      document.body.appendChild(targetElement);

      const result = await command.execute(context, 'New Content', 'into', '#target');

      expect(result.success).toBe(true);
      expect(targetElement.innerHTML).toBe('New Content');
      document.body.removeChild(targetElement);
    });

    it('should put content before element', async () => {
      const parent = createTestElement('<div><span id="target">Target</span></div>');
      const target = parent.querySelector('#target')!;

      const result = await command.execute(context, 'Before ', 'before', target);

      expect(result.success).toBe(true);
      expect(parent.innerHTML).toBe('Before <span id="target">Target</span>');
    });

    it('should put content after element', async () => {
      const parent = createTestElement('<div><span id="target">Target</span></div>');
      const target = parent.querySelector('#target')!;

      const result = await command.execute(context, ' After', 'after', target);

      expect(result.success).toBe(true);
      expect(parent.innerHTML).toBe('<span id="target">Target</span> After');
    });

    it('should put content at start of element', async () => {
      testElement.innerHTML = 'Original';

      const result = await command.execute(context, 'Start ', 'at start of', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('Start Original');
    });

    it('should put content at end of element', async () => {
      testElement.innerHTML = 'Original';

      const result = await command.execute(context, ' End', 'at end of', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('Original End');
    });
  });

  describe('Validation', () => {
    it('should validate correct arguments', () => {
      const result1 = command.validate(['content', 'into', testElement]);
      expect(result1.isValid).toBe(true);
      expect(result1.errors).toEqual([]);

      const result2 = command.validate(['content', 'before', testElement]);
      expect(result2.isValid).toBe(true);
      expect(result2.errors).toEqual([]);
    });

    it('should reject invalid prepositions', () => {
      const result = command.validate(['content', 'invalid', testElement]);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Invalid argument');
      expect(result.errors[0].message).toContain('Expected one of');
      // Schema validation returns these suggestions
      expect(result.suggestions).toContain('Use valid position keywords');
    });

    it('should require minimum arguments', () => {
      const result = command.validate(['content']);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target gracefully', async () => {
      const result = await command.execute(context, 'content', 'into', '#nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Target element not found');
      expect(result.error?.suggestions).toBeDefined();
    });

    it('should handle null content', async () => {
      const result = await command.execute(context, null, 'into', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('');
    });

    it('should handle undefined content', async () => {
      const result = await command.execute(context, undefined, 'into', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: put HTML with em tag', async () => {
      // From LSP: <div _="on click put '<em>Clicked!</em>' into me">Click Me!</div>
      const result = await command.execute(context, '<em>Clicked!</em>', 'into', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
      expect(testElement.querySelector('em')).toBeTruthy();
    });

    it('should handle LSP example 2: put into innerHTML property', async () => {
      // From LSP: <div _="on click put '<em>Clicked!</em>' into my.innerHTML">Click Me!</div>
      // This would be handled by property resolution in the expression system
      const result = await command.execute(context, '<em>Clicked!</em>', 'into', testElement);

      expect(result.success).toBe(true);
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
    });
  });
});
