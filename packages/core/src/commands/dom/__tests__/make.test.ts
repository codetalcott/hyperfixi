/**
 * Unit Tests for MakeCommand
 *
 * Tests the make command which creates DOM elements or class instances.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MakeCommand } from '../make';
import { evalHyperScript } from '../../../compatibility/eval-hyperscript';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';

// ========== Test Utilities ==========

function createMockContext(): ExecutionContext & TypedExecutionContext {
  return {
    me: document.createElement('div'),
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: document.createElement('div'),
    detail: undefined,
    variables: new Map(),
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(returnValue?: unknown) {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (returnValue !== undefined) {
        return returnValue;
      }
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as unknown as { value: unknown }).value;
      }
      return node;
    },
  } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;
}

// ========== Tests ==========

describe('MakeCommand', () => {
  let command: MakeCommand;

  beforeEach(() => {
    command = new MakeCommand();
  });

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('make');
    });

    it('should have metadata with description and examples', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('create');
      expect(command.metadata.examples).toBeInstanceOf(Array);
      expect(command.metadata.examples.length).toBeGreaterThan(0);
    });

    it('should have dom-creation and data-mutation side effects', () => {
      expect(command.metadata.sideEffects).toContain('dom-creation');
      expect(command.metadata.sideEffects).toContain('data-mutation');
    });
  });

  describe('parseInput - DOM elements', () => {
    it('should parse simple div element', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('<div/>');

      const input = await command.parseInput(
        { args: [{ type: 'string', value: '<div/>' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.expression).toBe('<div/>');
      expect(input.article).toBe('a');
    });

    it('should parse element with id and classes', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('<div#myid.class1.class2/>');

      const input = await command.parseInput(
        { args: [{ type: 'string', value: '<div#myid.class1.class2/>' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.expression).toBe('<div#myid.class1.class2/>');
    });

    it('should detect "an" article', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('<div/>');

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '<div/>' }],
          modifiers: { an: { type: 'keyword', value: 'an' } as any },
        },
        evaluator,
        context
      );

      expect(input.article).toBe('an');
    });

    it('should parse with "called" modifier', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('<div/>');

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '<div/>' }],
          modifiers: {
            called: { type: 'symbol', name: 'myElement' } as any,
          },
        },
        evaluator,
        context
      );

      expect(input.variableName).toBe('myElement');
    });

    it('should throw if no expression provided', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator(undefined);

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('Make command requires class name or DOM element expression');
    });
  });

  describe('parseInput - Class instances', () => {
    it('should parse class name', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('URL');

      const input = await command.parseInput(
        { args: [{ type: 'string', value: 'URL' }], modifiers: {} },
        evaluator,
        context
      );

      expect(input.expression).toBe('URL');
      expect(input.constructorArgs).toEqual([]);
    });

    it('should parse with from modifier for constructor args', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('/path/');

      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: 'URL' }],
          modifiers: {
            from: { type: 'string', value: '/path/' } as any,
          },
        },
        evaluator,
        context
      );

      expect(input.constructorArgs).toEqual(['/path/']);
    });
  });

  describe('execute - DOM creation', () => {
    it('should create simple div element', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: '<div/>',
      };

      const result = await command.execute(input, context);

      expect(result).toBeInstanceOf(HTMLDivElement);
      expect((result as HTMLElement).tagName).toBe('DIV');
    });

    it('should create element with id', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: '<div#myid/>',
      };

      const result = await command.execute(input, context);

      expect((result as HTMLElement).id).toBe('myid');
    });

    it('should create element with classes', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: '<div.class1.class2/>',
      };

      const result = await command.execute(input, context);

      const el = result as HTMLElement;
      expect(el.classList.contains('class1')).toBe(true);
      expect(el.classList.contains('class2')).toBe(true);
    });

    it('should create element with id and classes', async () => {
      const context = createMockContext();
      const input = {
        article: 'an' as const,
        expression: '<span#test.foo.bar/>',
      };

      const result = await command.execute(input, context);

      const el = result as HTMLElement;
      expect(el.tagName).toBe('SPAN');
      expect(el.id).toBe('test');
      expect(el.classList.contains('foo')).toBe(true);
      expect(el.classList.contains('bar')).toBe(true);
    });

    it('should create element from open/close HTML literal with text', async () => {
      const context = createMockContext();
      const result = await command.execute(
        { article: 'a' as const, expression: '<div>created element</div>' },
        context
      );

      const el = result as HTMLElement;
      expect(el.tagName).toBe('DIV');
      expect(el.textContent).toBe('created element');
    });

    it('should create nested open/close element with attributes', async () => {
      const context = createMockContext();
      const result = await command.execute(
        { article: 'a' as const, expression: "<li class='item'><span>1</span></li>" },
        context
      );

      const el = result as HTMLElement;
      expect(el.tagName).toBe('LI');
      expect(el.classList.contains('item')).toBe(true);
      expect(el.querySelector('span')?.textContent).toBe('1');
    });

    it('should set context.it to created element', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: '<div/>',
      };

      const result = await command.execute(input, context);

      expect(context.it).toBe(result);
    });

    it('should assign to variable if variableName provided', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: '<div#myDiv/>',
        variableName: 'myElement',
      };

      const result = await command.execute(input, context);

      expect(context.locals?.get('myElement')).toBe(result);
    });
  });

  describe('execute - Class instantiation', () => {
    it('should create URL instance', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: 'URL',
        constructorArgs: ['https://example.com'],
      };

      const result = await command.execute(input, context);

      expect(result).toBeInstanceOf(URL);
      expect((result as URL).href).toBe('https://example.com/');
    });

    it('should create Date instance', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: 'Date',
        constructorArgs: [],
      };

      const result = await command.execute(input, context);

      expect(result).toBeInstanceOf(Date);
    });

    it('should throw if constructor not found', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: 'NonExistentClass',
        constructorArgs: [],
      };

      await expect(command.execute(input, context)).rejects.toThrow(
        "Constructor 'NonExistentClass' not found"
      );
    });

    it('should set context.it to created instance', async () => {
      const context = createMockContext();
      const input = {
        article: 'a' as const,
        expression: 'Date',
        constructorArgs: [],
      };

      const result = await command.execute(input, context);

      expect(context.it).toBe(result);
    });
  });

  describe('integration', () => {
    it('should parse and execute DOM creation end-to-end', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator('<button#submitBtn.primary/>');

      // Parse
      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: '<button#submitBtn.primary/>' }],
          modifiers: { called: { type: 'symbol', name: 'btn' } as any },
        },
        evaluator,
        context
      );

      // Execute
      const result = await command.execute(input, context);

      const el = result as HTMLElement;
      expect(el.tagName).toBe('BUTTON');
      expect(el.id).toBe('submitBtn');
      expect(el.classList.contains('primary')).toBe(true);
      expect(context.it).toBe(result);
      expect(context.locals?.get('btn')).toBe(result);
    });

    it('should parse and execute class creation end-to-end', async () => {
      const context = createMockContext();
      let callCount = 0;
      const valuesToReturn = ['URL', 'https://example.com/page'];
      const evaluator = {
        evaluate: async () => valuesToReturn[callCount++],
      } as unknown as import('../../../core/expression-evaluator').ExpressionEvaluator;

      // Parse
      const input = await command.parseInput(
        {
          args: [{ type: 'string', value: 'URL' }],
          modifiers: {
            from: { type: 'string', value: 'https://example.com/page' } as any,
          },
        },
        evaluator,
        context
      );

      // Execute
      const result = await command.execute(input, context);

      expect(result).toBeInstanceOf(URL);
      expect((result as URL).pathname).toBe('/page');
      expect(context.it).toBe(result);
    });
  });

  // These go through the REAL parser + runtime (evalHyperScript), which the
  // unit tests above bypass. They guard the integration gap that previously
  // left `make <element-literal>` broken end-to-end: the parser files the
  // element under modifiers.a (not args[0]) and the literal must be created,
  // not querySelector-ed.
  describe('integration (parser → runtime)', () => {
    it('creates a self-closing element with id + classes', async () => {
      const el = (await evalHyperScript('make a <div#created.box.big/>')) as HTMLElement;
      expect(el.tagName).toBe('DIV');
      expect(el.id).toBe('created');
      expect(el.classList.contains('box')).toBe(true);
      expect(el.classList.contains('big')).toBe(true);
    });

    it('creates an open/close element with text content', async () => {
      const el = (await evalHyperScript('make a <div>created element</div>')) as HTMLElement;
      expect(el.tagName).toBe('DIV');
      expect(el.textContent).toBe('created element');
    });

    it('binds the created element to `it` for a following command', async () => {
      document.body.innerHTML = '<div id="make-out"></div>';
      await evalHyperScript('make a <div>created element</div> then put it into #make-out');
      expect(document.getElementById('make-out')?.textContent).toContain('created element');
    });

    it('binds the created element to a `called` variable', async () => {
      document.body.innerHTML = '<div id="make-out2"></div>';
      await evalHyperScript('make a <b#bold/> called madeEl then put madeEl into #make-out2');
      const child = document.getElementById('make-out2')?.firstElementChild as HTMLElement | null;
      expect(child?.tagName).toBe('B');
      expect(child?.id).toBe('bold');
    });
  });

  describe('interpolation (`{expr}` in element literals)', () => {
    it('interpolates an inline expression', async () => {
      const el = (await evalHyperScript('make a <span>item {2 * 3}</span>')) as HTMLElement;
      expect(el.textContent).toBe('item 6');
    });

    it('interpolates a local variable bound earlier in the script', async () => {
      const el = (await evalHyperScript(
        'set n to 5 then make a <div>Article #{n}</div>'
      )) as HTMLElement;
      // `#` is literal text; `{n}` is interpolated → "#5".
      expect(el.textContent).toBe('Article #5');
    });

    it('HTML-escapes interpolated values (no markup injection)', async () => {
      const el = (await evalHyperScript("make a <span>{'<b>hi</b>'}</span>")) as HTMLElement;
      // The value is escaped, so no nested <b> element is created.
      expect(el.querySelector('b')).toBeNull();
      expect(el.textContent).toBe('<b>hi</b>');
    });

    it('leaves non-expression braces untouched', async () => {
      const el = (await evalHyperScript(
        'make a <span>a {definitely not valid !} b</span>'
      )) as HTMLElement;
      expect(el.textContent).toBe('a {definitely not valid !} b');
    });
  });
});
