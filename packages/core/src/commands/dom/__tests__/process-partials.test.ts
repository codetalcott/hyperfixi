/**
 * Unit Tests for ProcessPartialsCommand (Decorated)
 *
 * Tests multi-target swaps from <hx-partial> elements including:
 * - Metadata validation
 * - parseInput keyword extraction and content resolution
 * - extractPartials HTML parsing
 * - processPartials orchestration and swap execution
 * - execute lifecycle (context.it, event dispatch, error warnings)
 * - End-to-end integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProcessPartialsCommand, extractPartials, processPartials } from '../process-partials';
import type { ExecutionContext, TypedExecutionContext } from '../../../types/core';
import type { ASTNode } from '../../../types/base-types';
import type { ExpressionEvaluator } from '../../../core/expression-evaluator';

// ============================================================================
// Mocks
// ============================================================================

// Mock morph adapter
vi.mock('../../../lib/morph-adapter', () => ({
  morphAdapter: {
    morphInner: vi.fn((target: HTMLElement, content: string) => {
      target.innerHTML = content;
    }),
    morph: vi.fn((target: HTMLElement, content: string) => {
      target.outerHTML = content;
    }),
  },
}));

// Mock view transitions
vi.mock('../../../lib/view-transitions', () => ({
  withViewTransition: vi.fn(async (fn: Function) => fn()),
  isViewTransitionsSupported: vi.fn().mockReturnValue(false),
}));

// Mock validation (avoid complex dependencies)
vi.mock('../../../validation/partial-validator', () => ({
  validatePartialContent: vi.fn().mockReturnValue({ totalIssues: 0, issues: [] }),
  getPartialValidationConfig: vi.fn().mockReturnValue({ enabled: false, showWarnings: false }),
}));

vi.mock('../../../validation/partial-warning-formatter', () => ({
  emitPartialValidationWarnings: vi.fn(),
  formatIssuesAsStrings: vi.fn().mockReturnValue([]),
}));

// ============================================================================
// Test Utilities
// ============================================================================

function createMockContext(): ExecutionContext & TypedExecutionContext {
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

/** Helper to build AST arg nodes for keyword strings */
function kwArg(keyword: string): ASTNode {
  return { type: 'identifier', name: keyword } as unknown as ASTNode;
}

/** Helper to build AST arg nodes for literal values */
function litArg<T>(value: T): ASTNode {
  return { type: 'literal', value } as unknown as ASTNode;
}

// ============================================================================
// Tests
// ============================================================================

describe('ProcessPartialsCommand (Decorated)', () => {
  let command: ProcessPartialsCommand;
  let testElements: HTMLElement[];

  beforeEach(() => {
    command = new ProcessPartialsCommand();
    testElements = [];
  });

  afterEach(() => {
    for (const el of testElements) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
    testElements = [];
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Metadata
  // --------------------------------------------------------------------------

  describe('metadata', () => {
    it('should have correct command name', () => {
      expect(command.name).toBe('process');
    });

    it('should have description containing "partial"', () => {
      expect(command.metadata).toBeDefined();
      expect(command.metadata.description.toLowerCase()).toContain('partial');
    });

    it('should have syntax examples', () => {
      const syntax = command.metadata.syntax;
      const syntaxArray = Array.isArray(syntax) ? syntax : [syntax];
      expect(syntaxArray.length).toBeGreaterThan(0);
      expect(syntaxArray.some(s => s.includes('process partials'))).toBe(true);
    });

    it('should have dom-mutation side effect', () => {
      expect(command.metadata.sideEffects).toContain('dom-mutation');
    });
  });

  // --------------------------------------------------------------------------
  // 2. parseInput
  // --------------------------------------------------------------------------

  describe('parseInput', () => {
    it('should throw on empty args', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      await expect(
        command.parseInput({ args: [], modifiers: {} }, evaluator, context)
      ).rejects.toThrow(/requires.*content.*argument/i);
    });

    it('should throw without "partials" keyword', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // args: ['in', '<div>hello</div>']  — missing 'partials'
      await expect(
        command.parseInput(
          {
            args: [kwArg('in'), litArg('<div>hello</div>')],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow(/partials/i);
    });

    it('should throw without "in" keyword', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();

      // args: ['partials', '<div>hello</div>']  — missing 'in'
      await expect(
        command.parseInput(
          {
            args: [kwArg('partials'), litArg('<div>hello</div>')],
            modifiers: {},
          },
          evaluator,
          context
        )
      ).rejects.toThrow(/in/i);
    });

    it('should parse HTML string content after "in"', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const htmlContent = '<hx-partial target="#box"><p>Updated</p></hx-partial>';

      const input = await command.parseInput(
        {
          args: [kwArg('partials'), kwArg('in'), litArg(htmlContent)],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.html).toBe(htmlContent);
      expect(input.useViewTransition).toBe(false);
      expect(input.morphOptions).toEqual({ preserveChanges: true });
    });

    it('should detect "using view transition" keywords', async () => {
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const htmlContent = '<hx-partial target="#t"><b>hi</b></hx-partial>';

      const input = await command.parseInput(
        {
          args: [
            kwArg('partials'),
            kwArg('in'),
            litArg(htmlContent),
            kwArg('using'),
            kwArg('view'),
            kwArg('transition'),
          ],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.useViewTransition).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. extractPartials (exported function)
  // --------------------------------------------------------------------------

  describe('extractPartials', () => {
    it('should extract partials from HTML with hx-partial elements', () => {
      const html = `
        <hx-partial target="#header"><h1>New Header</h1></hx-partial>
        <hx-partial target="#footer"><footer>New Footer</footer></hx-partial>
      `;

      const partials = extractPartials(html);

      expect(partials).toHaveLength(2);
    });

    it('should read target attribute from each hx-partial', () => {
      const html = '<hx-partial target="#sidebar"><nav>Nav</nav></hx-partial>';
      const partials = extractPartials(html);

      expect(partials).toHaveLength(1);
      expect(partials[0].target).toBe('#sidebar');
    });

    it('should read strategy attribute and default to "morph"', () => {
      const htmlWithStrategy = '<hx-partial target="#a" strategy="innerHTML"><p>A</p></hx-partial>';
      const htmlDefault = '<hx-partial target="#b"><p>B</p></hx-partial>';

      const withStrategy = extractPartials(htmlWithStrategy);
      const withDefault = extractPartials(htmlDefault);

      expect(withStrategy[0].strategy).toBe('innerHTML');
      expect(withDefault[0].strategy).toBe('morph');
    });

    it('should extract innerHTML as content', () => {
      const html = '<hx-partial target="#main"><div class="content">Hello</div></hx-partial>';
      const partials = extractPartials(html);

      expect(partials[0].content).toBe('<div class="content">Hello</div>');
    });

    it('should skip elements without target attribute', () => {
      // Missing-target elements are skipped silently in production
      // (debug.command logging only fires when hyperfixi:debug is enabled).
      // See process-partials.ts:94.
      const html = `
        <hx-partial><p>No target</p></hx-partial>
        <hx-partial target="#valid"><p>Has target</p></hx-partial>
      `;

      const partials = extractPartials(html);

      expect(partials).toHaveLength(1);
      expect(partials[0].target).toBe('#valid');
    });
  });

  // --------------------------------------------------------------------------
  // 4. processPartials (exported function)
  // --------------------------------------------------------------------------

  describe('processPartials', () => {
    it('should process partials and swap content into DOM targets', () => {
      const target = document.createElement('div');
      target.id = 'swap-target';
      target.innerHTML = '<p>Old content</p>';
      document.body.appendChild(target);
      testElements.push(target);

      const html =
        '<hx-partial target="#swap-target" strategy="innerHTML"><p>New content</p></hx-partial>';

      const result = processPartials(html);

      expect(target.innerHTML).toBe('<p>New content</p>');
      expect(result.count).toBe(1);
    });

    it('should count successful swaps', () => {
      const el1 = document.createElement('div');
      el1.id = 'count-a';
      const el2 = document.createElement('div');
      el2.id = 'count-b';
      document.body.appendChild(el1);
      document.body.appendChild(el2);
      testElements.push(el1, el2);

      const html = `
        <hx-partial target="#count-a" strategy="innerHTML"><span>A</span></hx-partial>
        <hx-partial target="#count-b" strategy="innerHTML"><span>B</span></hx-partial>
      `;

      const result = processPartials(html);

      expect(result.count).toBe(2);
    });

    it('should report errors for missing targets', () => {
      const html =
        '<hx-partial target="#nonexistent" strategy="innerHTML"><p>Ghost</p></hx-partial>';

      const result = processPartials(html);

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('#nonexistent');
      expect(result.errors[0]).toContain('not found');
    });

    it('should return targets array with selectors of successful swaps', () => {
      const el = document.createElement('div');
      el.id = 'targets-test';
      document.body.appendChild(el);
      testElements.push(el);

      const html =
        '<hx-partial target="#targets-test" strategy="innerHTML"><em>Done</em></hx-partial>';

      const result = processPartials(html);

      expect(result.targets).toContain('#targets-test');
    });
  });

  // --------------------------------------------------------------------------
  // 5. execute
  // --------------------------------------------------------------------------

  describe('execute', () => {
    it('should call processPartials and return result', async () => {
      const el = document.createElement('div');
      el.id = 'exec-target';
      document.body.appendChild(el);
      testElements.push(el);

      const context = createMockContext();
      const html =
        '<hx-partial target="#exec-target" strategy="innerHTML"><p>Executed</p></hx-partial>';

      const result = await command.execute(
        { html, useViewTransition: false, morphOptions: { preserveChanges: true } },
        context
      );

      expect(result.count).toBe(1);
      expect(result.targets).toContain('#exec-target');
    });

    it('should set context.it to the result', async () => {
      const el = document.createElement('div');
      el.id = 'ctx-it';
      document.body.appendChild(el);
      testElements.push(el);

      const context = createMockContext();
      const html = '<hx-partial target="#ctx-it" strategy="innerHTML"><p>It</p></hx-partial>';

      const result = await command.execute(
        { html, useViewTransition: false, morphOptions: { preserveChanges: true } },
        context
      );

      expect((context as any).it).toBe(result);
      expect((context as any).it.count).toBe(1);
    });

    it('should dispatch lokascript:partials event on window', async () => {
      const el = document.createElement('div');
      el.id = 'event-target';
      document.body.appendChild(el);
      testElements.push(el);

      const context = createMockContext();
      const eventPromise = new Promise<CustomEvent>(resolve => {
        window.addEventListener('lokascript:partials', e => resolve(e as CustomEvent), {
          once: true,
        });
      });

      const html =
        '<hx-partial target="#event-target" strategy="innerHTML"><p>Event</p></hx-partial>';

      await command.execute(
        { html, useViewTransition: false, morphOptions: { preserveChanges: true } },
        context
      );

      const event = await eventPromise;
      expect(event.detail).toBeDefined();
      expect(event.detail.count).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Integration
  // --------------------------------------------------------------------------

  describe('integration', () => {
    it('should work end-to-end with a simple partial swap', async () => {
      const el = document.createElement('section');
      el.id = 'e2e-section';
      el.innerHTML = '<p>Before</p>';
      document.body.appendChild(el);
      testElements.push(el);

      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const htmlContent =
        '<hx-partial target="#e2e-section" strategy="innerHTML"><p>After</p></hx-partial>';

      // parseInput
      const input = await command.parseInput(
        {
          args: [kwArg('partials'), kwArg('in'), litArg(htmlContent)],
          modifiers: {},
        },
        evaluator,
        context
      );

      expect(input.html).toBe(htmlContent);

      // execute
      const result = await command.execute(input, context);

      expect(result.count).toBe(1);
      expect(result.targets).toContain('#e2e-section');
      expect(el.innerHTML).toBe('<p>After</p>');
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for missing target in end-to-end flow', async () => {
      // Missing-target errors surface on result.errors and via the
      // hyperfixi:partials / lokascript:partials event — not console.warn.
      // See process-partials.ts:312-313.
      const context = createMockContext();
      const evaluator = createMockEvaluator();
      const htmlContent =
        '<hx-partial target="#does-not-exist" strategy="innerHTML"><p>Orphan</p></hx-partial>';

      // parseInput
      const input = await command.parseInput(
        {
          args: [kwArg('partials'), kwArg('in'), litArg(htmlContent)],
          modifiers: {},
        },
        evaluator,
        context
      );

      // execute
      const result = await command.execute(input, context);

      expect(result.count).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('#does-not-exist');
      expect(result.errors[0]).toContain('not found');
    });
  });
});
