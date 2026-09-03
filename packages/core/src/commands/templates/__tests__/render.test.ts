/**
 * Unit Tests for RenderCommand (Standalone V2)
 *
 * Tests template rendering with @if, @else, @repeat directives,
 * ${variable} interpolation with HTML escaping, and DOM element creation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RenderCommand } from '../render';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ========== Test Utilities ==========

function createMockContext(
  overrides: Partial<ExecutionContext> = {}
): ExecutionContext & TypedExecutionContext {
  const meElement = document.createElement('div');
  return {
    me: meElement,
    you: undefined,
    it: undefined,
    result: undefined,
    locals: new Map(),
    globals: new Map(),
    target: meElement,
    detail: undefined,
    ...overrides,
  } as unknown as ExecutionContext & TypedExecutionContext;
}

function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: async (node: ASTNode, _context: ExecutionContext) => {
      if (typeof node === 'object' && node !== null && 'value' in node) {
        return (node as any).value;
      }
      if (typeof node === 'object' && node !== null && 'name' in node) {
        return (node as any).name;
      }
      return node;
    },
  } as unknown as ExpressionEvaluator;
}

function astValue(value: unknown): ASTNode {
  return { type: 'literal', value } as unknown as ASTNode;
}

// ========== Tests ==========

describe('RenderCommand (Standalone V2)', () => {
  let command: RenderCommand;
  let context: ExecutionContext & TypedExecutionContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    command = new RenderCommand();
    context = createMockContext();
    evaluator = createMockEvaluator();
  });

  // ============================================================
  // 1. metadata
  // ============================================================
  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('render');
    });

    it('should have description containing template or render', () => {
      const desc = command.metadata.description.toLowerCase();
      expect(desc.includes('template') || desc.includes('render')).toBe(true);
    });

    it('should have syntax examples', () => {
      expect(command.metadata.syntax).toBeInstanceOf(Array);
      expect(command.metadata.syntax.length).toBeGreaterThan(0);
    });

    it('should have correct side effects', () => {
      expect(command.metadata.sideEffects).toContain('dom-creation');
      expect(command.metadata.sideEffects).toContain('template-execution');
    });
  });

  // ============================================================
  // 2. parseInput
  // ============================================================
  describe('parseInput', () => {
    it('should throw when no arguments provided', async () => {
      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow('render command requires a template');
    });

    it('should parse template from first argument', async () => {
      const input = await command.parseInput(
        { args: [astValue('<p>Hello</p>')], modifiers: {} },
        evaluator,
        context
      );

      expect(input.template).toBe('<p>Hello</p>');
      expect(input.variables).toBeUndefined();
    });

    // The positional `[template, with, vars]` shape is gone: `with` is the
    // declared grammar's marker and arrives as `modifiers.with` (Arc 3 step 4).

    it('should parse variables from "with" modifier', async () => {
      const vars = { greeting: 'Hello' };
      const input = await command.parseInput(
        {
          args: [astValue('<p>${greeting}</p>')],
          modifiers: { with: astValue(vars) as any },
        },
        evaluator,
        context
      );

      expect(input.template).toBe('<p>${greeting}</p>');
      expect(input.variables).toEqual({ greeting: 'Hello' });
    });
  });

  // ============================================================
  // 3. execute - template extraction
  // ============================================================
  describe('execute - template extraction', () => {
    it('should extract content from a string template', async () => {
      const result = await command.execute({ template: '<span>Hello World</span>' }, context);

      expect(result.rendered).toBe('<span>Hello World</span>');
      expect(result.element).not.toBeNull();
    });

    it('should extract content from <template> tags in a string', async () => {
      const result = await command.execute(
        { template: '<template><div>Inner Content</div></template>' },
        context
      );

      expect(result.rendered).toBe('<div>Inner Content</div>');
    });

    it('should throw for invalid template format', async () => {
      await expect(command.execute({ template: 12345 }, context)).rejects.toThrow(
        'Invalid template format'
      );
    });
  });

  // ============================================================
  // 4. execute - variable interpolation
  // ============================================================
  describe('execute - variable interpolation', () => {
    it('should interpolate ${variable} from context locals', async () => {
      const ctx = createMockContext();
      ctx.locals.set('name', 'Bob');

      const result = await command.execute({ template: '<p>Hello ${name}</p>' }, ctx);

      expect(result.rendered).toBe('<p>Hello Bob</p>');
    });

    it('should HTML escape interpolated values by default', async () => {
      const ctx = createMockContext();
      ctx.locals.set('xss', '<script>alert("xss")</script>');

      const result = await command.execute({ template: '<p>${xss}</p>' }, ctx);

      expect(result.rendered).not.toContain('<script>');
      expect(result.rendered).toContain('&lt;script&gt;');
    });

    it('should support ${unescaped varname} for raw HTML output', async () => {
      const ctx = createMockContext();
      ctx.locals.set('html', '<strong>Bold</strong>');

      const result = await command.execute({ template: '<div>${unescaped html}</div>' }, ctx);

      expect(result.rendered).toContain('<strong>Bold</strong>');
    });
  });

  // ============================================================
  // 5. execute - @if directive
  // ============================================================
  describe('execute - @if directive', () => {
    it('should render content when condition is true', async () => {
      const ctx = createMockContext();
      ctx.locals.set('show', true);

      const template = ['@if show', '<p>Visible</p>', '@end'].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).toContain('<p>Visible</p>');
      expect(result.directivesProcessed).toContain('@if');
    });

    it('should skip content when condition is false', async () => {
      const ctx = createMockContext();
      ctx.locals.set('show', false);

      const template = ['@if show', '<p>Invisible</p>', '@end'].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).not.toContain('<p>Invisible</p>');
    });

    it('should handle @else block', async () => {
      const ctx = createMockContext();
      ctx.locals.set('loggedIn', false);

      const template = [
        '@if loggedIn',
        '<p>Welcome back</p>',
        '@else',
        '<p>Please log in</p>',
        '@end',
      ].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).not.toContain('Welcome back');
      expect(result.rendered).toContain('<p>Please log in</p>');
      expect(result.directivesProcessed).toContain('@if');
      expect(result.directivesProcessed).toContain('@else');
    });
  });

  // ============================================================
  // 6. execute - @repeat directive
  // ============================================================
  describe('execute - @repeat directive', () => {
    it('should iterate over an array collection', async () => {
      const ctx = createMockContext();
      ctx.locals.set('items', ['Apple', 'Banana', 'Cherry']);

      const template = ['@repeat in items', '<li>${it}</li>', '@end'].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).toContain('<li>Apple</li>');
      expect(result.rendered).toContain('<li>Banana</li>');
      expect(result.rendered).toContain('<li>Cherry</li>');
      expect(result.directivesProcessed).toContain('@repeat');
    });

    it('should set "it" to the current iteration item', async () => {
      const ctx = createMockContext();
      ctx.locals.set('nums', [10, 20]);

      const template = ['@repeat in nums', '<span>${it}</span>', '@end'].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).toContain('<span>10</span>');
      expect(result.rendered).toContain('<span>20</span>');
    });
  });

  // ============================================================
  // 7. execute - DOM output
  // ============================================================
  describe('execute - DOM output', () => {
    it('should create a DOM element from rendered HTML', async () => {
      const result = await command.execute({ template: '<p>Created element</p>' }, context);

      expect(result.element).not.toBeNull();
      expect(result.element!.tagName).toBe('P');
      expect(result.element!.textContent).toBe('Created element');
    });

    it('should set context.it to the created element', async () => {
      const ctx = createMockContext();

      const result = await command.execute({ template: '<span>Result</span>' }, ctx);

      expect(ctx.it).toBe(result.element);
    });

    it('should return rendered HTML string', async () => {
      const result = await command.execute({ template: '<b>Bold text</b>' }, context);

      expect(result.rendered).toBe('<b>Bold text</b>');
      expect(typeof result.rendered).toBe('string');
    });
  });

  // ============================================================
  // 8. integration
  // ============================================================
  describe('integration', () => {
    it('should render a simple template with variables end-to-end', async () => {
      const ctx = createMockContext();
      ctx.locals.set('title', 'Hello');
      ctx.locals.set('message', 'Welcome');

      const template = '<h1>${title}</h1>\n<p>${message}</p>';
      const result = await command.execute({ template }, ctx);

      expect(result.rendered).toBe('<h1>Hello</h1>\n<p>Welcome</p>');
      expect(result.element).not.toBeNull();
      expect(ctx.it).toBe(result.element);
    });

    it('should render template with @if and @repeat directives end-to-end', async () => {
      const ctx = createMockContext();
      ctx.locals.set('showHeader', true);
      ctx.locals.set('fruits', ['Apple', 'Banana']);

      // @if and @repeat as sibling directives at the same level
      // (nested directives are tracked in their own inner scope)
      const template = [
        '@if showHeader',
        '<h2>Fruit List</h2>',
        '@end',
        '<ul>',
        '@repeat in fruits',
        '<li>${it}</li>',
        '@end',
        '</ul>',
      ].join('\n');

      const result = await command.execute({ template }, ctx);

      expect(result.rendered).toContain('<h2>Fruit List</h2>');
      expect(result.rendered).toContain('<li>Apple</li>');
      expect(result.rendered).toContain('<li>Banana</li>');
      expect(result.rendered).toContain('</ul>');
      expect(result.directivesProcessed).toContain('@if');
      expect(result.directivesProcessed).toContain('@repeat');
      expect(result.element).not.toBeNull();
    });
  });
});
