#!/usr/bin/env tsx
/**
 * Generate the committed bundles' executor cores from `bundle-generator/templates.ts`.
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
import { emitCommandCases, emitBlockCases } from '../src/bundle-generator/executor-core';

/** Package root (`packages/core`); target paths are relative to it. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface Target {
  /** Repo-relative path of the file whose regions are generated. */
  file: string;
  /** Human label used in failure output. */
  label: string;
}

const TARGETS: Target[] = [
  {
    file: 'src/compatibility/browser-bundle-hybrid-complete.ts',
    label: 'hybrid-complete',
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

  const commands = readStringArray(prev, 'commands', target.label);
  const blocks = readStringArray(prev, 'blocks', target.label);
  if (commands.length === 0) throw new Error(`${target.label}: empty commands array`);

  let next = spliceRegion(prev, 'commands', emitCommandCases(commands), target.label);
  next = spliceRegion(next, 'blocks', emitBlockCases(blocks), target.label);

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
