#!/usr/bin/env node
/**
 * Build-output smoke test
 *
 * Imports built `dist/*` artifacts directly (NOT through vitest source aliases)
 * and exercises one round-trip per package surface. Catches two classes of bug
 * that unit tests can miss when vitest aliases `@lokascript/*` to source:
 *
 *  1. tsup multi-entry singleton fork — a module-scope Map (e.g. the semantic
 *     language registry) gets inlined into each ESM entry independently,
 *     leaving readers in one entry unable to see writes from another.
 *  2. Removed-export drift — an internal consumer still imports a symbol
 *     that no longer exists in the package's dist (build will fail, but if
 *     the consumer's tests are aliased to source the regression slips through
 *     until someone actually rebuilds the consumer).
 *
 * Each scenario below MUST exercise behavior that crosses subpath entries.
 *
 * Run: `node scripts/smoke-dist.mjs` (or `npm run smoke:dist` from the root).
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const failures = [];
const successes = [];

function pass(name, detail) {
  successes.push({ name, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, err) {
  failures.push({ name, err });
  console.error(`  ✗ ${name}\n    ${err instanceof Error ? err.message : String(err)}`);
}

// ---------------------------------------------------------------------------
// @lokascript/semantic — registry singleton across core + languages entries
// ---------------------------------------------------------------------------
console.log('\n@lokascript/semantic registry singleton');
try {
  const coreUrl = `file://${join(rootDir, 'packages/semantic/dist/core.js')}`;
  const esUrl = `file://${join(rootDir, 'packages/semantic/dist/languages/es.js')}`;
  const jaUrl = `file://${join(rootDir, 'packages/semantic/dist/languages/ja.js')}`;

  const core = await import(coreUrl);
  await import(esUrl);
  await import(jaUrl);

  core.setPatternGenerator(p => core.generatePatternsForLanguage(p));

  if (!core.isLanguageRegistered('es')) throw new Error("language 'es' not visible to core after import");
  if (!core.isLanguageRegistered('ja')) throw new Error("language 'ja' not visible to core after import");

  const r = core.parseWithConfidence('alternar .active', 'es');
  if (!r.node) throw new Error(`Spanish parse returned null node (confidence=${r.confidence})`);
  if (r.node.action !== 'toggle') throw new Error(`expected action=toggle, got ${r.node.action}`);

  pass('cross-entry registry: register es + parse Spanish', `confidence=${r.confidence.toFixed(2)}`);
} catch (e) {
  fail('cross-entry registry: register es + parse Spanish', e);
}

// ---------------------------------------------------------------------------
// @hyperfixi/core — dist/hyperfixi.js is the engine's hyperfixi-hs.js
// ---------------------------------------------------------------------------
console.log('\n@hyperfixi/core browser bundle (the engine under core\'s name)');
try {
  // Since Phase C3 (C-R4b) dist/hyperfixi.js is a copy of
  // packages/engine/dist/hyperfixi-hs.js: window.hyperfixi and
  // window._hyperscript are the same object, upstream's API (evaluate, parse,
  // processNode). (Core's own bundle exposed compileSync and
  // semantic.parseSemantic, which this checked until then.) Evaluating the IIFE
  // in Node needs a window-like global; happy-dom provides a minimal one.
  const { Window } = await import('happy-dom');
  const window = new Window();
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;

  const { readFileSync } = await import('fs');
  const bundleSrc = readFileSync(join(rootDir, 'packages/core/dist/hyperfixi.js'), 'utf8');
  const engineSrc = readFileSync(join(rootDir, 'packages/engine/dist/hyperfixi-hs.js'), 'utf8');
  if (bundleSrc !== engineSrc) throw new Error('dist/hyperfixi.js differs from the engine\'s hyperfixi-hs.js');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'self', bundleSrc)(window, window.document, window);

  // The engine installs its globals on globalThis (the browser's window); in
  // Node that is the real global, not happy-dom's window.
  const hyperfixi = globalThis.hyperfixi;
  if (!hyperfixi) throw new Error('hyperfixi not defined after bundle eval');
  if (hyperfixi !== globalThis._hyperscript) throw new Error('hyperfixi is not _hyperscript');
  for (const fn of ['evaluate', 'parse', 'processNode']) {
    if (typeof hyperfixi[fn] !== 'function') throw new Error(`hyperfixi.${fn} is not a function`);
  }
  const parsed = hyperfixi.parse('toggle .active');
  if (parsed?.errors?.length) throw new Error(`parse failed: ${JSON.stringify(parsed.errors)}`);
  if (hyperfixi.evaluate('1 + 2') !== 3) throw new Error('evaluate("1 + 2") is not 3');

  pass('window.hyperfixi = window._hyperscript (evaluate, parse, processNode)');
} catch (e) {
  fail('window.hyperfixi surface', e);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`\n${successes.length} passed, ${failures.length} failed`);
// Exit eagerly: the happy-dom shim used to evaluate the browser bundle has
// scheduled microtasks (auto-init's scanAndProcessAll dispatches a load event)
// that fail to round-trip its Event type checks. The synchronous assertions
// above are what we care about; exiting now skips the noisy tear-down.
process.exit(failures.length > 0 ? 1 : 0);
