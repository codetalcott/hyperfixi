#!/usr/bin/env tsx
/**
 * Verify Reference Data Script
 *
 * Checks the hand-written data core keeps at 4.0 — `src/reference/index.ts`,
 * `src/lsp-metadata.ts` and the command counts in `src/metadata.ts` — against
 * the engine it documents, `@hyperfixi/engine`:
 *
 * - the reference documents exactly the engine's commands;
 * - the LSP's command and feature keywords cover the engine's, and name nothing
 *   else but the exceptions listed below, each with its reason;
 * - every command and feature keyword has hover docs;
 * - every example — reference, pattern, hover — parses on the engine;
 * - the advertised command counts are the engine's;
 * - `packageInfo.upstreamSuite` is the engine's upstream-suite result
 *   (`packages/engine/upstream-suite/known-failures.json`).
 *
 * ## Why the engine, and not a list
 *
 * Until Phase C5 of the engine cutover these were scored against core's command
 * manifest (`commands/manifest.ts`), gated against core's registry. That chain
 * terminated at what core's engine executed; core's engine is no longer what
 * ships (`hyperfixi.js` has been the engine's bundle since C-R4b), and the
 * manifest leaves with it in C6. The oracle is now the engine's own grammar —
 * every module in `everything` run against a fresh grammar, the way the Vite
 * plugin derives its keyword map — and its parser, which is strict: a leftover
 * token is an error, so an unknown word cannot pass as an empty command list.
 *
 * Reads the engine's BUILT dist (CI's lint-typecheck job downloads it; locally,
 * `npm run build --prefix packages/engine`).
 *
 * Run: npm run verify:reference
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import { COMMAND_KEYWORDS, FEATURE_KEYWORDS, HOVER_DOCS } from '../src/lsp-metadata';
import { bundleInfo, packageInfo } from '../src/metadata';
import { bundles, commands, patterns } from '../src/reference/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = resolve(__dirname, '..');

// =============================================================================
// THE ENGINE
// =============================================================================

if (!existsSync(resolve(CORE_ROOT, '../engine/dist/index.js'))) {
  console.log('❌ The engine is not built: npm run build --prefix packages/engine');
  process.exit(1);
}
const engine = await import('../../engine/dist/index.js');

/** The keywords each module adds, read back from a fresh grammar per module. */
function engineKeywords(): { commands: string[]; features: string[] } {
  const commandSet = new Set<string>();
  const featureSet = new Set<string>();
  for (const mod of engine.everything) {
    const grammar = engine.createGrammar();
    mod(grammar);
    // The template text line registers under `#text`, which no script can spell.
    for (const key of Object.keys(grammar.commands)) if (!key.startsWith('#')) commandSet.add(key);
    for (const key of Object.keys(grammar.features)) featureSet.add(key);
  }
  return { commands: [...commandSet].sort(), features: [...featureSet].sort() };
}

const engineSets = engineKeywords();
const engineCommands = new Set(engineSets.commands);
const engineFeatures = new Set(engineSets.features);

engine.register(...engine.everything);

/** The engine's error for `source`, or null when it parses. */
function parseError(source: string, requireStatement: boolean): string | null {
  try {
    const parsed = engine.parse(source);
    // An unknown first word parses as an expression; a command example must not.
    if (requireStatement && parsed.kind === 'expression') return 'parses only as an expression';
    return null;
  } catch (e) {
    return String((e as Error).message).split('\n')[0];
  }
}

/**
 * An example is one snippet, or several written one per line (`closest <form/>`
 * then `closest .container`): it passes when the whole parses, or each line does.
 */
function exampleError(example: string, requireStatement: boolean): string | null {
  const whole = parseError(example, requireStatement);
  if (!whole) return null;
  const lines = example.split('\n').filter(line => line.trim());
  if (lines.length < 2) return whole;
  for (const line of lines) {
    const error = parseError(line.trim(), requireStatement);
    if (error) return `${JSON.stringify(line.trim())}: ${error}`;
  }
  return null;
}

// =============================================================================
// EXCEPTIONS, EACH WITH ITS REASON
// =============================================================================

/** In COMMAND_KEYWORDS without being engine commands: they continue `if` and `repeat`. */
const LSP_SUB_KEYWORDS = new Set(['else', 'while']);

/**
 * In FEATURE_KEYWORDS without being engine features: upstream _hyperscript ships
 * them as extensions (`ext/worker.js`, `ext/socket.js`, `ext/eventsource.js`), and
 * the LSP's hyperscript mode serves upstream's users. The engine does not have them.
 */
const UPSTREAM_EXTENSION_FEATURES = new Set(['worker', 'socket', 'eventsource']);

/**
 * Hover categories whose examples are not scripts: template bodies (`#if`, `#for`)
 * and HTML attributes (`dom-scope`, `attrs` in a component's markup).
 */
const NOT_SCRIPT_CATEGORIES = new Set(['directive', 'component']);

// =============================================================================
// VERIFICATION FUNCTIONS
// =============================================================================

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
  isWarning?: boolean; // Warnings don't cause exit(1)
}

const results: VerificationResult[] = [];

function verify(
  name: string,
  passed: boolean,
  message: string,
  details?: string[],
  isWarning?: boolean
) {
  results.push({ name, passed, message, details, isWarning });
}

const difference = (a: Iterable<string>, b: Set<string>) => [...a].filter(x => !b.has(x)).sort();

// 1. The reference documents exactly the engine's commands.
function verifyReferenceCommands() {
  const documented = new Set(Object.keys(commands));
  const details: string[] = [];
  const missing = difference(engineCommands, documented);
  const extra = difference(documented, engineCommands);
  if (missing.length)
    details.push(`  Engine commands the reference does not document: ${missing.join(', ')}`);
  if (extra.length)
    details.push(`  Reference entries the engine does not have: ${extra.join(', ')}`);
  const misnamed = Object.entries(commands)
    .filter(([key, ref]) => ref.name !== key)
    .map(([key, ref]) => `${key} (name: ${ref.name})`);
  if (misnamed.length)
    details.push(`  Entries whose name is not their key: ${misnamed.join(', ')}`);
  verify(
    'Reference Commands',
    details.length === 0,
    details.length === 0
      ? `✓ The reference documents the engine's ${engineCommands.size} commands`
      : `✗ The reference and the engine's commands differ`,
    details.length ? details : undefined
  );
}

// 2. The LSP's keywords cover the engine's, and name nothing else but the exceptions.
function verifyLspKeywords() {
  const details: string[] = [];
  const commandKeywords = new Set<string>(COMMAND_KEYWORDS);
  const featureKeywords = new Set<string>(FEATURE_KEYWORDS);
  const known = new Set([...commandKeywords, ...featureKeywords]);

  const commandGaps = difference(engineCommands, commandKeywords);
  const commandGhosts = difference(
    commandKeywords,
    new Set([...engineCommands, ...LSP_SUB_KEYWORDS])
  );
  // `set` and `js` are features too; listed with the commands, they are known.
  const featureGaps = difference(engineFeatures, known);
  const featureGhosts = difference(
    featureKeywords,
    new Set([...engineFeatures, ...UPSTREAM_EXTENSION_FEATURES])
  );
  if (commandGaps.length)
    details.push(`  Engine commands COMMAND_KEYWORDS lacks: ${commandGaps.join(', ')}`);
  if (commandGhosts.length)
    details.push(`  COMMAND_KEYWORDS the engine does not have: ${commandGhosts.join(', ')}`);
  if (featureGaps.length)
    details.push(`  Engine features the LSP does not list: ${featureGaps.join(', ')}`);
  if (featureGhosts.length)
    details.push(`  FEATURE_KEYWORDS the engine does not have: ${featureGhosts.join(', ')}`);

  const undocumented = [...known].filter(keyword => !HOVER_DOCS[keyword]).sort();
  if (undocumented.length)
    details.push(`  Keywords without HOVER_DOCS: ${undocumented.join(', ')}`);

  verify(
    'LSP Keywords',
    details.length === 0,
    details.length === 0
      ? `✓ ${commandKeywords.size} command and ${featureKeywords.size} feature keywords match the engine, each documented`
      : `✗ The LSP's keywords and the engine's differ`,
    details.length ? details : undefined
  );
}

// 3. Every example parses on the engine.
function verifyExamples() {
  const failures: string[] = [];
  let count = 0;
  for (const [key, ref] of Object.entries(commands)) {
    for (const example of ref.examples) {
      count++;
      const error = exampleError(example, true);
      if (error) failures.push(`  reference ${key}: ${JSON.stringify(example)} → ${error}`);
    }
  }
  for (const pattern of patterns) {
    count++;
    const error = exampleError(pattern.code, true);
    if (error) failures.push(`  pattern "${pattern.name}": ${error}`);
  }
  for (const [key, doc] of Object.entries(HOVER_DOCS)) {
    if (NOT_SCRIPT_CATEGORIES.has(doc.category)) continue;
    // Upstream's extensions: the engine cannot parse what it does not have.
    if (UPSTREAM_EXTENSION_FEATURES.has(key)) continue;
    count++;
    const statement = doc.category === 'command' || doc.category === 'feature';
    const error = exampleError(doc.example, statement);
    if (error) failures.push(`  hover ${key}: ${JSON.stringify(doc.example)} → ${error}`);
  }
  verify(
    'Examples Parse',
    failures.length === 0,
    failures.length === 0
      ? `✓ All ${count} reference, pattern and hover examples parse on the engine`
      : `✗ ${failures.length} of ${count} examples do not parse on the engine`,
    failures.length ? failures : undefined
  );
}

// 4. The advertised command counts are the engine's.
function verifyCommandCounts() {
  const errors: string[] = [];
  const count = engineCommands.size;
  if (packageInfo.commands !== count) {
    errors.push(
      `  metadata packageInfo.commands is ${packageInfo.commands}; the engine registers ${count}`
    );
  }
  for (const bundle of bundleInfo) {
    if (bundle.commandCount !== count) {
      errors.push(
        `  metadata bundleInfo ${bundle.id} advertises ${bundle.commandCount}; the engine registers ${count}`
      );
    }
  }
  for (const bundle of bundles) {
    if (bundle.commandCount !== count) {
      errors.push(
        `  reference bundles ${bundle.name} advertises ${bundle.commandCount}; the engine registers ${count}`
      );
    }
  }
  verify(
    'Command Counts',
    errors.length === 0,
    errors.length === 0
      ? `✓ Every advertised command count is the engine's ${count}`
      : `✗ Command counts differ from the engine's`,
    errors.length ? errors : undefined
  );
}

// 4b. The advertised upstream-suite result is the engine's gate's.
function verifyUpstreamSuite() {
  const file = resolve(CORE_ROOT, '../engine/upstream-suite/known-failures.json');
  const gate = JSON.parse(readFileSync(file, 'utf8')) as {
    upstream: string;
    passed: number;
    total: number;
  };
  const advertised = packageInfo.upstreamSuite;
  const errors: string[] = [];
  if (advertised.version !== gate.upstream)
    errors.push(
      `  metadata upstreamSuite.version is ${advertised.version}; the gate vendors ${gate.upstream}`
    );
  if (advertised.passed !== gate.passed || advertised.total !== gate.total)
    errors.push(
      `  metadata upstreamSuite is ${advertised.passed}/${advertised.total}; known-failures.json records ${gate.passed}/${gate.total}`
    );
  verify(
    'Upstream Suite',
    errors.length === 0,
    errors.length === 0
      ? `✓ upstreamSuite matches the gate: ${gate.passed}/${gate.total} of upstream ${gate.upstream}`
      : `✗ upstreamSuite differs from packages/engine/upstream-suite/known-failures.json`,
    errors.length ? errors : undefined
  );
}

// 5. Bundle files exist (a warning: dist/ is a build product).
function verifyBundleFiles() {
  const distPath = resolve(CORE_ROOT, 'dist');
  if (!existsSync(distPath)) {
    verify('Bundle Files', true, `⚠ Skipped - dist/ not found (run npm run build:browser first)`);
    return;
  }
  const missing = bundleInfo
    .filter(bundle => !existsSync(resolve(distPath, bundle.filename)))
    .map(bundle => `  ${bundle.id}: ${bundle.filename}`);
  verify(
    'Bundle Files',
    missing.length === 0,
    missing.length === 0
      ? `✓ All ${bundleInfo.length} bundle files exist in dist/`
      : `⚠ ${missing.length} bundle files missing`,
    missing.length ? missing : undefined,
    true
  );
}

// 6. Categories come from the CommandCategory union.
function verifyCategories() {
  const validCategories = new Set([
    'dom',
    'async',
    'data',
    'utility',
    'events',
    'navigation',
    'control-flow',
    'execution',
    'content',
    'animation',
    'advanced',
    'behaviors',
    'templates',
  ]);
  const invalid = Object.entries(commands)
    .filter(([, ref]) => !validCategories.has(ref.category))
    .map(([key, ref]) => `  ${key}: "${ref.category}"`);
  verify(
    'Valid Categories',
    invalid.length === 0,
    invalid.length === 0 ? `✓ All commands have valid categories` : `✗ Invalid categories found`,
    invalid.length ? invalid : undefined
  );
}

// =============================================================================
// RUN ALL VERIFICATIONS
// =============================================================================

console.log('🔍 Verifying reference data against the engine...\n');

verifyReferenceCommands();
verifyLspKeywords();
verifyExamples();
verifyCommandCounts();
verifyUpstreamSuite();
verifyBundleFiles();
verifyCategories();

// =============================================================================
// REPORT RESULTS
// =============================================================================

let hasFailures = false;
let hasWarnings = false;

for (const result of results) {
  console.log(`${result.message}`);
  if (result.details) {
    for (const detail of result.details) {
      console.log(detail);
    }
  }

  if (!result.passed) {
    if (result.isWarning) {
      hasWarnings = true;
    } else {
      hasFailures = true;
    }
  }
}

console.log('');

if (hasFailures) {
  console.log('❌ Verification failed - reference data needs updating');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Verification passed with warnings');
  process.exit(0);
} else {
  console.log('✅ All verifications passed');
  process.exit(0);
}
