#!/usr/bin/env node
/**
 * check-semantic-boundary — the engine / front-end boundary, as a ratchet
 *
 * `@hyperfixi/core` is the ENGINE. `@lokascript/semantic` (and `/intent`,
 * `/i18n`) are a multilingual FRONT-END that produces the engine's AST. The
 * dependency is supposed to run one way: the front-end depends on the engine's
 * types, never the reverse.
 *
 * It does not today. This records every place core reaches across that line,
 * per file and per import KIND, and fails when a new one appears — or when an
 * existing one gets worse.
 *
 * ## Why the import kind is the whole point
 *
 * Not all four kinds cost the same, and collapsing them would hide the only
 * ones that matter:
 *
 *   - `static-value`  — a real, eager, bundled dependency. **This is the debt.**
 *   - `static-type`   — erases at build time. No runtime edge, no bundle edge.
 *   - `dynamic`       — `await import(...)`: the module is only pulled when the
 *                       feature is used, which is already most of the way to
 *                       the target shape.
 *   - `typeof-import` — a type query. Erases like `static-type`.
 *
 * So the gate ratchets each kind separately, and a `dynamic` or type-only
 * import HARDENING into `static-value` fails even though the file was already
 * on the list — the case a per-file allowlist alone cannot see.
 *
 * ## Why this exists
 *
 * Arc 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Three consequences of the
 * current coupling, in rising order of cost: the library entry pulls the
 * semantic stack into every Node consumer; core's own test suite can never be
 * an engine-only test suite; and `parseCommandCore` runs the semantic analyzer
 * FIRST for 32 of 59 commands and then re-syncs the token stream by heuristic,
 * which is where six commands' worth of "semantic parser vs traditional"
 * special-casing in `commands/` comes from.
 *
 * ## The endpoint, and the rule it became (Arc 1 steps 2–3, 2026-09-03)
 *
 * The seam is `parser/semantic-integration.ts`'s `FrontEnd` contract and
 * `hyperscript.use(frontEnd)`. Once the API reached the front-end only through
 * that registration, every remaining row was on the FRONT-END SIDE of the
 * line — the bundles that exist to ship it, and `multilingual/`, the module
 * that IS it. So the allowlist stopped being the rule and became the record:
 * a front-end import anywhere else in `packages/core/src` now fails outright,
 * in any kind, allowlisted or not, and `--update` refuses to write such a row.
 * The per-kind ratchet still applies to the front-end-side rows (a `dynamic`
 * import hardening into `static-value` there still fails).
 *
 * Zero runtime deps — node built-ins only.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'packages', 'core', 'src');
const BASELINE = path.join(REPO_ROOT, 'packages', 'core', 'baselines', 'semantic-boundary.json');

/** The front-end packages core must eventually not depend on. */
const FRONT_END_PACKAGES = ['@lokascript/semantic', '@lokascript/intent', '@lokascript/i18n'];

/**
 * The front-end SIDE of the boundary: the only places in packages/core/src that
 * may import a front-end package, in any kind. Everything else is the engine.
 */
const FRONT_END_SIDE = [/^compatibility\/browser-bundle[^/]*\.ts$/, /^multilingual\//];

function isFrontEndSide(file) {
  return FRONT_END_SIDE.some(re => re.test(file));
}

function engineSideFailure(file, counts) {
  return (
    `packages/core/src/${file} imports the front-end from the ENGINE side of the ` +
    `boundary (${describe(counts)}). Since Arc 1 steps 2–3 (docs-internal/ENGINE_MIGRATION_PLAN.md) ` +
    `only compatibility/browser-bundle*.ts and multilingual/ may import @lokascript/semantic, ` +
    `/intent or /i18n — in ANY kind, allowlisted or not. The engine reaches a front-end ` +
    `through \`hyperscript.use(frontEnd)\` (parser/semantic-integration.ts's FrontEnd contract); ` +
    `put the code on the front-end side, or take the front-end by injection.`
  );
}

/** Import kinds, cheapest last — used for the "hardening" check. */
const KINDS = ['static-value', 'dynamic', 'static-type', 'typeof-import'];

const EXCLUDED =
  /(^|\/)__tests__\/|(^|\/)__test-utils__\/|(^|\/)test-helpers\/|\.test\.ts$|\.spec\.ts$|^test-[a-z-]+\.ts$|^test-utilities\.ts$/;

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

/**
 * Strip COMMENTS but keep string contents — the opposite of what
 * `check-type-escapes` needs, because here the string IS the datum (the import
 * specifier). Measured before this existed: comment-blind matching reported 13
 * static-value imports where there are 8, because five of them were example
 * `import` lines inside docblocks.
 */
function stripComments(text) {
  let out = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '/' && next === '/') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += quote;
      i++;
      while (i < n) {
        if (text[i] === '\\') {
          out += text[i] + (text[i + 1] ?? '');
          i += 2;
          continue;
        }
        if (text[i] === quote) break;
        out += text[i];
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

/** Every front-end import in one file's (comment-stripped) source. */
function frontEndImports(code, packages = FRONT_END_PACKAGES) {
  const found = [];
  for (const pkg of packages) {
    const p = pkg.replace(/\//g, '\\/');
    const suffix = String.raw`[^'"]*`;

    for (const m of code.matchAll(
      new RegExp(
        String.raw`\b(?:import|export)\s+(type\s+)?[^'";]*?from\s*['"](` + p + suffix + `)['"]`,
        'g'
      )
    )) {
      found.push({ spec: m[2], kind: m[1] ? 'static-type' : 'static-value' });
    }
    for (const m of code.matchAll(
      new RegExp(String.raw`typeof\s+import\(\s*['"](` + p + suffix + `)['"]`, 'g')
    )) {
      found.push({ spec: m[1], kind: 'typeof-import' });
    }
    for (const m of code.matchAll(
      new RegExp(String.raw`(?<!typeof\s)\bimport\s*\(\s*['"](` + p + suffix + `)['"]`, 'g')
    )) {
      found.push({ spec: m[1], kind: 'dynamic' });
    }
  }
  return found;
}

/** Recursively list non-test .ts files, relative to SRC_DIR. */
function collectFiles(dir = SRC_DIR, prefix = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...collectFiles(path.join(dir, entry.name), rel));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (EXCLUDED.test(rel)) continue;
    files.push(rel);
  }
  return files.sort();
}

/**
 * Measure the tree. Returns `{ files: { rel: { kind: count } }, totals }`.
 */
function analyze(
  files = collectFiles(),
  readFile = rel => fs.readFileSync(path.join(SRC_DIR, rel), 'utf8')
) {
  const byFile = {};
  const totals = Object.fromEntries(KINDS.map(k => [k, 0]));

  for (const rel of files) {
    const imports = frontEndImports(stripComments(readFile(rel)));
    if (imports.length === 0) continue;
    const counts = {};
    for (const { kind } of imports) {
      counts[kind] = (counts[kind] ?? 0) + 1;
      totals[kind]++;
    }
    byFile[rel] = counts;
  }

  return { files: byFile, totals };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

function check(analysis, baseline) {
  const failures = [];
  const wins = [];
  const allowed = baseline.files || {};

  for (const [file, counts] of Object.entries(analysis.files)) {
    // The hard rule first: an engine-side file fails whether or not a row
    // exists for it. A row is a record of a front-end-side file, never a
    // licence for an engine-side one.
    if (!isFrontEndSide(file)) {
      failures.push(engineSideFailure(file, counts));
      continue;
    }
    const row = allowed[file];
    if (!row) {
      failures.push(
        `NEW front-end import in packages/core/src/${file} ` +
          `(${describe(counts)}). The file is on the front-end side, so this may be right — ` +
          `run \`npm run check:semantic-boundary:update\` and give the row a real reason.`
      );
      continue;
    }
    for (const kind of KINDS) {
      const now = counts[kind] ?? 0;
      const before = row[kind] ?? 0;
      if (now > before) {
        failures.push(
          `packages/core/src/${file}: ${kind} front-end imports rose ${before} -> ${now}. ` +
            (kind === 'static-value'
              ? `A static VALUE import is an eager, bundled dependency — the exact debt this ` +
                `gate ratchets. A dynamic or type-only import in the same file does not count ` +
                `the same, which is why the kinds are tracked separately.`
              : `Even a cheap import kind only ratchets down here.`)
        );
      } else if (now < before) {
        wins.push(`${file} ${kind}: ${before} -> ${now}`);
      }
    }
  }

  for (const file of Object.keys(allowed).sort()) {
    if (!analysis.files[file]) {
      wins.push(`${file}: all front-end imports gone`);
      failures.push(
        `STALE allowlist row: packages/core/src/${file} no longer imports the front-end. ` +
          `Delete its row from packages/core/baselines/semantic-boundary.json — the list ` +
          `can only ratchet down, and a row nobody prunes is how a fixed problem keeps ` +
          `looking unfixed.`
      );
    }
  }

  return { failures, improvements: wins };
}

function describe(counts) {
  return KINDS.filter(k => counts[k])
    .map(k => `${counts[k]} ${k}`)
    .join(', ');
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch (err) {
    throw new Error(
      `check-semantic-boundary: cannot read ${path.relative(REPO_ROOT, BASELINE)}: ${err.message}\n` +
        `Generate it with: npm run check:semantic-boundary:update`
    );
  }
}

function writeBaseline(analysis, previous = {}) {
  // `--update` cannot launder an engine-side import into the allowlist.
  const engineSide = Object.keys(analysis.files).filter(f => !isFrontEndSide(f));
  if (engineSide.length) {
    throw new Error(
      `check-semantic-boundary: refusing to write a baseline with engine-side rows:\n` +
        engineSide.map(f => `  • ${engineSideFailure(f, analysis.files[f])}`).join('\n')
    );
  }
  const files = {};
  for (const file of Object.keys(analysis.files).sort()) {
    files[file] = {
      ...analysis.files[file],
      reason:
        previous[file]?.reason ||
        'TODO: why this file needs the front-end, and which arc removes it',
    };
  }

  const payload = {
    $comment:
      'Engine/front-end boundary allowlist for docs-internal/ENGINE_MIGRATION_PLAN.md Arc 1. ' +
      'Each row is a packages/core/src file importing @lokascript/semantic, /intent or /i18n, ' +
      'counted per import KIND — static-value is the real debt, static-type and typeof-import ' +
      'erase at build time, dynamic defers. The list ratchets DOWN only: a new file, a risen ' +
      'count in any kind, and a stale row all fail scripts/check-semantic-boundary.cjs. ' +
      'Since Arc 1 steps 2-3 every row is on the FRONT-END SIDE (compatibility/browser-bundle*.ts ' +
      'and multilingual/); a front-end import anywhere else fails outright and cannot be added here.',
    generated: new Date().toISOString().slice(0, 10),
    totals: analysis.totals,
    files,
  };

  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function main() {
  const update = process.argv.includes('--update');
  const analysis = analyze();

  if (update) {
    let previous = {};
    try {
      previous = loadBaseline().files || {};
    } catch {
      /* first run */
    }
    let payload;
    try {
      payload = writeBaseline(analysis, previous);
    } catch (err) {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    process.stdout.write(
      `check-semantic-boundary: baseline written — ${Object.keys(payload.files).length} files ` +
        `(${describe(payload.totals)})\n`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const { failures, improvements } = check(analysis, baseline);

  if (failures.length === 0) {
    let line =
      `check-semantic-boundary: OK (${Object.keys(analysis.files).length} files, ` +
      `${describe(analysis.totals)})`;
    for (const w of improvements) {
      line += `\n  ${w} — run \`npm run check:semantic-boundary:update\` to bank it.`;
    }
    process.stdout.write(`${line}\n`);
    process.exit(0);
  }

  process.stderr.write('check-semantic-boundary: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  FRONT_END_SIDE,
  isFrontEndSide,
  writeBaseline,
  stripComments,
  frontEndImports,
  collectFiles,
  analyze,
  check,
  FRONT_END_PACKAGES,
  KINDS,
};
