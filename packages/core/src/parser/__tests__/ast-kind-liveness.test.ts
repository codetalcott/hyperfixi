/**
 * Every AST kind emitted in SOURCE is read by something
 *
 * Arc 2 step 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. Its sibling,
 * `ast-vocabulary.test.ts`, already asserts that every kind the corpus PRODUCES
 * has an evaluator arm. This closes the gap that let `dollarExpression` live:
 * a kind emitted by a branch **no corpus source reaches** is invisible to a
 * corpus-driven sweep, so nothing noticed that `parser.ts` emitted a node type
 * read nowhere in the monorepo.
 *
 * That is not tidiness. An unread kind does not fail at build time — it
 * surfaces at RUNTIME as `Unknown AST node type: …`, so an unreachable-today
 * branch is a trap armed for whoever makes it reachable.
 *
 * ## Why this scans text, and what that costs
 *
 * There is no type-level record of "kinds": producers write string literals
 * into an untyped `ASTNode`. So this reads the source, with two blind spots
 * that are ALLOWLISTED rather than papered over, because both were measured:
 *
 *  - a kind consumed by DESTRUCTURING (`node.condition.variable`) has no
 *    `case`/`===` site to find — `forCondition` and `fetchConfig`;
 *  - a kind emitted by a COMPUTED expression (a ternary) is not a `type: 'x'`
 *    literal — `idSelector`.
 *
 * Comments are stripped for the same reason `scripts/check-semantic-boundary.cjs`
 * strips them: the comment explaining a deletion quotes the literal it removed.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..', '..');

const EXCLUDED =
  /(^|\/)__tests__\/|(^|\/)__test-utils__\/|(^|\/)browser-tests\/|\.test\.ts$|\.spec\.ts$|(^|\/)test-helpers\//;

/**
 * Kinds with a reader this scan cannot see, each verified by hand. An entry
 * here is a claim that the kind IS read — not permission for it to be dead.
 */
const STRUCTURALLY_READ: Readonly<Record<string, string>> = {
  forCondition: 'destructured by the `for` executor, never switched on',
  fetchConfig: 'destructured by the `fetch` executor, never switched on',
};

/** The kinds this gate governs: the two in-core producer vocabularies. */
const GOVERNED = new Set([
  'CommandSequence',
  'Program',
  'arrayLiteral',
  'asExpression',
  'attributeAccess',
  'behavior',
  'betweenExpression',
  'binaryExpression',
  'block',
  'callExpression',
  'command',
  'def',
  'eventHandler',
  'functionCall',
  'identifier',
  'initBlock',
  'literal',
  'memberExpression',
  'objectLiteral',
  'possessiveExpression',
  'propertyOfExpression',
  'selector',
  'string',
  'templateLiteral',
  'unaryExpression',
  'array',
  'binary',
  'call',
  'event',
  'fetch',
  'fetchConfig',
  'for',
  'forCondition',
  'if',
  'member',
  'object',
  'positional',
  'possessive',
  'repeat',
  'sequence',
  'unary',
  'variable',
  'while',
  'dollarExpression',
]);

function stripComments(text: string): string {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    const ch = text[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      out += ch;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') {
          out += text.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += text[i];
        if (text[i] === ch) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
      continue;
    }
    if (!full.endsWith('.ts')) continue;
    if (EXCLUDED.test(relative(SRC, full))) continue;
    acc.push(full);
  }
  return acc;
}

function scanKinds(): { emitted: Map<string, string>; read: Set<string> } {
  const emitted = new Map<string, string>();
  const read = new Set<string>();

  const EMIT = /\btype:\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;
  const READ_CASE = /\bcase\s+['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;
  const READ_CMP = /===\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;

  for (const file of sourceFiles(SRC)) {
    const text = stripComments(readFileSync(file, 'utf8'));
    const where = relative(SRC, file);

    EMIT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EMIT.exec(text)) !== null) {
      if (GOVERNED.has(m[1]) && !emitted.has(m[1])) emitted.set(m[1], where);
    }
    for (const re of [READ_CASE, READ_CMP]) {
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) {
        if (GOVERNED.has(m[1])) read.add(m[1]);
      }
    }
  }
  return { emitted, read };
}

describe('AST kind liveness (ENGINE_MIGRATION_PLAN Arc 2 step 1)', () => {
  const { emitted, read } = scanKinds();

  it('the scan sees the producers at all — otherwise every assertion is vacuous', () => {
    // A broken path or over-eager exclusion would empty the scan, and an empty
    // "emitted but unread" set passes trivially.
    expect(emitted.size).toBeGreaterThan(20);
    expect(read.size).toBeGreaterThan(20);
    expect(emitted.has('command')).toBe(true);
  });

  it('emits no AST kind that nothing reads', () => {
    const orphans = [...emitted.keys()]
      .filter(kind => !read.has(kind) && !(kind in STRUCTURALLY_READ))
      .sort()
      .map(kind => `${kind} (emitted by ${emitted.get(kind)})`);

    // A new entry is a latent `Unknown AST node type` at runtime. Either give
    // the kind a reader, or delete the code that emits it — do not allowlist it
    // unless you have VERIFIED a reader this text scan cannot see, and said
    // where it is.
    expect(orphans).toEqual([]);
  });

  it('`dollarExpression` stays deleted', () => {
    // The kind this gate was written for: emitted by parser.ts, read nowhere in
    // the monorepo, and unreachable from any corpus source — so
    // ast-vocabulary.test.ts could not see it.
    expect(emitted.has('dollarExpression')).toBe(false);
  });

  it('every allowlisted kind is actually still emitted', () => {
    // A stale allowlist entry hides the fact that its kind is gone, which is
    // how an allowlist quietly becomes fiction.
    for (const kind of Object.keys(STRUCTURALLY_READ)) {
      expect(emitted.has(kind), `${kind} is allowlisted but no longer emitted`).toBe(true);
    }
  });
});
