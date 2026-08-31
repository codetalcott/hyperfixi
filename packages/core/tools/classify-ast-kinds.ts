/**
 * classify-ast-kinds — every AST `type` literal, and who emits vs reads it
 *
 * Arc 2 step 1 of `docs-internal/ENGINE_MIGRATION_PLAN.md` ("classify the
 * strays"). Arc 0 pinned WHICH kinds each producer emits; this answers the
 * question Arc 2 actually needs: for each kind, is anything *reading* it?
 *
 * Four classes, and only the first two are work:
 *
 *   - **dead**     — emitted, never read. Reaches the runtime as
 *                    `Unknown AST node type: …`, so it is a latent bug, not
 *                    tidiness. Delete with the code that emits it.
 *   - **phantom**  — neither emitted nor read. A name that outlived its code,
 *                    usually surviving only in a plan or a comment.
 *   - **orphan-read** — read but never emitted in-core. Usually legitimate:
 *                    `@lokascript/semantic`'s buildAST is the third producer
 *                    and this file does not scan it.
 *   - **live**     — emitted and read.
 *
 * Text-based on purpose (zero deps, same as `scripts/check-*.cjs`): it reports
 * FILES so a human can judge a hit, because `type: 'object'` is an AST kind in
 * the hybrid parser and a JSON envelope tag in `features/sockets.ts`. Treat the
 * output as a worklist, not a verdict.
 *
 * Usage (from packages/core):
 *   npx tsx tools/classify-ast-kinds.ts            # classification table
 *   npx tsx tools/classify-ast-kinds.ts --kind=X   # every site for one kind
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;

const EXCLUDED =
  /(^|\/)__tests__\/|(^|\/)__test-utils__\/|(^|\/)browser-tests\/|\.test\.ts$|\.spec\.ts$|(^|\/)test-helpers\//;

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

/**
 * Strip COMMENTS, keep string contents — the same shape as
 * `scripts/check-semantic-boundary.cjs`'s stripper, and for the same reason it
 * exists there. Measured: without this, removing the dead `dollarExpression`
 * emitter still reported it as emitted, because the comment EXPLAINING the
 * removal quotes `type: 'dollarExpression'`. A comment-blind scan counts the
 * documentation as code.
 */
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
      const quote = ch;
      out += ch;
      i++;
      while (i < text.length) {
        if (text[i] === '\\') {
          out += text.slice(i, i + 2);
          i += 2;
          continue;
        }
        out += text[i];
        if (text[i] === quote) {
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

interface Sites {
  emit: Set<string>;
  read: Set<string>;
}

function scan(): Map<string, Sites> {
  const kinds = new Map<string, Sites>();
  const at = (k: string): Sites => {
    if (!kinds.has(k)) kinds.set(k, { emit: new Set(), read: new Set() });
    return kinds.get(k)!;
  };

  // Emission: `type: 'x'`. Reading: `case 'x'`, or ANY `=== 'x'` comparison.
  //
  // The bare `=== 'x'` form is deliberate. A first cut matched only
  // `.type === 'x'` and reported `functionCall` DEAD — it is read by
  // `trigger.ts` as `nodeType(firstArg) === 'functionCall'`, through a helper.
  // Scoping to the known kind universe below is what makes the loose pattern
  // safe: `=== 'literal'` in some unrelated string check would be noise
  // otherwise.
  const EMIT = /\btype:\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;
  const READ_CASE = /\bcase\s+['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;
  const READ_CMP = /===\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g;

  for (const file of sourceFiles(SRC)) {
    const text = stripComments(readFileSync(file, 'utf8'));
    const where = relative(SRC, file);
    for (const [re, bucket] of [
      [EMIT, 'emit'],
      [READ_CASE, 'read'],
      [READ_CMP, 'read'],
    ] as const) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (!KIND_UNIVERSE.has(m[1])) continue;
        at(m[1])[bucket].add(where);
      }
    }
  }
  return kinds;
}

type Klass = 'dead' | 'phantom' | 'orphan-read' | 'live';

function classify(s: Sites): Klass {
  if (s.emit.size > 0 && s.read.size === 0) return 'dead';
  if (s.emit.size === 0 && s.read.size === 0) return 'phantom';
  if (s.emit.size === 0) return 'orphan-read';
  return 'live';
}

/**
 * The kind UNIVERSE: Arc 0's two pinned producer vocabularies, plus the six
 * `buildAST` emits that neither in-core parser does, plus every name the plan
 * hypothesised about. Scoping to this is what keeps the report meaningful —
 * an unscoped scan classified `WHITESPACE`, `SELECT` and `top` as AST kinds.
 */
const KIND_UNIVERSE = new Set([
  // full parser (ast-vocabulary.test.ts)
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
  // hybrid parser
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
  // buildAST-only (semantic), per ast-vocabulary.test.ts's orientation note
  'contextReference',
  'propertyAccess',
  'timeExpression',
  'objectProperty',
  'error',
  // plan hypotheses
  'dollarExpression',
  'contextVariable',
  'idSelector',
  'expression',
  'Command',
  'keyword',
]);

/**
 * Kinds this text-based scan CANNOT see the reader of, verified by hand. They
 * are consumed structurally — the parent destructures `node.condition.variable`
 * rather than switching on the child's `type` — so no `case` or `===` pattern
 * can find them. Annotated rather than suppressed: a reader who sees them in
 * DEAD should not go delete them, which is the mistake this list prevents.
 */
const STRUCTURALLY_READ: Record<string, string> = {
  forCondition: 'destructured by the `for` executor (hybrid/parser-core.ts)',
  fetchConfig: 'destructured by the `fetch` executor (hybrid bundles)',
};

/** Kinds the plan (Arc 2 step 1) hypothesised about, so the report can score it. */
const PLAN_HYPOTHESES: Record<string, string> = {
  dollarExpression: 'plan: dead',
  contextVariable: 'plan: dead',
  idSelector: 'plan: dead',
  expression: 'plan: dead',
  CommandSequence: 'plan: alias-of sequence',
  Command: 'plan: alias-of command',
  functionCall: 'plan: alias-of callExpression',
  object: 'plan: producer-local',
  keyword: 'plan: producer-local',
};

function main(): void {
  const kinds = scan();
  const wanted = process.argv.find(a => a.startsWith('--kind='))?.split('=')[1];
  const out = (s: string) => process.stdout.write(s + '\n');

  if (wanted) {
    const s = kinds.get(wanted);
    if (!s) return out(`${wanted}: no sites at all (phantom)`);
    out(`${wanted} — ${classify(s)}`);
    out(`  emitted by (${s.emit.size}):`);
    [...s.emit].sort().forEach(f => out(`    ${f}`));
    out(`  read by (${s.read.size}):`);
    [...s.read].sort().forEach(f => out(`    ${f}`));
    return;
  }

  for (const k of KIND_UNIVERSE) {
    if (!kinds.has(k)) kinds.set(k, { emit: new Set(), read: new Set() });
  }
  const rows = [...kinds.entries()].map(([k, s]) => ({ k, s, c: classify(s) }));

  for (const klass of ['dead', 'phantom', 'orphan-read'] as const) {
    const group = rows.filter(r => r.c === klass).sort((a, b) => a.k.localeCompare(b.k));
    out('');
    out(`=== ${klass.toUpperCase()} (${group.length}) ===`);
    for (const { k, s } of group) {
      const note = STRUCTURALLY_READ[k]
        ? `   [NOT dead — ${STRUCTURALLY_READ[k]}]`
        : PLAN_HYPOTHESES[k]
          ? `   [${PLAN_HYPOTHESES[k]}]`
          : '';
      const site = klass === 'orphan-read' ? [...s.read][0] : [...s.emit][0];
      out(`  ${k.padEnd(24)} ${String(site ?? '').padEnd(46)}${note}`);
    }
  }

  out('');
  out('=== PLAN HYPOTHESES, SCORED ===');
  for (const [k, claim] of Object.entries(PLAN_HYPOTHESES)) {
    const s = kinds.get(k);
    const actual = s ? classify(s) : 'phantom';
    const detail = s ? `emit ${s.emit.size} / read ${s.read.size}` : 'no sites';
    out(`  ${k.padEnd(20)} ${claim.padEnd(30)} → ${actual.padEnd(12)} (${detail})`);
  }

  const live = rows.filter(r => r.c === 'live').length;
  out('');
  out(
    `live: ${live} · dead: ${rows.filter(r => r.c === 'dead').length} · orphan-read: ${rows.filter(r => r.c === 'orphan-read').length}`
  );
}

main();
