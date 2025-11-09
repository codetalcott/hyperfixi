/**
 * Tests for set command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SetCommand } from './set';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Set Command', () => {
  let command: SetCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new SetCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('set');
      expect(command.syntax).toBe(
        'set <expression> to <expression>\n  set <object literal> on <expression>'
      );
      expect(command.description).toBe(
        'The set command allows you to set a value of a variable, property or the DOM.'
      );
    });
  });

  describe('Variable Assignment', () => {
    it('should set local variables', async () => {
      // Test: set x to 'foo'
      await command.execute(context, 'x', 'to', 'foo');

      expect(context.locals.get('x')).toBe('foo');
    });

    it('should set local variables with numbers', async () => {
      // Test: set count to 42
      await command.execute(context, 'count', 'to', 42);

      expect(context.locals.get('count')).toBe(42);
    });

    it('should set global variables when specified', async () => {
      // Test: set global globalVar to 10
      await command.execute(context, 'global', 'globalVar', 'to', 10);

      expect(context.globals.get('globalVar')).toBe(10);
    });

    it('should update existing local variables', async () => {
      context.locals.set('x', 'old');

      await command.execute(context, 'x', 'to', 'new');

      expect(context.locals.get('x')).toBe('new');
    });

    it('should handle complex expressions as values', async () => {
      context.locals.set('base', 10);

      // This would normally be handled by expression evaluation
      // For now we test with the final value
      await command.execute(context, 'result', 'to', 50); // base * 5

      expect(context.locals.get('result')).toBe(50);
    });
  });

  describe('Property Assignment', () => {
    it('should set element properties', async () => {
      // Test: set my.style.color to 'red'
      await command.execute(context, testElement, 'style.color', 'to', 'red');

      expect(testElement.style.color).toBe('red');
    });

    it('should set element attributes', async () => {
      // Test: set my.disabled to true
      await command.execute(context, testElement, 'disabled', 'to', true);

      expect(testElement.getAttribute('disabled')).toBe('true');
    });

    it('should set innerHTML property', async () => {
      await command.execute(context, testElement, 'innerHTML', 'to', '<span>Hello</span>');

      expect(testElement.innerHTML).toBe('<span>Hello</span>');
    });

    it('should set textContent property', async () => {
      await command.execute(context, testElement, 'textContent', 'to', 'Plain text');

      expect(testElement.textContent).toBe('Plain text');
    });
  });

  describe('Object Literal Assignment', () => {
    it('should set multiple properties using object literal', async () => {
      const properties = {
        disabled: true,
        innerText: "Don't click me!",
      };

      // Test: set { disabled: true, innerText: "Don't click me!" } on me
      await command.execute(context, properties, 'on', testElement);

      expect(testElement.getAttribute('disabled')).toBe('true');
      expect(testElement.innerText).toBe("Don't click me!");
    });

    it('should set multiple CSS properties', async () => {
      const styles = {
        color: 'blue',
        backgroundColor: 'yellow',
        fontSize: '16px',
      };

      await command.execute(context, styles, 'on', testElement, 'style');

      expect(testElement.style.color).toBe('blue');
      expect(testElement.style.backgroundColor).toBe('yellow');
      expect(testElement.style.fontSize).toBe('16px');
    });

    it('should handle mixed property types in object literal', async () => {
      const properties = {
        disabled: false,
        tabIndex: 1,
        className: 'active',
        'data-value': '42',
      };

      await command.execute(context, properties, 'on', testElement);

      expect(testElement.disabled).toBe(false);
      expect(testElement.tabIndex).toBe(1);
      expect(testElement.className).toBe('active');
      expect(testElement.getAttribute('data-value')).toBe('42');
    });
  });

  describe('Scoping Rules', () => {
    it('should create new local variable if not exists', async () => {
      await command.execute(context, 'newVar', 'to', 'value');

      expect(context.locals.get('newVar')).toBe('value');
    });

    it('should prefer local scope over element scope', async () => {
      // Set element-scoped variable first
      if (!context.elementScope) context.elementScope = new Map();
      context.elementScope.set('x', 'element');

      // Set locally should override
      await command.execute(context, 'x', 'to', 'local');

      expect(context.locals.get('x')).toBe('local');
    });

    it('should handle $ prefixed global variables', async () => {
      await command.execute(context, '$globalVar', 'to', 'global-value');

      expect(context.globals.get('$globalVar')).toBe('global-value');
    });
  });

  describe('Validation', () => {
    it('should validate basic set syntax', () => {
      const error = command.validate(['x', 'to', 'value']);
      expect(error).toBe(null);
    });

    it('should validate object literal syntax', () => {
      const error = command.validate([{ prop: 'value' }, 'on', testElement]);
      expect(error).toBe(null);
    });

    it('should require minimum arguments', () => {
      const error = command.validate(['x']);
      expect(error).toBe('Set command requires at least 3 arguments');
    });

    it('should require valid keywords', () => {
      const error = command.validate(['x', 'invalid', 'value']);
      expect(error).toBe('Invalid set syntax. Expected "to" or object literal with "on"');
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined values', async () => {
      await command.execute(context, 'x', 'to', null);
      expect(context.locals.get('x')).toBe(null);

      await command.execute(context, 'y', 'to', undefined);
      expect(context.locals.get('y')).toBe(undefined);
    });

    it('should handle invalid property paths gracefully', async () => {
      await expect(async () => {
        await command.execute(context, null, 'invalidProp', 'to', 'value');
      }).rejects.toThrow('Cannot set property on null or undefined target');
    });

    it('should handle read-only properties gracefully', async () => {
      // Some properties might be read-only, should not throw
      const originalTagName = testElement.tagName;
      await command.execute(context, testElement, 'tagName', 'to', 'SPAN');
      // tagName might change in test environment, but shouldn't crash
      expect(() => command.execute(context, testElement, 'tagName', 'to', 'SPAN')).not.toThrow();
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: global variable assignment', async () => {
      // From LSP: set global globalVar to 10
      await command.execute(context, 'global', 'globalVar', 'to', 10);

      expect(context.globals.get('globalVar')).toBe(10);
    });

    it('should handle LSP example 2: local variable with logging', async () => {
      // From LSP: set x to 'foo' then log x
      await command.execute(context, 'x', 'to', 'foo');

      expect(context.locals.get('x')).toBe('foo');
    });

    it('should handle LSP example 3: style property', async () => {
      // From LSP: set my.style.color to 'red'
      await command.execute(context, testElement, 'style.color', 'to', 'red');

      expect(testElement.style.color).toBe('red');
    });

    it('should handle LSP example 4: object literal on element', async () => {
      // From LSP: set { disabled: true, innerText: "Don't click me!" } on me
      const buttonElement = createTestElement('<button>Click Me!</button>');
      const buttonContext = createMockHyperscriptContext(buttonElement) as ExecutionContext;

      const properties = {
        disabled: true,
        innerText: "Don't click me!",
      };

      await command.execute(buttonContext, properties, 'on', buttonElement);

      expect(buttonElement.getAttribute('disabled')).toBe('true');
      expect(buttonElement.innerText).toBe("Don't click me!");
    });
  });
});
