/**
 * The union describes what the parser ACTUALLY emits
 *
 * Arc 2 step 2 of `docs-internal/ENGINE_MIGRATION_PLAN.md`. `ast/nodes.ts`
 * replaces three descriptions of the AST that had drifted from the parser and
 * from each other — `parser/parser-types.ts`, the 21 local aliases in
 * `parser/runtime.ts`, and the stale per-kind set in `types/base-types.ts`.
 * Nothing checked any of the three against reality, which is exactly how
 * `parser-types.ts` came to declare `UnaryExpressionNode.argument` as the
 * operand field when every reachable emitter writes `operand`.
 *
 * A fourth prose description would rot the same way. This is the check that
 * makes the union a claim rather than a comment: it parses the whole engine
 * corpus and asserts that every kind emitted is a union member, and that every
 * FIELD emitted on that kind is declared on that member.
 *
 * ## Why the field list is derived from the source text
 *
 * TypeScript types are erased, so a runtime test cannot ask the compiler what
 * `LiteralNode` declares. Reading the interface bodies out of `nodes.ts` is the
 * only way to compare the two at test time, and it is the same technique
 * `ast-kind-liveness.test.ts` and `check-semantic-boundary.cjs` already use for
 * the same reason. Comments are stripped, because a comment explaining a field
 * quotes its name.
 *
 * ## What this deliberately does NOT assert
 *
 * That every union member is emitted. Nine members are reachable only outside
 * the corpus — the two LEGACY kinds kept for external `buildAST` callers, the
 * interchange `error` node, and the pratt/parser kinds no corpus source
 * exercises. `ast-kind-liveness.test.ts` is the gate for deadness; this one is
 * for accuracy.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hyperscript } from '../../api/hyperscript-api';
import { corpusSources } from '../../parser/__tests__/engine-corpus';

// ---------------------------------------------------------------------------
// What the union declares
// ---------------------------------------------------------------------------

const NODES_TS = readFileSync(join(__dirname, '..', 'nodes.ts'), 'utf8');

/** Strip block and line comments so a documented field name is not counted. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Map every `type: '<kind>'` discriminant in `nodes.ts` to the field names its
 * interface declares. Interfaces are flat and one-per-block, so a brace-depth
 * walk is enough — there are no nested object types with their own `type`.
 */
function declaredFields(): Map<string, Set<string>> {
  const source = stripComments(NODES_TS);
  const out = new Map<string, Set<string>>();
  const blocks = source.matchAll(/export interface (\w+)[^{]*\{([\s\S]*?)\n\}/g);
  for (const [, , body] of blocks) {
    const kindMatch = body.match(/readonly type:\s*'([^']+)'/);
    if (!kindMatch) continue;
    const fields = new Set<string>();
    for (const [, name] of body.matchAll(/readonly (\w+)\??:/g)) fields.add(name);
    // Inherited from BaseNode / ASTNode.
    for (const name of ['type', 'start', 'end', 'line', 'column', 'raw', 'diagnostics']) {
      fields.add(name);
    }
    out.set(kindMatch[1]!, fields);
  }
  return out;
}

// ---------------------------------------------------------------------------
// What the parser emits
// ---------------------------------------------------------------------------

/**
 * Constructs the engine corpus does NOT exercise, added by Arc 2 step 4.
 *
 * The corpus holds one `catch` and no `finally`, `of @attr`, `in <sel>`,
 * `from <sel>` or `on a or b`. So this file passed for a union that lacked
 * `errorSymbol`, `errorHandler`, `finallyHandler`, `attributeName`,
 * `watchTarget` and `args` — seven fields `parser.ts` builds and
 * `runtime-base.ts` destructures. "Every field the parser emits is declared"
 * is only as strong as the sources it sees; these are the ones that were
 * missing.
 */
const EXTRA_SOURCES: readonly string[] = [
  'on click log 1 catch e log e end',
  'on click log 1 finally log 2 end',
  'on click log 1 catch e log e finally log 2 end',
  'def f(a) return a catch e log e finally log 1 end',
  'on mutation of @data-x log 1',
  'on change from #inp log 1',
  'on input in #form log 1',
  'on click or keyup log 1',
  'on click(button, clientX) log button',
  'behavior Foo(a) on click log a end end',
];

/** Every (kind, field) pair the traditional parse of the corpus produces. */
function emittedFields(): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const scan = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(scan);
      return;
    }
    const node = value as Record<string, unknown>;
    const kind = node['type'];
    if (typeof kind === 'string') {
      const fields = out.get(kind) ?? new Set<string>();
      for (const key of Object.keys(node)) fields.add(key);
      out.set(kind, fields);
    }
    for (const child of Object.values(node)) scan(child);
  };
  for (const source of [...corpusSources(), ...EXTRA_SOURCES]) {
    const result = hyperscript.compileSync(source, { traditional: true } as never) as {
      ok: boolean;
      ast?: unknown;
    };
    if (result.ok && result.ast) scan(result.ast);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ast/nodes.ts conforms to the parser', () => {
  const declared = declaredFields();
  const emitted = emittedFields();

  it('both sides of the comparison are non-empty — otherwise this is vacuous', () => {
    // A regex that stopped matching, or a corpus walk that returned nothing,
    // would make every assertion below pass against any tree at all.
    expect(declared.size).toBeGreaterThanOrEqual(30);
    expect(emitted.size).toBeGreaterThanOrEqual(25);
    expect(declared.get('literal')).toContain('value');
  });

  it('every kind the parser emits is a union member', () => {
    const missing = [...emitted.keys()].filter(kind => !declared.has(kind));
    expect(
      missing.sort(),
      'emitted by the parser but absent from ast/nodes.ts — add the member, ' +
        'or the union is not a description of this parser'
    ).toEqual([]);
  });

  it('every field the parser emits is declared on its member', () => {
    const undeclared: string[] = [];
    for (const [kind, fields] of emitted) {
      const known = declared.get(kind);
      if (!known) continue; // reported by the test above
      for (const field of fields) {
        if (!known.has(field)) undeclared.push(`${kind}.${field}`);
      }
    }
    expect(
      undeclared.sort(),
      'emitted by the parser but not declared — this is the drift that let ' +
        '`UnaryExpressionNode` name the wrong operand field for as long as it did'
    ).toEqual([]);
  });

  it('the root union is not named `Node` — that is a DOM global', () => {
    // Measured while adopting the union in `pratt-parser.ts`: a file that uses
    // `Node` WITHOUT importing it silently resolves the DOM's global instead,
    // and the compiler reports "'type' does not exist in type 'Node'" rather
    // than a missing import. This is a library about the DOM —
    // `types/type-guards.ts` uses the real one (`value is Node`) — so the
    // shadowing is not hypothetical.
    expect(NODES_TS).not.toMatch(/^export type Node\b/m);
    expect(NODES_TS).toMatch(/^export type SyntaxNode = Expr \| Stmt;/m);
  });

  it('the required/optional split matches emission frequency for the fields that moved', () => {
    // The three corrections this file made against `parser-types.ts`, pinned so
    // a future edit cannot quietly restore the old shape.
    const unary = emitted.get('unaryExpression');
    expect(unary, 'the corpus must exercise unaryExpression').toBeDefined();
    // `operand` is what every reachable emitter writes; `argument` is the alias.
    expect(unary).toContain('operand');
    expect(declared.get('unaryExpression')).toContain('operand');

    // `literal.raw` is optional — synthesized literals carry no source text.
    expect(NODES_TS).toMatch(/readonly raw\?: string;/);

    // `selector` carries the query-reference pair.
    expect(declared.get('selector')).toContain('fromQuery');
  });

  it('the handler fields step 4 added are really emitted, with the runtime types the union now claims', () => {
    // `event`/`target` were `unknown` in the union; measured string on both
    // parse paths. `errorSymbol` etc. were absent. Pin the emission AND the
    // runtime type, so neither can quietly drift back.
    const typesSeen = new Map<string, Set<string>>();
    const note = (field: string, value: unknown): void => {
      const kind = Array.isArray(value)
        ? 'array'
        : value !== null && typeof value === 'object'
          ? `node:${(value as { type?: unknown }).type}`
          : typeof value;
      (typesSeen.get(field) ?? typesSeen.set(field, new Set()).get(field)!).add(kind);
    };
    const scan = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) return value.forEach(scan);
      const node = value as Record<string, unknown>;
      if (node['type'] === 'eventHandler' || node['type'] === 'def') {
        for (const f of [
          'event',
          'target',
          'errorSymbol',
          'errorHandler',
          'finallyHandler',
          'attributeName',
          'watchTarget',
          'args',
        ]) {
          if (f in node) note(f, node[f]);
        }
      }
      for (const child of Object.values(node)) scan(child);
    };
    for (const source of [...corpusSources(), ...EXTRA_SOURCES]) {
      const result = hyperscript.compileSync(source, { traditional: true } as never) as {
        ok: boolean;
        ast?: unknown;
      };
      if (result.ok) scan(result.ast);
    }
    expect([...typesSeen.get('event')!]).toEqual(['string']);
    expect([...typesSeen.get('target')!]).toEqual(['string']);
    expect([...typesSeen.get('errorSymbol')!]).toEqual(['string']);
    expect([...typesSeen.get('attributeName')!]).toEqual(['string']);
    expect([...typesSeen.get('errorHandler')!]).toEqual(['array']);
    expect([...typesSeen.get('finallyHandler')!]).toEqual(['array']);
    expect([...typesSeen.get('args')!]).toEqual(['array']);
    expect([...typesSeen.get('watchTarget')!]).toEqual(['node:selector']);
  });
});
