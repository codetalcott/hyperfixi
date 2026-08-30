#!/usr/bin/env node
/**
 * check-type-escapes — the engine migration's progress meter, as a ratchet
 *
 * Counts the four type-escape hatches in `packages/core/src` non-test source,
 * per top-level directory, and fails when any directory's count RISES above
 * the committed baseline (`packages/core/baselines/type-escapes.json`).
 *
 *   `: any`                        an untyped annotation
 *   `as any`                       an assertion that turns checking off
 *   `as Record<string, unknown>`   the "AST node is a bag" idiom
 *   `as unknown as`                the double-cast escape
 *   `<..., any>`                   `any` in type-argument position
 *
 * ## Why this exists
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. The engine's AST is
 * `{ type: string; [key: string]: unknown }` in five places, so every consumer
 * casts on the way in. Arcs 2–4 drive the count down; without a ratchet the
 * next feature quietly adds hatches back and the arcs read as finished while
 * the tree regresses.
 *
 * The gate is SHRINK-ONLY, like the kept-rows and shipped-sources ratchets: a
 * PR that lowers a count regenerates the baseline in the same change
 * (`--update`), and the diff is the evidence. It never blocks an improvement,
 * only a regression.
 *
 * ## What it counts, precisely
 *
 * Comments and string CONTENTS are stripped before matching, so a doc comment
 * that says `(node: any)` is not a hatch and editing prose never moves the
 * number.
 *
 * So this number is not the plan's. "Verified state" quotes raw `grep` over
 * four patterns (459 / 471 / 121 / 101 = 1,152); this script strips comments
 * and strings (which lowers it) and adds type-argument `any` (which raises it
 * by 144). Both are correct measurements of different questions; THIS one is
 * what the arcs ratchet, because it is the one that cannot be moved by
 * rewording a comment or by hiding a hatch inside a generic.
 *
 * Files: everything under `packages/core/src` except `*.test.ts`, `*.spec.ts`,
 * anything in `__tests__/`, `__test-utils__/` or `test-helpers/`, and the
 * `test-*.ts` scratch files at the src root. `.d.ts` IS counted — `types.d.ts`
 * is real declared API surface and one of the worst offenders.
 *
 * Zero runtime deps — node built-ins only, so it stays cheap enough for both
 * the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'packages', 'core', 'src');
const BASELINE = path.join(REPO_ROOT, 'packages', 'core', 'baselines', 'type-escapes.json');

/**
 * The four patterns, in the order they appear in the baseline's breakdown.
 * Each is applied to comment- and string-stripped code.
 *
 * `\b` after `any` is what keeps `anything` / `anyOf` from matching while
 * still counting `any[]`, `any>`, `any)` and `any;`.
 */
const PATTERNS = [
  ['colonAny', /:\s*any\b/g],
  ['asAny', /\bas\s+any\b/g],
  ['asRecordUnknown', /\bas\s+Record<string,\s*unknown>/g],
  ['asUnknownAs', /\bas\s+unknown\s+as\b/g],
  // `any` in TYPE-ARGUMENT position — `Map<string, any>`, `Promise<any>`.
  // Not caught by `: any` (there is no colon), and 144 occurrences deep, so
  // omitting it would leave the ratchet trivially dodgeable by writing the
  // hatch in a generic instead of an annotation. The lookahead keeps the
  // trailing delimiter unconsumed so `<any, any>` counts as two.
  ['genericAny', /[<,]\s*any\s*(?=[,>])/g],
];

/** Directories deliberately exempt from the ratchet, with a reason each. */
const INTENTIONALLY_UNRATCHETED = new Map([
  // e.g. ['generated', 'emitted by a generator; gated by its own --check'],
]);

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

/**
 * Replace comment bodies and string contents with nothing, so pattern matching
 * sees only code. A character scanner rather than regexes because `//` inside a
 * URL string and `/*` inside a regex literal both break the regex approach —
 * and a ratchet that moves when a comment is reworded is a ratchet nobody
 * trusts.
 *
 * Template literals are treated as plain strings; a `${...}` interpolation
 * holding a comment would be mis-stripped, which does not occur in this tree
 * and would only ever under-count.
 */
function stripCommentsAndStrings(text) {
  let out = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];

    // Line comment
    if (c === '/' && next === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // String / template literal — keep the delimiters, drop the contents.
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += quote;
      i++;
      while (i < n) {
        if (text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i] === quote) break;
        i++;
      }
      out += quote;
      i++;
      continue;
    }

    out += c;
    i++;
  }

  return out;
}

/** Count each pattern in already-stripped code. Returns { name: count }. */
function countEscapes(code) {
  const counts = {};
  for (const [name, pattern] of PATTERNS) {
    pattern.lastIndex = 0;
    const matches = code.match(pattern);
    counts[name] = matches ? matches.length : 0;
  }
  return counts;
}

/** True for files the ratchet ignores (tests and test utilities). */
function isExcluded(relPath) {
  if (/(^|\/)__tests__\//.test(relPath)) return true;
  if (/(^|\/)__test-utils__\//.test(relPath)) return true;
  if (/(^|\/)test-helpers\//.test(relPath)) return true;
  if (/\.test\.ts$/.test(relPath)) return true;
  if (/\.spec\.ts$/.test(relPath)) return true;
  // Scratch harnesses that live at the src root (test-ast-debug.ts et al).
  if (/^test-[a-z-]+\.ts$/.test(relPath)) return true;
  return false;
}

/** Recursively list the .ts files the ratchet counts, relative to SRC_DIR. */
function collectFiles(dir = SRC_DIR, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (isExcluded(rel)) continue;
    files.push(rel);
  }
  return files.sort();
}

/**
 * The directory a file is attributed to: its first path segment, or `.` for
 * files directly under `src/`. Matches how the plan's tables are grouped.
 */
function directoryOf(relPath) {
  const slash = relPath.indexOf('/');
  return slash === -1 ? '.' : relPath.slice(0, slash);
}

/**
 * Measure the tree. Returns { directories: { dir: { total, ...breakdown } },
 * total }, with directories sorted by name so the JSON diff stays readable.
 */
function measure(files = collectFiles(), readFile = readSourceFile) {
  const byDir = new Map();

  for (const rel of files) {
    const code = stripCommentsAndStrings(readFile(rel));
    const counts = countEscapes(code);
    const dir = directoryOf(rel);
    const acc = byDir.get(dir) || { total: 0 };
    for (const [name] of PATTERNS) {
      acc[name] = (acc[name] || 0) + counts[name];
      acc.total += counts[name];
    }
    byDir.set(dir, acc);
  }

  const directories = {};
  let total = 0;
  for (const dir of [...byDir.keys()].sort()) {
    directories[dir] = byDir.get(dir);
    total += byDir.get(dir).total;
  }

  return { directories, total };
}

function readSourceFile(rel) {
  return fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/**
 * Compare a measurement against a baseline. Returns failure strings; empty
 * means all good. Rises fail; falls do not (shrink-only).
 */
function check(measured, baseline, unratcheted = INTENTIONALLY_UNRATCHETED) {
  const failures = [];
  const base = baseline.directories || {};

  for (const [dir, counts] of Object.entries(measured.directories)) {
    if (unratcheted.has(dir)) continue;
    const before = base[dir] ? base[dir].total : 0;
    if (counts.total > before) {
      failures.push(
        `packages/core/src/${dir}: ${counts.total} type escapes, baseline ${before} ` +
          `(+${counts.total - before}). New \`any\` / \`as any\` / ` +
          `\`as Record<string, unknown>\` / \`as unknown as\` in this directory is a ` +
          `regression against docs-internal/ENGINE_MIGRATION_PLAN.md Arc 0. Type the ` +
          `value, or — if the hatch is genuinely required — say why in the PR and run ` +
          `\`npm run check:type-escapes:update\`.`
      );
    }
  }

  return failures;
}

/** Directories whose count IMPROVED — reported so a stale baseline is visible. */
function improvements(measured, baseline) {
  const base = baseline.directories || {};
  const wins = [];
  for (const [dir, counts] of Object.entries(measured.directories)) {
    const before = base[dir] ? base[dir].total : 0;
    if (counts.total < before) wins.push({ dir, before, after: counts.total });
  }
  for (const dir of Object.keys(base)) {
    if (!measured.directories[dir]) {
      wins.push({ dir, before: base[dir].total, after: 0 });
    }
  }
  return wins;
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch (err) {
    throw new Error(
      `check-type-escapes: cannot read ${path.relative(REPO_ROOT, BASELINE)}: ${err.message}\n` +
        `Generate it with: npm run check:type-escapes:update`
    );
  }
}

function writeBaseline(measured) {
  const payload = {
    $comment:
      'Shrink-only ratchet for docs-internal/ENGINE_MIGRATION_PLAN.md Arc 0. ' +
      'Counts comment- and string-stripped occurrences of `: any`, `as any`, ' +
      '`as Record<string, unknown>` and `as unknown as` in packages/core/src ' +
      'non-test source, per top-level directory. Regenerate with ' +
      '`npm run check:type-escapes:update` in the SAME PR that lowers a count; ' +
      'a rise fails scripts/check-type-escapes.cjs.',
    generated: new Date().toISOString().slice(0, 10),
    total: measured.total,
    directories: measured.directories,
  };
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function main() {
  const update = process.argv.includes('--update');
  const explain = process.argv.includes('--explain');
  const measured = measure();

  if (update) {
    const payload = writeBaseline(measured);
    process.stdout.write(
      `check-type-escapes: baseline written — ${payload.total} escapes across ` +
        `${Object.keys(payload.directories).length} directories\n`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const failures = check(measured, baseline);

  if (explain) {
    for (const [dir, counts] of Object.entries(measured.directories)) {
      const before = baseline.directories?.[dir]?.total ?? 0;
      const delta = counts.total - before;
      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      process.stdout.write(
        `  ${dir.padEnd(20)} ${String(counts.total).padStart(4)}  (baseline ${before}, ${sign})\n`
      );
    }
  }

  if (failures.length === 0) {
    const wins = improvements(measured, baseline);
    const won = wins.reduce((n, w) => n + (w.before - w.after), 0);
    let line = `check-type-escapes: OK (${measured.total} escapes, baseline ${baseline.total})`;
    if (won > 0) {
      line +=
        `\n  ${won} fewer than baseline in ${wins.length} director${wins.length === 1 ? 'y' : 'ies'} ` +
        `— run \`npm run check:type-escapes:update\` in this PR to bank it.`;
    }
    process.stdout.write(`${line}\n`);
    process.exit(0);
  }

  process.stderr.write('check-type-escapes: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  stripCommentsAndStrings,
  countEscapes,
  isExcluded,
  directoryOf,
  collectFiles,
  measure,
  check,
  improvements,
  PATTERNS,
  INTENTIONALLY_UNRATCHETED,
};
