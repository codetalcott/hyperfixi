/**
 * Parser Performance Benchmarks
 *
 * Measures parse time for various hyperscript complexity levels.
 * Uses vitest bench for statistical analysis.
 *
 * Run: npm run bench
 */

import { bench, describe } from 'vitest';
import type { CompileResult } from '../src/api/hyperscript-api';

// Lazy import to avoid loading before warmup
let compile: (code: string) => CompileResult;

async function ensureCompiler() {
  if (!compile) {
    const mod = await import('../src/index');
    compile = mod.lokascript.compileSync.bind(mod.lokascript);
  }
}

// =============================================================================
// Simple Commands (target: < 0.5ms)
// =============================================================================

describe('Parse: Simple Commands', () => {
  bench(
    'toggle .active',
    async () => {
      await ensureCompiler();
      compile('on click toggle .active');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'add .highlight',
    async () => {
      await ensureCompiler();
      compile('on click add .highlight');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'remove .selected',
    async () => {
      await ensureCompiler();
      compile('on click remove .selected');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'put content',
    async () => {
      await ensureCompiler();
      compile("on click put 'hello' into me");
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'wait command',
    async () => {
      await ensureCompiler();
      compile('on click wait 500ms');
    },
    { warmupIterations: 100, iterations: 1000 }
  );
});

// =============================================================================
// Medium Complexity (target: < 5ms)
// =============================================================================

describe('Parse: Medium Complexity', () => {
  bench(
    'multi-command sequence',
    async () => {
      await ensureCompiler();
      compile(
        'on click set :x to 5 then put :x into #output then toggle .visible'
      );
    },
    { warmupIterations: 50, iterations: 500 }
  );

  bench(
    'command with target',
    async () => {
      await ensureCompiler();
      compile('on click toggle .active on #button');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'command with multiple modifiers',
    async () => {
      await ensureCompiler();
      compile('on click add .highlight to .items in #container');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'conditional command',
    async () => {
      await ensureCompiler();
      compile('on click if me matches .active add .done to me');
    },
    { warmupIterations: 50, iterations: 500 }
  );
});

// =============================================================================
// Complex Commands (target: < 20ms)
// =============================================================================

describe('Parse: Complex Commands', () => {
  bench(
    'nested conditionals',
    async () => {
      await ensureCompiler();
      compile(`
        on click
          if me matches .loading
            return
          end then
          add .loading then
          if me matches .error
            remove .error
          else
            add .processing
          end then
          wait 100ms then
          remove .loading
      `);
    },
    { warmupIterations: 20, iterations: 200 }
  );

  bench(
    'loop with body',
    async () => {
      await ensureCompiler();
      compile(`
        on click
          repeat 10 times
            toggle .active then
            wait 50ms
          end
      `);
    },
    { warmupIterations: 20, iterations: 200 }
  );

  bench(
    'fetch with processing',
    async () => {
      await ensureCompiler();
      compile(`
        on click
          fetch /api/data as json then
          for each item in result
            append item.name to #results
          end
      `);
    },
    { warmupIterations: 20, iterations: 200 }
  );
});

// =============================================================================
// Expression Parsing (target: < 1ms)
// =============================================================================

describe('Parse: Expressions', () => {
  bench(
    'arithmetic expression',
    async () => {
      await ensureCompiler();
      compile('on click set :total to :price * 1.1 + :shipping');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'property access',
    async () => {
      await ensureCompiler();
      compile("on click put #input's value into :data");
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'CSS selector',
    async () => {
      await ensureCompiler();
      compile('on click toggle .active on <.item.selected/>');
    },
    { warmupIterations: 100, iterations: 1000 }
  );

  bench(
    'method chain',
    async () => {
      await ensureCompiler();
      compile("on click put :str.toUpperCase().trim() into me");
    },
    { warmupIterations: 100, iterations: 1000 }
  );
});
