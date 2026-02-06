/**
 * Event Handler Transform Tests
 *
 * Tests for EventHandlerCodegen which generates complete event handler code
 * including handler functions, binding code, cleanup, and import collection.
 */

import { describe, it, expect } from 'vitest';
import {
  EventHandlerCodegen,
  generateEventHandler,
  generateBindings,
  generateInitialization,
} from './event-transforms.js';
import { ExpressionCodegen } from './expression-transforms.js';
import type {
  ASTNode,
  EventHandlerNode,
  CodegenContext,
  AnalysisResult,
  CodegenOptions,
} from '../types/aot-types.js';

// =============================================================================
// HELPERS
// =============================================================================

function createMockContext(overrides: Partial<CodegenContext> = {}): CodegenContext {
  const requiredHelpers = new Set<string>();

  const ctx: CodegenContext = {
    handlerId: 'test_1',
    generateId: (prefix = '_id') => `${prefix}_0`,
    generateExpression: null as unknown as (node: ASTNode) => string,
    implicitTarget: '_ctx.me',
    localVarDeclarations: '',
    canCacheSelector: () => false,
    getCachedSelector: sel => `document.querySelector('${sel}')`,
    requireHelper: name => {
      requiredHelpers.add(name);
    },
    requiredHelpers,
    analysis: {} as AnalysisResult,
    options: {} as CodegenOptions,
    ...overrides,
  };

  const exprCodegen = new ExpressionCodegen(ctx);
  ctx.generateExpression = (node: ASTNode) => exprCodegen.generate(node);

  return ctx;
}

function createAnalysis(overrides: Partial<AnalysisResult['controlFlow']> = {}): AnalysisResult {
  return {
    commandsUsed: new Set<string>(),
    variables: {
      locals: new Map(),
      globals: new Map(),
      contextVars: new Set(),
    },
    expressions: {
      pure: [],
      dynamic: [],
      selectors: [],
    },
    controlFlow: {
      hasAsync: false,
      hasLoops: false,
      hasConditionals: false,
      canThrow: false,
      maxNestingDepth: 0,
      ...overrides,
    },
    dependencies: {
      domQueries: [],
      eventTypes: [],
      behaviors: [],
      runtimeHelpers: [],
    },
    warnings: [],
  };
}

function makeEventNode(overrides: Partial<EventHandlerNode> = {}): EventHandlerNode {
  return {
    type: 'event',
    event: 'click',
    body: [{ type: 'command', name: 'toggle', args: [{ type: 'selector', value: '.active' }] }],
    ...overrides,
  };
}

// =============================================================================
// HANDLER FUNCTION GENERATION
// =============================================================================

describe('EventHandlerCodegen', () => {
  describe('handler function generation', () => {
    it('generates function with correct handler name', () => {
      const ctx = createMockContext({ handlerId: 'click_toggle_a1' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).toContain('function _handler_click_toggle_a1(_event)');
    });

    it('includes context initialization', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).toContain('const _ctx = _rt.createContext(_event, this)');
    });

    it('generates async function when hasAsync', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis({ hasAsync: true }));
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).toMatch(/^async function/);
      expect(result.async).toBe(true);
    });

    it('generates sync function when not hasAsync', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis({ hasAsync: false }));
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).toMatch(/^function /);
      expect(result.async).toBe(false);
    });

    it('wraps in try-catch when canThrow', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis({ canThrow: true }));
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).toContain('try {');
      expect(result.handlerCode).toContain('catch (_e)');
      expect(result.handlerCode).toContain('_rt.HALT');
      expect(result.handlerCode).toContain('_rt.EXIT');
    });

    it('no try-catch when canThrow is false', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis({ canThrow: false }));
      const result = codegen.generate(makeEventNode());

      expect(result.handlerCode).not.toContain('try {');
      expect(result.handlerCode).not.toContain('catch');
    });
  });

  // ===========================================================================
  // MODIFIER CODE GENERATION
  // ===========================================================================

  describe('modifier code generation', () => {
    it('generates preventDefault for prevent modifier', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { prevent: true } }));

      expect(result.handlerCode).toContain('_event.preventDefault()');
    });

    it('generates stopPropagation for stop modifier', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { stop: true } }));

      expect(result.handlerCode).toContain('_event.stopPropagation()');
    });

    it('generates both prevent and stop together', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { prevent: true, stop: true } }));

      expect(result.handlerCode).toContain('_event.preventDefault()');
      expect(result.handlerCode).toContain('_event.stopPropagation()');
    });

    it('includes once in listener options', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { once: true } }));

      expect(result.bindingCode).toContain('once: true');
    });

    it('includes passive in listener options', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { passive: true } }));

      expect(result.bindingCode).toContain('passive: true');
    });

    it('includes capture in listener options', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { capture: true } }));

      expect(result.bindingCode).toContain('capture: true');
    });
  });

  // ===========================================================================
  // BINDING CODE GENERATION
  // ===========================================================================

  describe('binding code generation', () => {
    it('generates basic addEventListener', () => {
      const ctx = createMockContext({ handlerId: 'h1' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ event: 'click' }));

      expect(result.bindingCode).toContain('addEventListener("click"');
      expect(result.bindingCode).toContain('_handler_h1');
    });

    it('wraps with debounce when modifier present', () => {
      const ctx = createMockContext({ handlerId: 'h2' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { debounce: 300 } }));

      expect(result.bindingCode).toContain('_rt.debounce(_handler_h2, 300)');
      expect(ctx.requiredHelpers.has('debounce')).toBe(true);
    });

    it('wraps with throttle when modifier present', () => {
      const ctx = createMockContext({ handlerId: 'h3' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { throttle: 500 } }));

      expect(result.bindingCode).toContain('_rt.throttle(_handler_h3, 500)');
      expect(ctx.requiredHelpers.has('throttle')).toBe(true);
    });

    it('uses delegate for from modifier', () => {
      const ctx = createMockContext({ handlerId: 'h4' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { from: '.item' } }));

      expect(result.bindingCode).toContain('_rt.delegate(_el');
      expect(result.bindingCode).toContain('".item"');
      expect(ctx.requiredHelpers.has('delegate')).toBe(true);
    });

    it('uses correct event name for non-click events', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ event: 'mouseover' }));

      expect(result.bindingCode).toContain('"mouseover"');
    });
  });

  // ===========================================================================
  // CLEANUP CODE GENERATION
  // ===========================================================================

  describe('cleanup code generation', () => {
    it('returns null for once handlers', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { once: true } }));

      expect(result.cleanup).toBeNull();
    });

    it('returns removeEventListener for regular handlers', () => {
      const ctx = createMockContext({ handlerId: 'h5' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ event: 'click' }));

      expect(result.cleanup).toContain('removeEventListener');
      expect(result.cleanup).toContain('"click"');
      expect(result.cleanup).toContain('_handler_h5');
    });

    it('includes capture flag in cleanup when capture modifier used', () => {
      const ctx = createMockContext({ handlerId: 'h6' });
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode({ modifiers: { capture: true } }));

      expect(result.cleanup).toContain(', true');
    });
  });

  // ===========================================================================
  // IMPORT COLLECTION
  // ===========================================================================

  describe('import collection', () => {
    it('always includes createContext', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(makeEventNode());

      expect(result.imports).toContain('createContext');
    });

    it('includes debounce and throttle when used', () => {
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, createAnalysis());
      const result = codegen.generate(
        makeEventNode({ modifiers: { debounce: 100, throttle: 200 } })
      );

      expect(result.imports).toContain('debounce');
      expect(result.imports).toContain('throttle');
    });

    it('includes runtime helpers from analysis', () => {
      const analysis = createAnalysis();
      analysis.dependencies.runtimeHelpers = ['globals', 'wait'];
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, analysis);
      const result = codegen.generate(makeEventNode());

      expect(result.imports).toContain('globals');
      expect(result.imports).toContain('wait');
    });

    it('deduplicates imports', () => {
      const analysis = createAnalysis();
      analysis.dependencies.runtimeHelpers = ['createContext'];
      const ctx = createMockContext();
      const codegen = new EventHandlerCodegen(ctx, analysis);
      const result = codegen.generate(makeEventNode());

      const createContextCount = result.imports.filter(i => i === 'createContext').length;
      expect(createContextCount).toBe(1);
    });
  });
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

describe('generateEventHandler()', () => {
  it('delegates to EventHandlerCodegen', () => {
    const ctx = createMockContext({ handlerId: 'conv_1' });
    const analysis = createAnalysis();
    const node = makeEventNode();

    const result = generateEventHandler(node, ctx, analysis);

    expect(result.handlerCode).toContain('_handler_conv_1');
    expect(result.imports).toContain('createContext');
  });
});

describe('generateBindings()', () => {
  it('generates querySelectorAll + forEach + addEventListener', () => {
    const code = generateBindings([{ selector: '#btn', eventName: 'click', handlerId: 'h1' }]);

    expect(code).toContain("querySelectorAll('#btn')");
    expect(code).toContain('forEach');
    expect(code).toContain('addEventListener("click", _handler_h1)');
  });

  it('includes options when provided', () => {
    const code = generateBindings([
      { selector: '.item', eventName: 'click', handlerId: 'h2', options: { once: true } },
    ]);

    expect(code).toContain('once: true');
  });

  it('generates multiple bindings', () => {
    const code = generateBindings([
      { selector: '#a', eventName: 'click', handlerId: 'h1' },
      { selector: '#b', eventName: 'mouseover', handlerId: 'h2' },
    ]);

    expect(code).toContain('_handler_h1');
    expect(code).toContain('_handler_h2');
    expect(code).toContain('"click"');
    expect(code).toContain('"mouseover"');
  });
});

describe('generateInitialization()', () => {
  it('wraps bindings in _rt.ready()', () => {
    const code = generateInitialization([
      { selector: '#btn', eventName: 'click', handlerId: 'h1' },
    ]);

    expect(code).toContain('_rt.ready(');
    expect(code).toContain('addEventListener("click", _handler_h1)');
  });
});
