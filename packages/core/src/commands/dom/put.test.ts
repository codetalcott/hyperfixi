/**
 * Tests for put command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PutCommand } from './put';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Put Command', () => {
  let command: PutCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new PutCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('put');
      expect(command.syntax).toBe('put <expression> (into | before | at [the] start of | at [the] end of | after)  <expression>`');
      expect(command.description).toBe('The put command allows you to insert content into a variable, property or the DOM.');
    });
  });

  describe('Core Functionality', () => {
    it('should put text content into element', async () => {
      // Test: put 'Hello World' into me
      const result = await command.execute(context, 'Hello World', 'into', testElement);
      
      expect(testElement.innerHTML).toBe('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should put HTML content into element', async () => {
      // Test: put '<em>Clicked!</em>' into me
      const result = await command.execute(context, '<em>Clicked!</em>', 'into', testElement);
      
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
      expect(testElement.querySelector('em')).toBeTruthy();
      expect(testElement.querySelector('em')?.textContent).toBe('Clicked!');
    });

    it('should handle CSS selector targets', async () => {
      const targetElement = createTestElement('<div id="target">Target</div>');
      document.body.appendChild(targetElement);
      
      await command.execute(context, 'New Content', 'into', '#target');
      
      expect(targetElement.innerHTML).toBe('New Content');
      document.body.removeChild(targetElement);
    });

    it('should put content before element', async () => {
      const parent = createTestElement('<div><span id="target">Target</span></div>');
      const target = parent.querySelector('#target')!;
      
      await command.execute(context, 'Before ', 'before', target);
      
      expect(parent.innerHTML).toBe('Before <span id="target">Target</span>');
    });

    it('should put content after element', async () => {
      const parent = createTestElement('<div><span id="target">Target</span></div>');
      const target = parent.querySelector('#target')!;
      
      await command.execute(context, ' After', 'after', target);
      
      expect(parent.innerHTML).toBe('<span id="target">Target</span> After');
    });

    it('should put content at start of element', async () => {
      testElement.innerHTML = 'Original';
      
      await command.execute(context, 'Start ', 'at start of', testElement);
      
      expect(testElement.innerHTML).toBe('Start Original');
    });

    it('should put content at end of element', async () => {
      testElement.innerHTML = 'Original';
      
      await command.execute(context, ' End', 'at end of', testElement);
      
      expect(testElement.innerHTML).toBe('Original End');
    });
  });

  describe('Validation', () => {
    it('should validate correct arguments', () => {
      const error1 = command.validate(['content', 'into', testElement]);
      expect(error1).toBe(null);
      
      const error2 = command.validate(['content', 'before', testElement]);
      expect(error2).toBe(null);
    });

    it('should reject invalid prepositions', () => {
      const error = command.validate(['content', 'invalid', testElement]);
      expect(error).toBe('Invalid preposition: invalid. Must be one of: into, before, after, at start of, at end of');
    });

    it('should require minimum arguments', () => {
      const error = command.validate(['content']);
      expect(error).toBe('Put command requires at least 3 arguments: content, preposition, target');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid target gracefully', async () => {
      await expect(async () => {
        await command.execute(context, 'content', 'into', '#nonexistent');
      }).rejects.toThrow('Target element not found: #nonexistent');
    });

    it('should handle null content', async () => {
      await command.execute(context, null, 'into', testElement);
      expect(testElement.innerHTML).toBe('');
    });

    it('should handle undefined content', async () => {
      await command.execute(context, undefined, 'into', testElement);
      expect(testElement.innerHTML).toBe('');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: put HTML with em tag', async () => {
      // From LSP: <div _="on click put '<em>Clicked!</em>' into me">Click Me!</div>
      await command.execute(context, '<em>Clicked!</em>', 'into', testElement);
      
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
      expect(testElement.querySelector('em')).toBeTruthy();
    });

    it('should handle LSP example 2: put into innerHTML property', async () => {
      // From LSP: <div _="on click put '<em>Clicked!</em>' into my.innerHTML">Click Me!</div>
      // This would be handled by property resolution in the expression system
      await command.execute(context, '<em>Clicked!</em>', 'into', testElement);
      
      expect(testElement.innerHTML).toBe('<em>Clicked!</em>');
    });
  });
});