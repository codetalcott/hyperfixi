#!/usr/bin/env tsx
/**
 * Generate the committed generated regions of the bundle layer:
 *
 *   - `browser-bundle-hybrid-complete.ts`'s executor cores, from
 *     `bundle-generator/templates.ts` (Arc E step 4)
 *   - `parser-templates.ts`'s `HYBRID_PARSER_TEMPLATE`, from the real parser
 *     modules `parser/hybrid/{aliases,tokenizer,parser-core}.ts` (Arc E step 5)
 *
 *   npm run generate:bundles         # rewrite the generated regions in place
 *   npm run generate:bundles:check   # fail if the committed output is stale
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CLOSES (Finding 17)
 * ---------------------------------------------------------------------------
 *
 * `hyperfixi-hybrid-complete.js` and `hyperfixi-hx.js` PARSED 35 commands and
 * EXECUTED 24. The other eleven — beep, break, continue, copy, empty, exit, js,
 * morph, push, replace, throw — reached the parser, produced a node, and fell to
 * `default:` → `Unknown command`. The parser rules for them shipped as dead
 * weight in every one of those bundles.
 *
 * The two rejected fixes are recorded in
 * `docs-internal/HANDOFF-command-arch-manifest.md` § Finding 17: split the
 * parser, or hand-add eleven cases. The second is a FIFTH hand-maintained copy
 * of the executor, which is the thing Arc E exists to delete.
 *
 * ---------------------------------------------------------------------------
 * THE INPUT IS THE BUNDLE'S OWN ADVERTISED LIST — deliberately
 * ---------------------------------------------------------------------------
 *
 * The command set is read from the target's `commands: [...]` array rather than
 * declared here. That is what makes Finding 17 unrepeatable rather than merely
 * fixed: "advertised but not executed" stops being a state the file can be in.
 * Add a name to the array, run this script, and the case body arrives from the
 * templates. Nothing can advertise a command it does not execute, because the
 * advertisement IS the generation input.
 *
 * `blocks: [...]` is passed the same way and filtered by the emitter. Its `else`
 * and `unless` entries name SYNTAX, not dispatch types — the parser folds both
 * into an `if` node — so they correctly contribute no case.
 *
 * ---------------------------------------------------------------------------
 * ONLY THE CASE BODIES ARE GENERATED
 * ---------------------------------------------------------------------------
 *
 * The region markers sit INSIDE each `switch`. The switch itself, its `default:`
 * arm, the helper closures and every other runtime region stay handwritten,
 * because the two runtimes were measured to differ in all of them (see
 * `executor-core.ts`). This is also why the shell is untouched: the emitted and
 * handwritten api surfaces differ BY DESIGN and are gated as set equality in
 * both directions (`compatibility/bundle-shell.test.ts`,
 * `vite-plugin/src/emitted-shell.test.ts`), and `hyperfixi-hx.js` spreads
 * hybrid-complete's api, so any shell change is user-visible on two shipped
 * bundles.
 *
 * ---------------------------------------------------------------------------
 * PRETTIER-IDEMPOTENT OR THE `--check` IS UNUSABLE
 * ---------------------------------------------------------------------------
 *
 * Output is formatted with the repo's pinned prettier before it is written, so
 * `generate → format` is a fixed point. Without that the pre-commit formatter
 * rewrites the file the generator just wrote and `--check` reports drift on a
 * clean tree. #828 fixed exactly this for the docs generator.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import * as prettier from 'prettier';
import { transformSync } from 'esbuild';
import { emitCommandCases, emitBlockCases } from '../src/bundle-generator/executor-core';

/** Package root (`packages/core`); target paths are relative to it. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Target {
  /** Repo-relative path of the file whose regions are generated. */
  file: string;
  /** Human label used in failure output. */
  label: string;
  /**
   * Region id → body producer. The producer receives the target's CURRENT
   * source, because some inputs live in the target itself (hybrid-complete's
   * `commands: [...]` array is the generation input — see the header).
   */
  regions: Record<string, (prev: string) => string>;
}

// ---------------------------------------------------------------------------
// Step-5 producer: the embedded hybrid parser, from the real parser modules
// ---------------------------------------------------------------------------

/**
 * `HYBRID_PARSER_TEMPLATE` used to be a hand-maintained ~1000-line JS copy of
 * the hybrid parser, and the copies were measured apart in BOTH directions
 * before generation replaced the hand copy: the template lacked `@attr`
 * selector tokenization, the `'s` possessive operator, fetch
 * `via`/`with`/`{options}`/`as a[n]`, `values of`, five KEYWORDS entries and
 * the alias-registration API — while carrying a stray KEYWORDS entry of its
 * own. Every vite-plugin bundle that embeds the template shipped those parse
 * gaps, invisibly: the only behavioral coverage the template had was three
 * probes in `parser-template-drift.test.ts` (the vite-plugin's own tests check
 * the emitted code is *syntactically valid* — `new Function` without a call).
 *
 * The transform is esbuild (`loader: 'ts'`), not a regex type-stripper — S2-c
 * measured the regex approach emitting invalid JS for 6 of 40 command
 * templates, so it is not trusted with a whole parser. `target: 'es2020'`
 * matches the runtime promise core's tsconfig `lib` makes (the same promise
 * that decided #834); esbuild lowers parser-core's class fields through its
 * tiny inlined helpers rather than emitting ES2022 syntax.
 *
 * Concatenation order is the dependency order (aliases → tokenizer →
 * parser-core); all three modules are runtime-import-free, so the result is
 * self-contained by construction — `new Function`-loadable, which is exactly
 * how the drift test consumes it.
 */
function buildHybridParserTemplate(): string {
  const MODULES = [
    'src/parser/hybrid/aliases.ts',
    'src/parser/hybrid/tokenizer.ts',
    'src/parser/hybrid/parser-core.ts',
  ];

  const parts = MODULES.map(rel => {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const js = transformSync(src, { loader: 'ts', target: 'es2020' }).code;
    return (
      js
        .split('\n')
        // Imports are types plus the two sibling modules concatenated here;
        // `export` qualifiers drop because the template is one flat scope.
        .filter(line => !/^import /.test(line))
        .join('\n')
        .replace(/^export (class|function|const)/gm, '$1')
    );
  });

  const flat = `// Hybrid Parser — generated from parser/hybrid/{aliases,tokenizer,parser-core}.ts\n\n${parts.join('\n')}`;

  // The template lives inside a TypeScript template literal, so its own
  // backticks, interpolations and backslashes must be escaped. Backslashes
  // first, or the escapes just added would be re-escaped.
  return flat.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const TARGETS: Target[] = [
  {
    file: 'src/compatibility/browser-bundle-hybrid-complete.ts',
    label: 'hybrid-complete',
    regions: {
      commands: prev => emitCommandCases(readStringArray(prev, 'commands', 'hybrid-complete')),
      blocks: prev => emitBlockCases(readStringArray(prev, 'blocks', 'hybrid-complete')),
    },
  },
  {
    file: 'src/bundle-generator/parser-templates.ts',
    label: 'parser-templates',
    regions: {
      'hybrid-parser': () => buildHybridParserTemplate(),
    },
  },
];

const BEGIN = (id: string) => `// #region generated:${id}`;
const END = (id: string) => `// #endregion generated:${id}`;

/** Read a `name: [ 'a', 'b' ]` string-array literal out of source text. */
function readStringArray(source: string, name: string, label: string): string[] {
  const match = source.match(new RegExp(`\\n\\s*${name}: \\[([^\\]]*)\\]`));
  if (!match) throw new Error(`${label}: no \`${name}: [...]\` array found`);
  return [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/**
 * Replace the body between `// #region generated:<id>` and its `#endregion`.
 * Markers are preserved; everything between them is replaced wholesale.
 */
function spliceRegion(source: string, id: string, body: string, label: string): string {
  const begin = source.indexOf(BEGIN(id));
  const endMarker = source.indexOf(END(id));
  if (begin < 0 || endMarker < 0 || endMarker < begin) {
    throw new Error(`${label}: missing or inverted markers for region '${id}'`);
  }
  const afterBegin = source.indexOf('\n', begin) + 1;
  // Snap to the start of the `#endregion` LINE so the marker keeps its indent;
  // `indexOf` lands on the `//`, which would otherwise be spliced flush-left.
  const end = source.lastIndexOf('\n', endMarker) + 1;
  return source.slice(0, afterBegin) + body.replace(/\s*$/, '') + '\n' + source.slice(end);
}

async function generateOne(target: Target): Promise<{ path: string; next: string; prev: string }> {
  const path = join(ROOT, target.file);
  const prev = readFileSync(path, 'utf8');

  let next = prev;
  for (const [id, produce] of Object.entries(target.regions)) {
    const body = produce(prev);
    if (!body.trim()) throw new Error(`${target.label}: region '${id}' produced empty output`);
    next = spliceRegion(next, id, body, target.label);
  }

  const config = await prettier.resolveConfig(path);
  next = await prettier.format(next, { ...config, filepath: path });

  return { path, next, prev };
}

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const stale: string[] = [];

  for (const target of TARGETS) {
    const { path, next, prev } = await generateOne(target);
    const rel = relative(ROOT, path);

    if (next === prev) {
      if (!check) console.log(`  unchanged  ${rel}`);
      continue;
    }
    if (check) {
      stale.push(rel);
      continue;
    }
    writeFileSync(path, next);
    console.log(`  generated  ${rel}`);
  }

  if (stale.length > 0) {
    console.error('\nGenerated bundle regions are STALE:\n');
    for (const rel of stale) console.error(`  ${rel}`);
    console.error('\nRun `npm run generate:bundles` and commit the result.\n');
    process.exit(1);
  }
  if (check) console.log('Generated bundle regions are up to date.');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
