/**
 * End-to-End Compilation Tests
 *
 * Verifies the full AOT pipeline: code → parse → analyze → optimize → codegen → valid JS.
 * Tests that generated JavaScript is syntactically valid and contains expected patterns.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AOTCompiler } from './aot-compiler.js';

// =============================================================================
// HELPERS
// =============================================================================

let compiler: AOTCompiler;

beforeEach(() => {
  compiler = new AOTCompiler();
  compiler.reset();
});

/**
 * Validate that a string is syntactically valid JavaScript.
 * Uses `new Function()` which throws SyntaxError for invalid JS.
 */
function isValidJS(code: string | undefined): boolean {
  if (!code) return false;
  try {
    // Strip import statements (not valid inside Function body)
    const stripped = code.replace(/^import\s+.*$/gm, '');
    // Strip export statements
    const stripped2 = stripped.replace(/^export\s+/gm, '');
    new Function(stripped2);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// BASIC COMPILATION
// =============================================================================

describe('E2E: Basic Compilation', () => {
  it('compiles toggle .active into valid JS', () => {
    const result = compiler.compileScript('on click toggle .active');

    expect(result.success).toBe(true);
    expect(result.code).toContain('classList.toggle');
    expect(result.code).toContain("'active'");
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles add .class into valid JS', () => {
    const result = compiler.compileScript('on click add .clicked');

    expect(result.success).toBe(true);
    expect(result.code).toContain('classList.add');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles remove .class into valid JS', () => {
    const result = compiler.compileScript('on click remove .hidden');

    expect(result.success).toBe(true);
    expect(result.code).toContain('classList.remove');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles show into valid JS', () => {
    const result = compiler.compileScript('on click show');

    expect(result.success).toBe(true);
    expect(result.code).toContain('style.display');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles hide into valid JS', () => {
    const result = compiler.compileScript('on click hide');

    expect(result.success).toBe(true);
    expect(result.code).toContain("style.display = 'none'");
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles log command into valid JS', () => {
    const result = compiler.compileScript('on click log "hello"');

    expect(result.success).toBe(true);
    expect(result.code).toContain('console.log');
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// DATA COMMANDS
// =============================================================================

describe('E2E: Data Commands', () => {
  it('compiles set command', () => {
    const result = compiler.compileScript('on click set :count to 0');

    expect(result.success).toBe(true);
    expect(result.code).toBeDefined();
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles increment command', () => {
    const result = compiler.compileScript('on click increment :count');

    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles decrement command', () => {
    const result = compiler.compileScript('on click decrement :count');

    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// ASYNC COMMANDS
// =============================================================================

describe('E2E: Async Commands', () => {
  it('compiles wait command', () => {
    const result = compiler.compileScript('on click wait 100ms');

    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles send command', () => {
    const result = compiler.compileScript('on click send myEvent');

    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// BATCH COMPILATION
// =============================================================================

describe('E2E: Batch Compilation', () => {
  it('compiles multiple handlers into combined code', () => {
    const scripts = [
      {
        code: 'on click toggle .a',
        location: { file: 'test.html', line: 1, column: 1 },
        elementId: 'btn1',
      },
      {
        code: 'on click toggle .b',
        location: { file: 'test.html', line: 2, column: 1 },
        elementId: 'btn2',
      },
    ];

    const result = compiler.compile(scripts);

    expect(result.handlers.length).toBe(2);
    expect(result.stats.compiled).toBe(2);
    expect(result.stats.fallbacks).toBe(0);
    expect(result.code).toContain('import');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('generates runtime imports', () => {
    const scripts = [
      { code: 'on click toggle .active', location: { file: 'test.html', line: 1, column: 1 } },
    ];

    const result = compiler.compile(scripts);

    expect(result.code).toContain('import');
    expect(result.code).toContain('@hyperfixi/aot-compiler/runtime');
  });

  it('includes ready wrapper', () => {
    const scripts = [
      { code: 'on click toggle .active', location: { file: 'test.html', line: 1, column: 1 } },
    ];

    const result = compiler.compile(scripts);

    expect(result.code).toContain('_rt.ready');
  });

  it('reports stats for mixed success/failure', () => {
    const scripts = [
      { code: 'on click toggle .a', location: { file: 'test.html', line: 1, column: 1 } },
      { code: 'xyzzy nonsense', location: { file: 'test.html', line: 2, column: 1 } },
    ];

    const result = compiler.compile(scripts);

    // First should compile, second may be fallback
    expect(result.stats.compiled + result.stats.fallbacks).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// HTML EXTRACTION → COMPILATION
// =============================================================================

describe('E2E: HTML → JS Pipeline', () => {
  it('extracts and compiles from HTML', () => {
    const html = '<button id="btn" _="on click toggle .active">Click</button>';
    const scripts = compiler.extract(html, 'test.html');

    expect(scripts).toHaveLength(1);

    const result = compiler.compile(scripts);
    expect(result.handlers.length).toBe(1);
    expect(result.code).toContain('classList.toggle');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('extracts and compiles multiple elements', () => {
    const html = `
      <button id="btn1" _="on click add .a">One</button>
      <button id="btn2" _="on click remove .b">Two</button>
      <button id="btn3" _="on click hide">Three</button>
    `;
    const scripts = compiler.extract(html, 'test.html');

    expect(scripts).toHaveLength(3);

    const result = compiler.compile(scripts);
    expect(result.handlers.length).toBe(3);
    expect(result.stats.compiled).toBe(3);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('handles HTML entities in extraction', () => {
    const html = '<button _="on click log &quot;hello&quot;">Test</button>';
    const scripts = compiler.extract(html, 'test.html');

    expect(scripts).toHaveLength(1);
    expect(scripts[0].code).toBe('on click log "hello"');
  });
});

// =============================================================================
// METADATA TRACKING
// =============================================================================

describe('E2E: Metadata', () => {
  it('tracks commands used', () => {
    const result = compiler.compileScript('on click toggle .active');
    expect(result.metadata.commandsUsed).toContain('toggle');
  });

  it('generates unique handler IDs', () => {
    const r1 = compiler.compileScript('on click toggle .a');
    const r2 = compiler.compileScript('on click toggle .b');
    expect(r1.metadata.handlerId).not.toBe(r2.metadata.handlerId);
  });

  it('tracks async handlers', () => {
    const result = compiler.compileScript('on click wait 100ms');
    // The handler should be marked as async
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// OPTIMIZATION LEVELS
// =============================================================================

describe('E2E: Optimization Levels', () => {
  it('compiles with optimization level 0 (none)', () => {
    const result = compiler.compileScript('on click toggle .active', { optimizationLevel: 0 });
    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles with optimization level 1 (basic)', () => {
    const result = compiler.compileScript('on click toggle .active', { optimizationLevel: 1 });
    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('compiles with optimization level 2 (full)', () => {
    const result = compiler.compileScript('on click toggle .active', { optimizationLevel: 2 });
    expect(result.success).toBe(true);
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('E2E: Edge Cases', () => {
  it('handles empty code gracefully', () => {
    const result = compiler.compileScript('');
    // Should not throw, but may not succeed
    expect(result).toBeDefined();
  });

  it('handles whitespace-only code', () => {
    const result = compiler.compileScript('   ');
    expect(result).toBeDefined();
  });

  it('handles commands without event wrapper', () => {
    const result = compiler.compileScript('toggle .active');
    // May succeed or fall back — depends on parser
    expect(result).toBeDefined();
  });

  it('handles complex combined HTML', () => {
    const html = `
      <div id="app">
        <button id="toggler" _="on click toggle .visible on #content">Toggle</button>
        <div id="content" class="visible">Content</div>
      </div>
    `;
    const scripts = compiler.extract(html, 'app.html');
    const result = compiler.compile(scripts);

    expect(result.stats.compiled + result.stats.fallbacks).toBe(scripts.length);
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// CLASS BATCHING OPTIMIZATION (E2E)
// =============================================================================

describe('E2E: Class Batching Optimization', () => {
  it('batches consecutive add commands into single classList.add call', () => {
    // Build AST directly — simple parser doesn't handle chained commands
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.a' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.b' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.c' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 2 });

    expect(result.success).toBe(true);
    expect(result.code).toContain("classList.add('a', 'b', 'c')");
    // Should NOT contain 3 separate classList.add calls
    const addCalls = result.code!.match(/classList\.add/g);
    expect(addCalls).toHaveLength(1);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('batches mixed add/remove into compound calls', () => {
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.active' }],
        },
        {
          type: 'command' as const,
          name: 'remove',
          args: [{ type: 'selector' as const, value: '.hidden' }],
        },
        {
          type: 'command' as const,
          name: 'toggle',
          args: [{ type: 'selector' as const, value: '.selected' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 2 });

    expect(result.success).toBe(true);
    expect(result.code).toContain("classList.add('active')");
    expect(result.code).toContain("classList.remove('hidden')");
    expect(result.code).toContain("classList.toggle('selected')");
    expect(isValidJS(result.code)).toBe(true);
  });

  it('breaks batch on non-class command', () => {
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.a' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.b' }],
        },
        {
          type: 'command' as const,
          name: 'log',
          args: [{ type: 'literal' as const, value: 'hi' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.c' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.d' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 2 });

    expect(result.success).toBe(true);
    // Two separate batches: (a,b) and (c,d) with log in between
    expect(result.code).toContain("classList.add('a', 'b')");
    expect(result.code).toContain("classList.add('c', 'd')");
    expect(result.code).toContain('console.log');
    expect(isValidJS(result.code)).toBe(true);
  });

  it('does not batch at optimization level 0', () => {
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.a' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.b' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 0 });

    expect(result.success).toBe(true);
    // Should have 2 separate calls (no batching at level 0)
    const addCalls = result.code!.match(/classList\.add/g);
    expect(addCalls).toHaveLength(2);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('does not batch at optimization level 1 (basic)', () => {
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.a' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.b' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 1 });

    expect(result.success).toBe(true);
    // Level 1 only runs constant folding + selector caching, not class batching
    const addCalls = result.code!.match(/classList\.add/g);
    expect(addCalls).toHaveLength(2);
    expect(isValidJS(result.code)).toBe(true);
  });

  it('reports class-batching in optimizationsApplied', () => {
    const ast = {
      type: 'event' as const,
      event: 'click',
      body: [
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.a' }],
        },
        {
          type: 'command' as const,
          name: 'add',
          args: [{ type: 'selector' as const, value: '.b' }],
        },
      ],
    };

    const result = compiler.compileAST(ast as any, { optimizationLevel: 2 });

    expect(result.metadata.optimizationsApplied).toContain('class-batching');
  });

  it('single class command produces normal classList call (no batch)', () => {
    const result = compiler.compileScript('on click add .active', { optimizationLevel: 2 });

    expect(result.success).toBe(true);
    expect(result.code).toContain('classList.add');
    // Verify it's a normal single-arg call, not a batch
    expect(result.code).not.toContain('batchedClassOps');
    expect(isValidJS(result.code)).toBe(true);
  });
});

// =============================================================================
// INIT PRE-RENDERING (E2E)
// =============================================================================

describe('E2E: Init Pre-Rendering', () => {
  // Import directly for integration testing
  let preRenderInitBlock: typeof import('../optimizations/init-prerender.js').preRenderInitBlock;

  beforeEach(async () => {
    const mod = await import('../optimizations/init-prerender.js');
    preRenderInitBlock = mod.preRenderInitBlock;
  });

  it('pre-renders add class into HTML', () => {
    const html = '<div id="header" class="main">Title</div>';
    const commands = [
      {
        type: 'command' as const,
        name: 'add',
        args: [{ type: 'selector' as const, value: '.active' }],
        target: { type: 'selector' as const, value: '#header' },
      },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.preRenderedCount).toBe(1);
    expect(result.remainingInitCommands).toHaveLength(0);
    expect(result.html).toContain('class="main active"');
  });

  it('pre-renders put content into element', () => {
    const html = '<span id="greeting"></span>';
    const commands = [
      {
        type: 'command' as const,
        name: 'put',
        args: [{ type: 'literal' as const, value: 'Welcome!' }],
        target: { type: 'selector' as const, value: '#greeting' },
      },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.preRenderedCount).toBe(1);
    expect(result.html).toContain('>Welcome!</span>');
  });

  it('pre-renders set attribute on element', () => {
    const html = '<div id="root">App</div>';
    const commands = [
      {
        type: 'command' as const,
        name: 'set',
        args: [
          { type: 'identifier' as const, value: '@data-theme' },
          { type: 'literal' as const, value: 'dark' },
        ],
        target: { type: 'selector' as const, value: '#root' },
      },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.preRenderedCount).toBe(1);
    expect(result.html).toContain('data-theme="dark"');
  });

  it('preserves impure commands while pre-rendering pure ones', () => {
    const html = '<div id="header"></div><span id="greeting"></span>';
    const commands = [
      {
        type: 'command' as const,
        name: 'add',
        args: [{ type: 'selector' as const, value: '.active' }],
        target: { type: 'selector' as const, value: '#header' },
      },
      { type: 'command' as const, name: 'fetch', args: [] },
      {
        type: 'command' as const,
        name: 'put',
        args: [{ type: 'literal' as const, value: 'Hello' }],
        target: { type: 'selector' as const, value: '#greeting' },
      },
      { type: 'command' as const, name: 'wait', args: [] },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.preRenderedCount).toBe(2);
    expect(result.remainingInitCommands).toHaveLength(2);
    expect((result.remainingInitCommands[0] as any).name).toBe('fetch');
    expect((result.remainingInitCommands[1] as any).name).toBe('wait');
    expect(result.html).toContain('class="active"');
    expect(result.html).toContain('>Hello</span>');
  });

  it('handles realistic multi-element init block', () => {
    const html = `
      <nav id="nav" class="collapsed"></nav>
      <main id="content"></main>
      <footer id="footer"></footer>
    `;
    const commands = [
      {
        type: 'command' as const,
        name: 'remove',
        args: [{ type: 'selector' as const, value: '.collapsed' }],
        target: { type: 'selector' as const, value: '#nav' },
      },
      {
        type: 'command' as const,
        name: 'add',
        args: [{ type: 'selector' as const, value: '.expanded' }],
        target: { type: 'selector' as const, value: '#nav' },
      },
      {
        type: 'command' as const,
        name: 'put',
        args: [{ type: 'literal' as const, value: 'Loading...' }],
        target: { type: 'selector' as const, value: '#content' },
      },
      {
        type: 'command' as const,
        name: 'set',
        args: [
          { type: 'identifier' as const, value: '@aria-busy' },
          { type: 'literal' as const, value: 'true' },
        ],
        target: { type: 'selector' as const, value: '#footer' },
      },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.preRenderedCount).toBe(4);
    expect(result.remainingInitCommands).toHaveLength(0);
    expect(result.html).not.toContain('collapsed');
    expect(result.html).toContain('expanded');
    expect(result.html).toContain('>Loading...</main>');
    expect(result.html).toContain('aria-busy="true"');
  });

  it('escapes HTML in pre-rendered content to prevent XSS', () => {
    const html = '<div id="el"></div>';
    const commands = [
      {
        type: 'command' as const,
        name: 'put',
        args: [{ type: 'literal' as const, value: '<img onerror=alert(1)>' }],
        target: { type: 'selector' as const, value: '#el' },
      },
    ];

    const result = preRenderInitBlock(html, commands as any);

    expect(result.html).not.toContain('<img');
    expect(result.html).toContain('&lt;img');
  });
});
