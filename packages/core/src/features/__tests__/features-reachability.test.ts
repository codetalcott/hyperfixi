/**
 * Every module in `features/` is reachable from somewhere
 *
 * Arc 6a of `docs-internal/ENGINE_MIGRATION_PLAN.md`. `features/init.ts` (26
 * type-escape hatches) and `features/predefined-behaviors/` (31, plus 101
 * tests) sat in the tree with **no export from `index.ts` and no importer
 * anywhere** — not even semver-visible, so nothing was stopping their removal
 * and nothing was announcing their presence either. They were found by
 * measuring the type-escape clusters for Arc 2, not by any gate.
 *
 * That is the defect this pins. A module nobody can reach is not neutral: it
 * carries hatches that inflate the ratchet Arc 2 uses as its progress meter, it
 * carries tests that make coverage look larger than the shipped surface, and
 * the next reader has to re-derive that it is dead — which is exactly the work
 * `dollarExpression` and the six deprecated feature families each cost once
 * already.
 *
 * ## Reachable means one of two things
 *
 * Either `packages/core/src/index.ts` re-exports it (public API, so removing it
 * is semver-visible), or some non-test module inside `src/` imports it. A
 * module reachable ONLY from its own tests is dead — that was precisely
 * `init.ts`'s situation, and its 31 tests made it look alive.
 *
 * Deliberately scoped to `features/`, where the failure happened. Widening it
 * to all of `src/` is a bigger measurement (entry points, bundle-only modules,
 * generated trees) and is not what this gate is for.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = join(__dirname, '..', '..');
const FEATURES = join(SRC, 'features');

const IS_TEST = /\.test\.ts$|\.spec\.ts$/;
const SKIP_DIRS = new Set([
  '__tests__',
  '__test-utils__',
  '__types__',
  'browser-tests',
  'node_modules',
]);

/** Every non-test `.ts` under `dir`, as absolute paths. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      out.push(...sourceFiles(full));
    } else if (entry.endsWith('.ts') && !IS_TEST.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * The import-specifier tail that would reach `file`.
 *
 * `features/on.ts` is imported as `'./on'`, `'../features/on'` or
 * `'@features/on'`; a directory's `index.ts` is imported by the directory name
 * alone. Matching the tail rather than a resolved path keeps this independent
 * of how deep the importer sits.
 */
function specifierTail(relativePath: string): string {
  return relativePath.replace(/\.ts$/, '').replace(/\/index$/, '');
}

describe('features/ modules are reachable', () => {
  const modules = sourceFiles(FEATURES).map(f => f.slice(FEATURES.length + 1));

  it('the scan finds the feature modules at all — otherwise this is vacuous', () => {
    // A directory walk that silently returned [] would make the assertion below
    // pass for every possible tree. Six families ship today.
    expect(modules.length).toBeGreaterThanOrEqual(6);
    expect(modules).toContain('def.ts');
  });

  it('every feature module is exported from index.ts or imported by a non-test module', () => {
    const indexSource = readFileSync(join(SRC, 'index.ts'), 'utf8');
    const outside = sourceFiles(SRC)
      .filter(f => !f.startsWith(FEATURES + '/'))
      .map(f => readFileSync(f, 'utf8'))
      .join('\n');
    const siblings = sourceFiles(FEATURES).map(f => ({
      name: basename(f),
      text: readFileSync(f, 'utf8'),
    }));

    const unreachable = modules.filter(mod => {
      const tail = specifierTail(mod).replace(/\//g, '\\/');
      const imported = new RegExp(`from ['"][^'"]*${tail}['"]`);
      if (imported.test(indexSource) || imported.test(outside)) return false;
      // A sibling inside features/ counts — but a file never reaches itself.
      return !siblings.some(s => s.name !== basename(mod) && imported.test(s.text));
    });

    expect(
      unreachable,
      'unreachable from index.ts and from every non-test module — dead scaffolding, ' +
        'the shape `init.ts` and `predefined-behaviors/` had before Arc 6a deleted them'
    ).toEqual([]);
  });
});
