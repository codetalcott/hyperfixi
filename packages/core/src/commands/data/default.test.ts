/**
 * Default Command Tests
 * Test setting default values for variables, attributes, and properties
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../../test-setup.js';
import { DefaultCommand } from './default';
import type { ExecutionContext } from '../../types/core';

describe('Default Command', () => {
  let defaultCommand: DefaultCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    defaultCommand = new DefaultCommand();
    testElement = document.createElement('div');
    testElement.id = 'd1';
    document.body.appendChild(testElement);

    context = {
      me: testElement,
      locals: new Map(),
    };
  });

  afterEach(() => {
    if (testElement.parentNode) {
      document.body.removeChild(testElement);
    }
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(defaultCommand.name).toBe('default');
      expect(defaultCommand.isBlocking).toBe(false);
      expect(typeof defaultCommand.syntax).toBe('string');
      expect(typeof defaultCommand.description).toBe('string');
    });
  });

  describe('Variable Defaults', () => {
    it('should set default value for non-existent variable', async () => {
      const result = await defaultCommand.execute(context, 'x', 'to', 'foo');

      expect(result).toBe('foo');
      expect(context.locals?.get('x')).toBe('foo');
    });

    it('should not override existing variable', async () => {
      // Set variable first
      context.locals?.set('x', 'bar');

      const result = await defaultCommand.execute(context, 'x', 'to', 'foo');

      expect(result).toBe('bar'); // Should return existing value
      expect(context.locals?.get('x')).toBe('bar'); // Should remain unchanged
    });

    it('should handle undefined vs null variables correctly', async () => {
      // Set variable to null
      context.locals?.set('x', null);

      const result = await defaultCommand.execute(context, 'x', 'to', 'foo');

      expect(result).toBe(null); // Should respect null as an existing value
      expect(context.locals?.get('x')).toBe(null);
    });

    it('should handle empty string as existing value', async () => {
      context.locals?.set('x', '');

      const result = await defaultCommand.execute(context, 'x', 'to', 'foo');

      expect(result).toBe(''); // Should respect empty string
      expect(context.locals?.get('x')).toBe('');
    });
  });

  describe('Attribute Defaults', () => {
    it('should set default value for non-existent attribute', async () => {
      const result = await defaultCommand.execute(context, '@foo', 'to', 'foo');

      expect(result).toBe('foo');
      expect(testElement.getAttribute('foo')).toBe('foo');
    });

    it('should not override existing attribute', async () => {
      testElement.setAttribute('foo', 'bar');

      const result = await defaultCommand.execute(context, '@foo', 'to', 'foo');

      expect(result).toBe('bar'); // Should return existing value
      expect(testElement.getAttribute('foo')).toBe('bar'); // Should remain unchanged
    });

    it('should handle data attributes', async () => {
      const result = await defaultCommand.execute(context, '@data-test', 'to', 'value');

      expect(result).toBe('value');
      expect(testElement.getAttribute('data-test')).toBe('value');
    });

    it('should not override existing data attributes', async () => {
      testElement.setAttribute('data-test', 'existing');

      const result = await defaultCommand.execute(context, '@data-test', 'to', 'value');

      expect(result).toBe('existing');
      expect(testElement.getAttribute('data-test')).toBe('existing');
    });
  });

  describe('Property Defaults', () => {
    it('should set default value for non-existent property', async () => {
      const result = await defaultCommand.execute(context, 'me.foo', 'to', 'foo');

      expect(result).toBe('foo');
      expect((testElement as any).foo).toBe('foo');
    });

    it('should not override existing property', async () => {
      (testElement as any).foo = 'bar';

      const result = await defaultCommand.execute(context, 'me.foo', 'to', 'foo');

      expect(result).toBe('bar'); // Should return existing value
      expect((testElement as any).foo).toBe('bar'); // Should remain unchanged
    });

    it('should handle nested properties', async () => {
      const result = await defaultCommand.execute(context, 'me.nested.prop', 'to', 'value');

      expect(result).toBe('value');
      expect((testElement as any).nested.prop).toBe('value');
    });

    it('should not override existing nested properties', async () => {
      (testElement as any).nested = { prop: 'existing' };

      const result = await defaultCommand.execute(context, 'me.nested.prop', 'to', 'value');

      expect(result).toBe('existing');
      expect((testElement as any).nested.prop).toBe('existing');
    });

    it('should handle custom DOM properties', async () => {
      // Test with a custom property that truly doesn't exist
      const result = await defaultCommand.execute(
        context,
        'me.customProp',
        'to',
        'default content'
      );

      expect(result).toBe('default content');
      expect((testElement as any).customProp).toBe('default content');
    });

    it('should not override existing DOM properties', async () => {
      testElement.innerHTML = 'existing content';

      const result = await defaultCommand.execute(context, 'me.innerHTML', 'to', 'default content');

      expect(result).toBe('existing content');
      expect(testElement.innerHTML).toBe('existing content');
    });

    it('should respect empty string as existing value for DOM properties', async () => {
      testElement.innerHTML = '';

      const result = await defaultCommand.execute(context, 'me.innerHTML', 'to', 'default content');

      expect(result).toBe(''); // Should respect empty string as existing
      expect(testElement.innerHTML).toBe('');
    });
  });

  describe('Context References', () => {
    it('should handle possessive syntax with my', async () => {
      const result = await defaultCommand.execute(context, 'my foo', 'to', 'value');

      expect(result).toBe('value');
      expect((testElement as any).foo).toBe('value');
    });

    it('should handle possessive syntax with its', async () => {
      const itElement = document.createElement('span');
      context.it = itElement;

      const result = await defaultCommand.execute(context, 'its bar', 'to', 'value');

      expect(result).toBe('value');
      expect((itElement as any).bar).toBe('value');
    });

    it('should handle property access syntax', async () => {
      const result = await defaultCommand.execute(context, testElement, 'foo', 'to', 'value');

      expect(result).toBe('value');
      expect((testElement as any).foo).toBe('value');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for missing arguments', async () => {
      await expect(defaultCommand.execute(context)).rejects.toThrow(
        'Default command requires at least 3 arguments'
      );
    });

    it('should throw error for missing "to" keyword', async () => {
      await expect(defaultCommand.execute(context, 'x', 'not-to', 'value')).rejects.toThrow(
        'Default command requires "to" keyword'
      );
    });

    it('should throw error for invalid context reference', async () => {
      context.me = null;

      await expect(defaultCommand.execute(context, 'my foo', 'to', 'value')).rejects.toThrow(
        "Context reference 'my' is not available"
      );
    });
  });

  describe('Global Variables', () => {
    it('should set default for global variables', async () => {
      const result = await defaultCommand.execute(context, '$global', 'to', 'value');

      expect(result).toBe('value');
      expect(context.globals?.get('$global')).toBe('value');
    });

    it('should not override existing global variables', async () => {
      if (!context.globals) context.globals = new Map();
      context.globals.set('$global', 'existing');

      const result = await defaultCommand.execute(context, '$global', 'to', 'value');

      expect(result).toBe('existing');
      expect(context.globals.get('$global')).toBe('existing');
    });
  });

  describe('Validation', () => {
    it('should validate correct syntax', () => {
      expect(defaultCommand.validate(['x', 'to', 'value'])).toBeNull();
      expect(defaultCommand.validate(['@attr', 'to', 'value'])).toBeNull();
      expect(defaultCommand.validate(['me.prop', 'to', 'value'])).toBeNull();
      expect(defaultCommand.validate([testElement, 'prop', 'to', 'value'])).toBeNull();
    });

    it('should reject invalid syntax', () => {
      expect(defaultCommand.validate([])).toContain('requires at least 3 arguments');
      expect(defaultCommand.validate(['x'])).toContain('requires at least 3 arguments');
      expect(defaultCommand.validate(['x', 'to'])).toContain('requires at least 3 arguments');
      expect(defaultCommand.validate(['x', 'not-to', 'value'])).toContain('Expected "to" keyword');
    });
  });
});
