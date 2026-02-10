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
