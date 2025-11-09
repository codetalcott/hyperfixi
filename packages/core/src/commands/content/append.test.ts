/**
 * Tests for append command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppendCommand } from './append';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Append Command', () => {
  let command: AppendCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new AppendCommand();
    testElement = createTestElement('<div id="test">Initial</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('append');
      expect(command.syntax).toBe('append <string> [to <string> | <array> | <HTML Element>]');
      expect(command.description).toBe(
        'The append command adds a string value to the end of another string, array, or HTML Element. If no target variable is defined, then the standard result variable is used by default.'
      );
    });
  });

  describe('String Appending', () => {
    it('should append to string variables', async () => {
      context.locals.set('fullName', 'John');

      await command.execute(context, ' Connor', 'to', 'fullName');

      expect(context.locals.get('fullName')).toBe('John Connor');
    });

    it('should create new variable when appending to undefined variable', async () => {
      await command.execute(context, ' World', 'to', 'greeting');

      expect(context.locals.get('greeting')).toBe(' World');
    });

    it('should handle complex string appending', async () => {
      context.locals.set('greeting', 'Hello');

      await command.execute(context, ' beautiful world!', 'to', 'greeting');

      expect(context.locals.get('greeting')).toBe('Hello beautiful world!');
    });

    it('should use result variable by default if no target specified', async () => {
      context.it = 'Start';

      await command.execute(context, ' appended');

      expect(context.it).toBe('Start appended');
    });
  });

  describe('Array Appending', () => {
    it('should append to arrays', async () => {
      const resultArray: number[] = [];
      context.locals.set('resultArray', resultArray);

      await command.execute(context, 1, 'to', 'resultArray');
      await command.execute(context, 2, 'to', 'resultArray');
      await command.execute(context, 3, 'to', 'resultArray');

      expect(context.locals.get('resultArray')).toEqual([1, 2, 3]);
    });

    it('should append different data types to arrays', async () => {
      const mixedArray: any[] = ['start'];
      context.locals.set('mixedArray', mixedArray);

      await command.execute(context, 42, 'to', 'mixedArray');
      await command.execute(context, true, 'to', 'mixedArray');
      await command.execute(context, { key: 'value' }, 'to', 'mixedArray');

      expect(context.locals.get('mixedArray')).toEqual(['start', 42, true, { key: 'value' }]);
    });

    it('should create new array if target is not array', async () => {
      await command.execute(context, 'first', 'to', 'newArray');

      expect(context.locals.get('newArray')).toBe('first');

      // Subsequent appends should convert to array behavior
      await command.execute(context, 'second', 'to', 'newArray');
      expect(context.locals.get('newArray')).toBe('firstsecond');
    });
  });

  describe('HTML Element Appending', () => {
    it('should append to HTML element innerHTML', async () => {
      testElement.innerHTML = '<span>Start</span>';

      await command.execute(context, '<i>More HTML here</i>', 'to', testElement);

      expect(testElement.innerHTML).toBe('<span>Start</span><i>More HTML here</i>');
    });

    it('should handle direct element references', async () => {
      testElement.innerHTML = 'Original';

      await command.execute(context, ' Added', 'to', testElement);

      expect(testElement.innerHTML).toBe('Original Added');
    });
  });

  describe('Default Behavior (No Target)', () => {
    it('should use result variable when no target specified', async () => {
      context.it = 'Initial';

      await command.execute(context, ' appended');

      expect(context.it).toBe('Initial appended');
    });

    it('should initialize result variable if undefined', async () => {
      context.it = undefined;

      await command.execute(context, 'First content');

      expect(context.it).toBe('First content');
    });

    it('should handle null result variable', async () => {
      context.it = null;

      await command.execute(context, 'Content');

      expect(context.it).toBe('nullContent');
    });
  });

  describe('Complex Usage Patterns', () => {
    it('should handle template literal appending', async () => {
      const person = { id: 1, iconURL: 'icon.png', firstName: 'John', lastName: 'Doe' };

      const template = `
        <div id="${person.id}">
            <div class="icon"><img src="${person.iconURL}"></div>
            <div class="label">${person.firstName} ${person.lastName}</div>
        </div>
    `;

      context.it = '<div>';
      await command.execute(context, template);

      expect(context.it).toContain('<div id="1">');
      expect(context.it).toContain('John Doe');
    });

    it('should handle building HTML in loops', async () => {
      const people = [
        { id: 1, firstName: 'John', lastName: 'Doe', iconURL: 'john.png' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', iconURL: 'jane.png' },
      ];

      context.it = '<div>';

      for (const person of people) {
        const template = `
        <div id="${person.id}">
            <div class="icon"><img src="${person.iconURL}"></div>
            <div class="label">${person.firstName} ${person.lastName}</div>
        </div>
    `;
        await command.execute(context, template);
      }

      await command.execute(context, '</div>');

      expect(context.it).toContain('John Doe');
      expect(context.it).toContain('Jane Smith');
      expect(context.it).toContain('</div>');
    });
  });

  describe('Variable Resolution', () => {
    it('should resolve target from local variables', async () => {
      context.locals.set('myVar', 'initial');

      await command.execute(context, ' added', 'to', 'myVar');

      expect(context.locals.get('myVar')).toBe('initial added');
    });

    it('should resolve target from global variables', async () => {
      context.globals.set('globalVar', 'global');

      await command.execute(context, ' content', 'to', 'globalVar');

      expect(context.globals.get('globalVar')).toBe('global content');
    });

    it('should prefer local over global variables', async () => {
      context.locals.set('var', 'local');
      context.globals.set('var', 'global');

      await command.execute(context, ' added', 'to', 'var');

      expect(context.locals.get('var')).toBe('local added');
      expect(context.globals.get('var')).toBe('global'); // unchanged
    });

    it('should create new local variable if not found', async () => {
      await command.execute(context, 'new content', 'to', 'newVar');

      expect(context.locals.get('newVar')).toBe('new content');
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined content gracefully', async () => {
      context.locals.set('target', 'start');

      await command.execute(context, null, 'to', 'target');
      expect(context.locals.get('target')).toBe('startnull');

      await command.execute(context, undefined, 'to', 'target');
      expect(context.locals.get('target')).toBe('startnullundefined');
    });

    it('should handle invalid target types', async () => {
      const invalidTarget = 42;
      context.locals.set('invalid', invalidTarget);

      await command.execute(context, ' text', 'to', 'invalid');

      expect(context.locals.get('invalid')).toBe('42 text');
    });
  });

  describe('Validation', () => {
    it('should validate basic append syntax', () => {
      const error = command.validate(['content']);
      expect(error).toBe(null);
    });

    it('should validate append with target syntax', () => {
      const error = command.validate(['content', 'to', 'target']);
      expect(error).toBe(null);
    });

    it('should require at least one argument', () => {
      const error = command.validate([]);
      expect(error).toBe('Append command requires content to append');
    });

    it('should validate "to" keyword when target is specified', () => {
      const error = command.validate(['content', 'invalid', 'target']);
      expect(error).toBe('Append command requires "to" keyword when specifying target');
    });

    it('should require target after "to" keyword', () => {
      const error = command.validate(['content', 'to']);
      expect(error).toBe('Append command requires target after "to" keyword');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: string appending', async () => {
      // From LSP: set fullName to "John" then append " Connor" to fullName
      context.locals.set('fullName', 'John');

      await command.execute(context, ' Connor', 'to', 'fullName');

      expect(context.locals.get('fullName')).toBe('John Connor');
    });

    it('should handle LSP example 2: array appending', async () => {
      // From LSP: set resultArray to [] then append 1,2,3 to resultArray
      const resultArray: number[] = [];
      context.locals.set('resultArray', resultArray);

      await command.execute(context, 1, 'to', 'resultArray');
      await command.execute(context, 2, 'to', 'resultArray');
      await command.execute(context, 3, 'to', 'resultArray');

      expect(context.locals.get('resultArray')).toEqual([1, 2, 3]);
    });

    it('should handle LSP example 3: building HTML with result variable', async () => {
      // From LSP: build HTML string using result variable
      context.it = '<div>';

      const people = [
        { id: '1', iconURL: 'icon1.png', firstName: 'John', lastName: 'Doe' },
        { id: '2', iconURL: 'icon2.png', firstName: 'Jane', lastName: 'Smith' },
      ];

      for (const person of people) {
        const template = `
        <div id="${person.id}">
            <div class="icon"><img src="${person.iconURL}"></div>
            <div class="label">${person.firstName} ${person.lastName}</div>
        </div>
    `;
        await command.execute(context, template);
      }

      await command.execute(context, '</div>');

      expect(context.it).toContain('<div id="1">');
      expect(context.it).toContain('<div id="2">');
      expect(context.it).toContain('John Doe');
      expect(context.it).toContain('Jane Smith');
      expect(context.it).toContain('</div>');
    });
  });

  describe('Element Context Integration', () => {
    it('should work with me context reference', async () => {
      context.me = testElement;
      testElement.innerHTML = 'Original';

      await command.execute(context, ' from me', 'to', testElement);

      expect(testElement.innerHTML).toBe('Original from me');
    });
  });
});
