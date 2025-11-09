/**
 * Tests for make command
 * Generated from LSP examples with TDD implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MakeCommand } from './make';
import { createMockHyperscriptContext, createTestElement } from '../../test-setup';
import { ExecutionContext } from '../../types/core';

describe('Make Command', () => {
  let command: MakeCommand;
  let context: ExecutionContext;
  let testElement: HTMLElement;

  beforeEach(() => {
    command = new MakeCommand();
    testElement = createTestElement('<div id="test">Test</div>');
    context = createMockHyperscriptContext(testElement) as ExecutionContext;

    // Ensure locals and globals Maps exist
    if (!context.locals) context.locals = new Map();
    if (!context.globals) context.globals = new Map();
  });

  describe('Command Properties', () => {
    it('should have correct metadata', () => {
      expect(command.name).toBe('make');
      expect(command.syntax).toBe(
        'make (a|an) <expression> [from <arg-list>] [called <identifier>]\nmake (a|an) <query-ref>                    [called <identifier>]'
      );
      expect(command.description).toBe(
        'The make command can be used to create class instances or DOM elements.\nIn the first form:\nis equal to the JavaScript new URL("/path/", "https://origin.example.com").\nIn the second form:\nwill create an <a> element and add the class "navlink" to it. Currently, onlyclasses and IDs are supported.'
      );
    });
  });

  describe('JavaScript Class Instantiation', () => {
    it('should create class instances with arguments', async () => {
      // Mock URL constructor
      const MockURL = vi.fn().mockImplementation((path, base) => ({
        href: base + path.substring(1),
        path,
        base,
      }));
      (global as any).URL = MockURL;

      const result = await command.execute(
        context,
        'a',
        'URL',
        'from',
        '/path/',
        'https://origin.example.com'
      );

      expect(MockURL).toHaveBeenCalledWith('/path/', 'https://origin.example.com');
      expect(result.href).toBe('https://origin.example.com/path/');
      expect(context.it).toBe(result);

      // Cleanup
      delete (global as any).URL;
    });

    it('should create class instances without arguments', async () => {
      const MockDate = vi.fn().mockImplementation(() => ({
        toISOString: () => '2023-01-01T00:00:00.000Z',
      }));
      (global as any).Date = MockDate;

      const result = await command.execute(context, 'a', 'Date');

      expect(MockDate).toHaveBeenCalledWith();
      expect(result.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      expect(context.it).toBe(result);

      // Cleanup
      delete (global as any).Date;
    });

    it('should handle "an" article', async () => {
      const MockArray = vi.fn().mockImplementation(() => []);
      (global as any).Array = MockArray;

      await command.execute(context, 'an', 'Array');

      expect(MockArray).toHaveBeenCalledWith();

      // Cleanup
      delete (global as any).Array;
    });

    it('should store result in variable when "called" is specified', async () => {
      const MockURL = vi.fn().mockImplementation((path, base) => ({ href: base + path }));
      (global as any).URL = MockURL;

      await command.execute(
        context,
        'a',
        'URL',
        'from',
        '/api',
        'https://api.example.com',
        'called',
        'apiUrl'
      );

      expect(context.locals.get('apiUrl')).toBeDefined();
      expect(context.locals.get('apiUrl').href).toBe('https://api.example.com/api');

      // Cleanup
      delete (global as any).URL;
    });
  });

  describe('DOM Element Creation', () => {
    it('should create simple DOM elements', async () => {
      const result = await command.execute(context, 'a', '<div/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('div');
      expect(context.it).toBe(result);
    });

    it('should create DOM elements with classes', async () => {
      const result = await command.execute(context, 'an', '<a.navlink/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('a');
      expect(result.classList.contains('navlink')).toBe(true);
    });

    it('should create DOM elements with multiple classes', async () => {
      const result = await command.execute(context, 'a', '<span.highlight.important/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('span');
      expect(result.classList.contains('highlight')).toBe(true);
      expect(result.classList.contains('important')).toBe(true);
    });

    it('should create DOM elements with ID', async () => {
      const result = await command.execute(context, 'a', '<div#myId/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('div');
      expect(result.id).toBe('myId');
    });

    it('should create DOM elements with ID and classes', async () => {
      const result = await command.execute(context, 'a', '<button#submit.primary.large/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('button');
      expect(result.id).toBe('submit');
      expect(result.classList.contains('primary')).toBe(true);
      expect(result.classList.contains('large')).toBe(true);
    });

    it('should store DOM element in variable when "called" is specified', async () => {
      await command.execute(context, 'a', '<span.topping/>', 'called', 'toppingElement');

      const element = context.locals.get('toppingElement');
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.tagName.toLowerCase()).toBe('span');
      expect(element.classList.contains('topping')).toBe(true);
    });
  });

  describe('Complex Class Instantiation', () => {
    it('should handle Intl.ListFormat creation', async () => {
      const MockListFormat = vi.fn().mockImplementation((locale, options) => ({
        format: items => items.join(', '),
        formatToParts: items => items.map(item => ({ type: 'element', value: item })),
        locale,
        options,
      }));

      // Mock Intl global
      (global as any).Intl = { ListFormat: MockListFormat };

      const result = await command.execute(context, 'an', 'Intl.ListFormat', 'from', 'en', {
        type: 'conjunction',
      });

      expect(MockListFormat).toHaveBeenCalledWith('en', { type: 'conjunction' });
      expect(result.locale).toBe('en');
      expect(result.options.type).toBe('conjunction');

      // Cleanup
      delete (global as any).Intl;
    });

    it('should handle nested object creation', async () => {
      const MockInnerClass = vi.fn().mockImplementation(() => ({ inner: true }));
      const MockOuterClass = { InnerClass: MockInnerClass };
      (global as any).Outer = MockOuterClass;

      const result = await command.execute(context, 'an', 'Outer.InnerClass');

      expect(MockInnerClass).toHaveBeenCalledWith();
      expect(result.inner).toBe(true);

      // Cleanup
      delete (global as any).Outer;
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent classes gracefully', async () => {
      await expect(async () => {
        await command.execute(context, 'a', 'NonExistentClass');
      }).rejects.toThrow();
    });

    it('should handle invalid DOM element syntax', async () => {
      await expect(async () => {
        await command.execute(context, 'a', '<invalid-syntax');
      }).rejects.toThrow('Invalid DOM element syntax');
    });

    it('should handle missing constructor arguments gracefully', async () => {
      const MockConstructor = vi.fn().mockImplementation(() => ({ created: true }));
      (global as any).TestClass = MockConstructor;

      const result = await command.execute(context, 'a', 'TestClass', 'from');

      expect(MockConstructor).toHaveBeenCalledWith();
      expect(result.created).toBe(true);

      // Cleanup
      delete (global as any).TestClass;
    });
  });

  describe('Validation', () => {
    it('should validate basic make syntax', () => {
      const error = command.validate(['a', 'TestClass']);
      expect(error).toBe(null);
    });

    it('should validate make with "from" syntax', () => {
      const error = command.validate(['a', 'TestClass', 'from', 'arg1', 'arg2']);
      expect(error).toBe(null);
    });

    it('should validate make with "called" syntax', () => {
      const error = command.validate(['a', 'TestClass', 'called', 'myInstance']);
      expect(error).toBe(null);
    });

    it('should require article (a/an)', () => {
      const error = command.validate(['TestClass']);
      expect(error).toBe('Make command requires "a" or "an" article');
    });

    it('should require class or element expression', () => {
      const error = command.validate(['a']);
      expect(error).toBe('Make command requires class name or DOM element expression');
    });

    it('should validate "from" keyword placement', () => {
      const error = command.validate(['a', 'TestClass', 'invalid', 'arg']);
      expect(error).toBe('Invalid make syntax. Expected "from" or "called" keyword');
    });

    it('should require arguments after "from"', () => {
      const error = command.validate(['a', 'TestClass', 'from']);
      expect(error).toBe('Make command requires arguments after "from"');
    });

    it('should require variable name after "called"', () => {
      const error = command.validate(['a', 'TestClass', 'called']);
      expect(error).toBe('Make command requires variable name after "called"');
    });
  });

  describe('LSP Example Integration', () => {
    it('should handle LSP example 1: URL creation', async () => {
      // From LSP: make a URL from "/path/", "https://origin.example.com"
      const MockURL = vi.fn().mockImplementation((path, origin) => ({
        href: origin + path,
        toString: () => origin + path,
      }));
      (global as any).URL = MockURL;

      const result = await command.execute(
        context,
        'a',
        'URL',
        'from',
        '/path/',
        'https://origin.example.com'
      );

      expect(MockURL).toHaveBeenCalledWith('/path/', 'https://origin.example.com');
      expect(result.href).toBe('https://origin.example.com/path/');

      // Cleanup
      delete (global as any).URL;
    });

    it('should handle LSP example 2: DOM element with class', async () => {
      // From LSP: make an <a.navlink/>
      const result = await command.execute(context, 'an', '<a.navlink/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('a');
      expect(result.classList.contains('navlink')).toBe(true);
    });

    it('should handle LSP example 3: complex Intl.ListFormat usage', async () => {
      // From LSP complex example
      const mockFormatToParts = vi.fn().mockReturnValue([
        { type: 'element', value: 'pepperoni' },
        { type: 'literal', value: ', ' },
        { type: 'element', value: 'mushrooms' },
        { type: 'literal', value: ', and ' },
        { type: 'element', value: 'cheese' },
      ]);

      const MockListFormat = vi.fn().mockImplementation((locale, options) => ({
        formatToParts: mockFormatToParts,
        locale,
        options,
      }));

      (global as any).Intl = { ListFormat: MockListFormat };

      const result = await command.execute(
        context,
        'an',
        'Intl.ListFormat',
        'from',
        'en',
        { type: 'conjunction' },
        'called',
        'listFmt'
      );

      expect(MockListFormat).toHaveBeenCalledWith('en', { type: 'conjunction' });
      expect(context.locals.get('listFmt')).toBe(result);
      expect(result.formatToParts).toBeDefined();

      // Test the formatToParts functionality
      const parts = result.formatToParts(['pepperoni', 'mushrooms', 'cheese']);
      expect(parts).toHaveLength(5);
      expect(parts[0]).toEqual({ type: 'element', value: 'pepperoni' });

      // Cleanup
      delete (global as any).Intl;
    });

    it('should handle LSP example 4: span element creation', async () => {
      // From LSP: make a <span.topping/>
      const result = await command.execute(context, 'a', '<span.topping/>');

      expect(result).toBeInstanceOf(HTMLElement);
      expect(result.tagName.toLowerCase()).toBe('span');
      expect(result.classList.contains('topping')).toBe(true);
    });
  });

  describe('Integration with Context', () => {
    it('should work within conditional logic', async () => {
      // Simulate conditional element creation
      const shouldCreateButton = true;

      if (shouldCreateButton) {
        const result = await command.execute(context, 'a', '<button.submit/>');
        expect(result.classList.contains('submit')).toBe(true);
      }
    });

    it('should work with variable storage and retrieval', async () => {
      // Create and store element
      await command.execute(context, 'a', '<div.container/>', 'called', 'container');

      const storedElement = context.locals.get('container');
      expect(storedElement).toBeInstanceOf(HTMLElement);
      expect(storedElement.classList.contains('container')).toBe(true);

      // Element should be available for further operations
      storedElement.textContent = 'Container content';
      expect(storedElement.textContent).toBe('Container content');
    });
  });
});
