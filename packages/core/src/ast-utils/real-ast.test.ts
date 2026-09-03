/**
 * ast-utils against the AST the parser ACTUALLY produces
 *
 * Arc 2 step 4 of `docs-internal/ENGINE_MIGRATION_PLAN.md` measured something
 * none of this package's other 348 tests can see: not one of them parses real
 * hyperscript. Every fixture is hand-built, and a dozen of them build kinds no
 * core parser emits — `conditional`, `program`, `returnStatement`,
 * `logicalExpression`, `function` (all phantoms in
 * `tools/classify-ast-kinds.ts`). So the suite could stay green while the
 * modules drifted arbitrarily far from the parser's real output.
 *
 * This file is the missing anchor. It compiles real sources through the real
 * API and asserts that the analyzer, query engine, generator and transformer
 * agree with each other about what they see. Assertions are cross-checks
 * between modules rather than pinned literals, so they hold as the parser's
 * output evolves and fail only when a module stops reading the real shape.
 */

import { describe, it, expect } from 'vitest';
import { hyperscript } from '../api/hyperscript-api';
import { analyzeMetrics, detectCodeSmells } from './analyzer.js';
import { queryAll } from './query.js';
import { generate } from './generator.js';
import { normalize, transform } from './transformer.js';
import { countNodeTypes, findNodes } from './visitor.js';
import type { ASTNode } from './types.js';

const SOURCES = [
  'on click toggle .active on #panel',
  'on click add .selected to me then remove .selected from .other',
  'on keyup[key=="Enter"] set :count to 1 then increment :count then log :count',
];

/** A block command. Parses fine; see the KNOWN GAP test for what the generator does with it. */
const BLOCK_SOURCE = 'on click if I match .open then remove .open else add .open end';

function realAst(source: string): ASTNode {
  const result = hyperscript.compileSync(source) as { ok: boolean; ast?: unknown };
  expect(result.ok, `parse failed: ${source}`).toBe(true);
  return result.ast as ASTNode;
}

describe('ast-utils reads the parser’s real output (Arc 2 step 4)', () => {
  it.each(SOURCES)('%s — the modules agree with each other', source => {
    const ast = realAst(source);

    const counts = countNodeTypes(ast);
    const commands = queryAll(ast, 'command');
    const found = findNodes(ast, n => n.type === 'command');

    // Three independent traversals must count the same commands — and there
    // must be some, or every assertion below is vacuous.
    expect(counts['command']).toBeGreaterThan(0);
    expect(commands).toHaveLength(counts['command']!);
    expect(found).toHaveLength(counts['command']!);

    // The analyzer must see the real `commands` list on the real handler.
    const metrics = analyzeMetrics(ast);
    expect(metrics.complexity.cyclomatic).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(metrics.smells)).toBe(true);
    expect(() => detectCodeSmells(ast)).not.toThrow();

    // The generator must render every command NAME the parser produced.
    const rendered = generate(ast);
    for (const cmd of found) {
      expect(rendered).toContain(String(cmd.name));
    }

    // A no-op transform and a normalize must keep the command count.
    const same = transform(ast, {});
    expect(countNodeTypes(same)['command']).toBe(counts['command']);
    const normalized = normalize(ast);
    expect(countNodeTypes(normalized)['command']).toBe(counts['command']);
  });

  /**
   * Found by this file on 2026-09-01, the day it was written — and first filed
   * WRONG, as "the generator never reads `body`". A probe of the real node
   * corrected it: the parsed `if` command has no `body` at all (its keys are
   * `type`, `name`, `args`, `isBlocking` and position). The condition and both
   * branches sit in `args`, the branches as `block` nodes, and the generator's
   * switch has no `block` arm — so each block falls to `generateFallback`,
   * which finds neither `value` nor `name`, and renders `''`. The two trailing
   * spaces in `on click \nif I match .open  ` are the two empty blocks.
   *
   * Pre-existing (the untyped generator had the same switch), behavioural, and
   * therefore NOT fixed in the types-only Arc 2 step 4 — filed in
   * `ENGINE_MIGRATION_PLAN.md`'s step 4 note. Pinned here so the fix flips a
   * test rather than a comment: when a `case 'block'` renders `commands`, the
   * `not.toContain` and `endsWith` lines below go red and this block becomes
   * the regression test.
   */
  it('KNOWN GAP — the generator drops a block command’s body', () => {
    const ast = realAst(BLOCK_SOURCE);
    const removes = findNodes(ast, n => n.type === 'command' && n.name === 'remove');
    expect(removes, 'the branch command IS in the AST').toHaveLength(1);

    const rendered = generate(ast);
    expect(rendered).toContain('if');
    expect(rendered).not.toContain('remove');
    expect(rendered.trim().endsWith('end')).toBe(false);
  });

  it('the phantom kinds the fixtures use never appear in a real parse', () => {
    // If one of these ever DOES appear, the modules’ arms for it stop being
    // dead and the fixtures stop being fictional — worth knowing either way.
    const seen = new Set<string>();
    for (const source of [...SOURCES, BLOCK_SOURCE]) {
      for (const kind of Object.keys(countNodeTypes(realAst(source)))) seen.add(kind);
    }
    for (const phantom of ['conditional', 'program', 'returnStatement', 'logicalExpression']) {
      expect(seen.has(phantom), `${phantom} appeared in a real parse`).toBe(false);
    }
  });
});
