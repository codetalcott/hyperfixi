#!/usr/bin/env node
/**
 * check-layering — import-direction ratchet for the engine
 *
 * Assigns every top-level unit of `packages/core/src` a layer, then fails when
 * a module imports UPWARD (a lower layer reaching into a higher one). Today's
 * upward edges are recorded in `packages/core/baselines/layering.json` as an
 * allowlist with a reason each; the gate gets stricter in three directions:
 *
 *   (a) a NEW upward edge fails
 *   (b) an allowlisted edge whose import count ROSE fails
 *   (c) an allowlisted edge that no longer exists fails — a stale row must be
 *       pruned by the PR that earned it, so the list can only ratchet down
 *
 * A count that FALLS is reported, not failed: partial progress should never
 * block, but it should be visible so the row gets pruned when it hits zero.
 *
 * ## Why this exists
 *
 * Arc 0 of `docs-internal/ENGINE_MIGRATION_PLAN.md`, whose finding #7 is that
 * the engine's layering is circular: `parser/runtime.ts` imports
 * `commands/helpers`, `parser-constants` imports `commands/manifest`, and
 * `types/` reaches up into `validation/`, `commands/` and `behaviors/`. Arcs
 * 1-4 unwind that. The target spine, from the plan's Target design:
 *
 *     types/utils/lib/debug  →  core/ast  →  parser  →  commands, expressions
 *       →  runtime  →  (services)  →  api  →  compatibility  →  index
 *
 * Read left-to-right as "may be imported by": everything may import `types`;
 * nothing may import `compatibility` except `index`. `expressions` sits BESIDE
 * `commands` (same layer) deliberately — the plan puts them side by side, and
 * same-layer imports are allowed.
 *
 * ## Why root files are layered individually
 *
 * `src/` root holds both the entry point (`index.ts`, which legitimately
 * imports everything) and leaves (`version.ts`, `metadata.ts`, `tokenizer.ts`).
 * Lumping them into one `.` unit made `compatibility -> .` an eleven-import
 * "violation" that was really `compatibility -> version`. Root modules are
 * therefore layered by name, as `root:<basename>`.
 *
 * Zero runtime deps — node built-ins only, so it stays cheap enough for both
 * the pre-commit hook and the CI lint-typecheck step.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'packages', 'core', 'src');
const BASELINE = path.join(REPO_ROOT, 'packages', 'core', 'baselines', 'layering.json');

/**
 * Unit → layer. Lower may not import higher.
 *
 * Every unit must appear here: an unclassified one is a hard failure, so a new
 * top-level directory forces a deliberate placement rather than silently
 * joining the graph unconstrained.
 */
const LAYERS = new Map(
  Object.entries({
    // 0 — foundation. Everything may import these; they may import nothing.
    types: 0,
    utils: 0,
    lib: 0,
    debug: 0,
    i18n: 0,
    'root:version': 0,
    'root:metadata': 0,
    'root:lsp-metadata': 0,
    'root:tokenizer': 0,
    'root:types': 0,

    // 1 — the AST and the context/event primitives it sits on. `ast` does not
    // exist yet; Arc 2 creates it, and it is pre-placed so the arc cannot
    // accidentally introduce it above the parser.
    ast: 1,
    core: 1,

    // 2 — the parser. Depends on the AST; must not know about commands.
    parser: 2,

    // 3 — commands and expressions, side by side.
    commands: 3,
    expressions: 3,

    // 4 — the runtime that executes them.
    runtime: 4,

    // 5 — services and satellites built on the runtime.
    registry: 5,
    dom: 5,
    behaviors: 5,
    validation: 5,
    performance: 5,
    htmx: 5,
    lse: 5,
    multilingual: 5,
    'ast-utils': 5,
    reference: 5,
    'bundle-generator': 5,
    features: 5,
    context: 5,
    experimental: 5,

    // 6-8 — the public API, the shipped bundles, and the library entry.
    api: 6,
    compatibility: 7,
    'root:index': 8,
  })
);

const EXCLUDED =
  /(^|\/)__tests__\/|(^|\/)__test-utils__\/|(^|\/)test-helpers\/|\.test\.ts$|\.spec\.ts$|^test-[a-z-]+\.ts$|^test-utilities\.ts$/;

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

/**
 * The unit a path belongs to: its first path segment, or `root:<basename>` for
 * a file directly under `src/`.
 *
 * `isDir` decides the ambiguous case: an import of `../behaviors` normalizes to
 * the bare path `behaviors`, which is the DIRECTORY (its index.ts), not a root
 * file of that name.
 */
function unitOf(relPath, isDir = p => directoryExists(path.join(SRC_DIR, p))) {
  if (relPath.includes('/')) return relPath.split('/')[0];
  if (isDir(relPath)) return relPath;
  return `root:${relPath.replace(/\.d\.ts$|\.ts$/, '')}`;
}

/** True only for an existing DIRECTORY — `existsSync` is also true for files. */
function directoryExists(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Recursively list the non-test .ts files, relative to SRC_DIR. */
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
 * Every relative import in a source file, as `{ spec, typeOnly }`.
 * Bare-specifier imports (`@lokascript/semantic`) are cross-PACKAGE and belong
 * to Arc 1's gate, not this one.
 *
 * The `typeOnly` split is load-bearing, not decoration. Ten of the fourteen
 * upward edges here are `export type { … } from '../commands/…'` in a barrel —
 * compile-time coupling that erases at build time and creates no runtime cycle
 * and no bundle edge. A VALUE edge (`parser/runtime.ts` importing
 * `commands/helpers`) is a different and worse thing. Collapsing the two would
 * make the biggest number in the allowlist the least interesting one.
 *
 * A mixed clause (`export { A, type B } from …`) counts as a value import,
 * conservatively: one runtime binding is enough to make the edge real.
 */
function relativeImports(text) {
  const found = [];

  // `import [type] … from '…'` / `export [type] … from '…'`. The middle is
  // constrained to exclude quotes and semicolons so it cannot run across
  // statements.
  for (const m of text.matchAll(/\b(?:import|export)\s+(type\s+)?[^'";]*?from\s*['"](\.[^'"]+)['"]/g)) {
    found.push({ spec: m[2], typeOnly: Boolean(m[1]) });
  }

  // Dynamic `import('…')` and side-effect `import '…'` — always value.
  for (const m of text.matchAll(/\bimport\s*\(\s*['"](\.[^'"]+)['"]/g)) {
    found.push({ spec: m[1], typeOnly: false });
  }
  for (const m of text.matchAll(/(?:^|\n)\s*import\s+['"](\.[^'"]+)['"]/g)) {
    found.push({ spec: m[1], typeOnly: false });
  }

  return found;
}

/**
 * Build the upward-edge map: `"from -> to"` → import count. Also returns the
 * conforming count (for the OK line) and any unclassified units.
 */
function analyze(files = collectFiles(), readFile = rel => fs.readFileSync(path.join(SRC_DIR, rel), 'utf8')) {
  const upward = new Map();
  const unclassified = new Set();
  let conforming = 0;

  for (const rel of files) {
    const from = unitOf(rel);
    for (const { spec, typeOnly } of relativeImports(readFile(rel))) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      const to = unitOf(target);
      if (to === from) continue;

      if (!LAYERS.has(from)) {
        unclassified.add(from);
        continue;
      }
      if (!LAYERS.has(to)) {
        unclassified.add(to);
        continue;
      }

      if (LAYERS.get(to) > LAYERS.get(from)) {
        const key = `${from} -> ${to}`;
        const acc = upward.get(key) || { count: 0, value: 0, typeOnly: 0 };
        acc.count++;
        if (typeOnly) acc.typeOnly++;
        else acc.value++;
        upward.set(key, acc);
      } else {
        conforming++;
      }
    }
  }

  return { upward, conforming, unclassified };
}

// ---------------------------------------------------------------------------
// Checking
// ---------------------------------------------------------------------------

/**
 * Compare an analysis against the allowlist. Returns { failures, improvements }.
 */
function check(analysis, baseline) {
  const failures = [];
  const wins = [];
  const allowed = baseline.upwardEdges || {};

  for (const unit of [...analysis.unclassified].sort()) {
    failures.push(
      `\`${unit}\` has no layer. Every top-level unit of packages/core/src must be ` +
        `placed in LAYERS in scripts/check-layering.cjs — a new directory that joins ` +
        `the graph unconstrained is how the layering became circular in the first ` +
        `place (ENGINE_MIGRATION_PLAN.md finding #7).`
    );
  }

  for (const [edge, counts] of [...analysis.upward].sort()) {
    const count = counts.count;
    const row = allowed[edge];
    if (!row) {
      const [from, to] = edge.split(' -> ');
      failures.push(
        `NEW upward import: ${edge} (${count}, ${counts.value} of them value imports). ` +
          `Layer ${LAYERS.get(from)} must not ` +
          `import layer ${LAYERS.get(to)}. Invert the dependency (inject it, or move the ` +
          `shared thing down a layer). If it is genuinely unavoidable, add a row to ` +
          `packages/core/baselines/layering.json WITH A REASON — but the list is meant ` +
          `to shrink, and every row is work Arcs 1-4 have to undo.`
      );
      continue;
    }
    if (count > row.count) {
      failures.push(
        `${edge} grew: ${count} imports, allowlisted at ${row.count} (+${count - row.count}). ` +
          `This edge is already known debt (${row.reason}); adding to it moves the ` +
          `migration backwards. Update the baseline only with a reason in the PR.`
      );
      continue;
    }
    if (count < row.count) {
      wins.push({ edge, before: row.count, after: count });
    } else if (counts.value > (row.valueImports ?? row.count)) {
      // Same total, but a type-only edge turned into a runtime one.
      failures.push(
        `${edge} hardened: ${counts.value} value imports, allowlisted at ` +
          `${row.valueImports ?? row.count}. A type-only upward edge erases at build ` +
          `time; a value one is a real runtime dependency. Keep it type-only, or ` +
          `record the change with a reason.`
      );
    }
  }

  for (const edge of Object.keys(allowed).sort()) {
    if (!analysis.upward.has(edge)) {
      failures.push(
        `STALE allowlist row: ${edge} no longer exists. Delete it from ` +
          `packages/core/baselines/layering.json — the list can only ratchet down, and ` +
          `a row nobody prunes is how a fixed problem keeps looking unfixed.`
      );
    }
  }

  return { failures, improvements: wins };
}

function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  } catch (err) {
    throw new Error(
      `check-layering: cannot read ${path.relative(REPO_ROOT, BASELINE)}: ${err.message}\n` +
        `Generate it with: npm run check:layering:update`
    );
  }
}

/**
 * Regenerate the allowlist, preserving the reason already recorded for an edge
 * that survives. A brand-new edge gets a placeholder the author must replace —
 * the gate does not enforce prose, but an unreasoned row is the thing this
 * whole file exists to prevent.
 */
function writeBaseline(analysis, previous = {}) {
  const upwardEdges = {};
  for (const edge of [...analysis.upward.keys()].sort()) {
    const counts = analysis.upward.get(edge);
    upwardEdges[edge] = {
      count: counts.count,
      valueImports: counts.value,
      typeOnlyImports: counts.typeOnly,
      reason: previous[edge]?.reason || 'TODO: why this edge exists, and which arc removes it',
    };
  }

  const payload = {
    $comment:
      'Upward-import allowlist for docs-internal/ENGINE_MIGRATION_PLAN.md Arc 0. ' +
      'Each row is a module importing a HIGHER layer than itself — known debt that ' +
      'Arcs 1-4 unwind. The list ratchets DOWN only: a new edge, a grown edge, and a ' +
      'stale row all fail scripts/check-layering.cjs. Regenerate with ' +
      '`npm run check:layering:update` and give every new row a real reason.',
    generated: new Date().toISOString().slice(0, 10),
    totalUpwardImports: [...analysis.upward.values()].reduce((n, c) => n + c.count, 0),
    totalValueImports: [...analysis.upward.values()].reduce((n, c) => n + c.value, 0),
    upwardEdges,
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
      previous = loadBaseline().upwardEdges || {};
    } catch {
      /* first run — no previous reasons to preserve */
    }
    if (analysis.unclassified.size > 0) {
      process.stderr.write(
        `check-layering: refusing to write a baseline while units are unclassified: ` +
          `${[...analysis.unclassified].sort().join(', ')}\n`
      );
      process.exit(1);
    }
    const payload = writeBaseline(analysis, previous);
    process.stdout.write(
      `check-layering: baseline written — ${Object.keys(payload.upwardEdges).length} upward ` +
        `edges, ${payload.totalUpwardImports} imports\n`
    );
    process.exit(0);
  }

  const baseline = loadBaseline();
  const { failures, improvements } = check(analysis, baseline);

  if (failures.length === 0) {
    let line =
      `check-layering: OK (${analysis.conforming} conforming imports, ` +
      `${analysis.upward.size} allowlisted upward edges)`;
    for (const w of improvements) {
      line += `\n  ${w.edge}: ${w.before} → ${w.after} — run \`npm run check:layering:update\` to bank it.`;
    }
    process.stdout.write(`${line}\n`);
    process.exit(0);
  }

  process.stderr.write('check-layering: FAIL\n\n');
  for (const msg of failures) {
    process.stderr.write(`  • ${msg}\n\n`);
  }
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { unitOf, directoryExists, collectFiles, relativeImports, analyze, check, writeBaseline, LAYERS };
