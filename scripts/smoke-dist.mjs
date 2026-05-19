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
// @hyperfixi/core — browser bundle has expected window-level API surface
// ---------------------------------------------------------------------------
console.log('\n@hyperfixi/core browser bundle exports');
try {
  // Validate the bundle constructs a window.hyperfixi global with the
  // documented `semantic.parseSemantic` shape (replaces removed
  // `createSemanticAnalyzer` in v3). Doing this in Node requires the IIFE to
  // run against a window-like global; we use happy-dom for a minimal one.
  const { Window } = await import('happy-dom');
  const window = new Window();
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.Element = window.Element;

  const { readFileSync } = await import('fs');
  const bundleSrc = readFileSync(join(rootDir, 'packages/core/dist/hyperfixi.js'), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', bundleSrc)(window, window.document);

  const hyperfixi = window.hyperfixi;
  if (!hyperfixi) throw new Error('window.hyperfixi not defined after bundle eval');
  if (typeof hyperfixi.compileSync !== 'function')
    throw new Error('hyperfixi.compileSync is not a function');
  if (typeof hyperfixi.semantic?.parseSemantic !== 'function')
    throw new Error(
      'hyperfixi.semantic.parseSemantic missing — likely a removed-export drift (e.g. createSemanticAnalyzer)'
    );

  const compiled = hyperfixi.compileSync('toggle .active');
  if (!compiled.ok) throw new Error(`compileSync failed: ${JSON.stringify(compiled.errors)}`);

  pass('window.hyperfixi surface (compileSync + semantic.parseSemantic)');
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
